const ScribbleContent = require("../Models/scribbleSchema");
const Character = require("../Models/characterSchema");
const { fail } = require("../utils/httpError");
const { generateSlug, excerptFrom, estimateReadMinutes, assertSafeLexicalUrls } = require("../utils/lexical");
const { requireId, clampString, asBoolean, assertSafeHttpUrl } = require("../utils/validate");
const { pagination } = require("../utils/pagination");

function publicScribbleCard(item) {
  const plain = item.toObject ? item.toObject() : { ...item };
  return {
    _id: plain._id,
    title: plain.title,
    slug: plain.slug,
    category: plain.category || "",
    coverImageUrl: plain.coverImageUrl || "",
    excerpt: plain.excerpt || excerptFrom(plain, 160),
    author: plain.author || "Athul Suresh",
    type: plain.type || "scribble",
    is_published: Boolean(plain.is_published),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    readMinutes: estimateReadMinutes(plain.content, plain.excerpt),
  };
}

function pickScribbleFields(body) {
  const title = clampString(body?.title, 180);
  return {
    title,
    slug: clampString(body?.slug, 180) || generateSlug(title),
    content: body?.content,
    character: body?.character || undefined,
    category: clampString(body?.category, 80),
    author: clampString(body?.author || "Athul Suresh", 80),
    coverImageUrl: assertSafeHttpUrl(clampString(body?.coverImageUrl, 2000), "Cover image"),
    excerpt: clampString(body?.excerpt, 500),
    is_published: asBoolean(body?.is_published, asBoolean(body?.published, false)),
    type: "scribble",
  };
}

exports.createScribble = async (req, res, next) => {
  try {
    const fields = pickScribbleFields(req.body);
    assertSafeLexicalUrls(fields.content);
    if (!fields.title || !fields.slug || !fields.content) {
      throw fail(400, "All required fields must be provided");
    }
    const newScribble = await ScribbleContent.create(fields);
    res.status(201).json({
      success: true,
      message: "Scribble created successfully",
      scribble: newScribble,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCharacter = async (req, res, next) => {
  try {
    const name = clampString(req.body?.name, 80);
    if (!name) throw fail(400, "Character name is required");
    const existing = await Character.findOne({ name });
    if (existing) throw fail(409, "Character with this name already exists");
    const newCharacter = await Character.create({
      name,
      description: clampString(req.body?.description, 1000),
      image_url: clampString(req.body?.image_url, 2000),
      type: ["fictional", "real", "personal"].includes(req.body?.type)
        ? req.body.type
        : "personal",
    });
    res.status(200).json({
      success: true,
      message: "Character created successfully",
      character: newCharacter,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCharacters = async (req, res, next) => {
  try {
    const characters = await Character.find()
      .select("name description image_url type")
      .sort({ name: 1 })
      .limit(200);
    res.status(200).json(characters);
  } catch (error) {
    next(error);
  }
};

exports.getScribbleContents = async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { is_published: true };
    const [rows, total] = await Promise.all([
      ScribbleContent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ScribbleContent.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true,
      message: "Scribble contents fetched successfully",
      data: rows.map(publicScribbleCard),
      page,
      limit,
      total,
    });
  } catch (error) {
    next(error);
  }
};

exports.adminListScribbles = async (req, res, next) => {
  try {
    const data = await ScribbleContent.find().sort({ createdAt: -1 }).limit(200).lean();
    res.status(200).json({
      success: true,
      message: "Scribble contents fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getScribbleContentById = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Scribble");
    const scribble = await ScribbleContent.findOne({ _id: id, is_published: true });
    if (!scribble) throw fail(404, "Not found");
    res.status(200).json({ success: true, data: scribble });
  } catch (error) {
    next(error);
  }
};

exports.adminGetScribbleById = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Scribble");
    const scribble = await ScribbleContent.findById(id);
    if (!scribble) throw fail(404, "Not found");
    res.status(200).json({ success: true, data: scribble });
  } catch (error) {
    next(error);
  }
};

exports.updateScribbleById = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Scribble");
    const fields = pickScribbleFields(req.body);
    assertSafeLexicalUrls(fields.content);
    if (!fields.title || !fields.slug || !fields.content) {
      throw fail(400, "Title, slug, and content are required");
    }
    const updatedScribble = await ScribbleContent.findByIdAndUpdate(id, fields, {
      new: true,
      runValidators: true,
    });
    if (!updatedScribble) throw fail(404, "Scribble not found");
    res.status(200).json({
      success: true,
      message: "Scribble updated successfully",
      data: updatedScribble,
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleScribblePublish = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Scribble");
    const { is_published } = req.body;
    if (typeof is_published !== "boolean") {
      throw fail(400, "is_published must be a boolean");
    }
    const updatedScribble = await ScribbleContent.findByIdAndUpdate(
      id,
      { is_published },
      { new: true }
    );
    if (!updatedScribble) throw fail(404, "Scribble not found");
    res.status(200).json({
      success: true,
      message: `Scribble has been ${is_published ? "published" : "unpublished"} successfully.`,
      data: updatedScribble,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteScribble = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Scribble");
    const deletedScribble = await ScribbleContent.findByIdAndDelete(id);
    if (!deletedScribble) throw fail(404, "Scribble not found");
    res.status(200).json({ success: true, message: "Scribble deleted successfully" });
  } catch (error) {
    next(error);
  }
};
