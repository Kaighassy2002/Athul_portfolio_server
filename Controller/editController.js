const EditorContent = require("../Models/EditorContent");
const Like = require("../Models/Like");
const Comment = require("../Models/Comment");
const TechStack = require("../Models/techStackSchema");
const { summarizeBlogs } = require("./engagementController");
const { fail } = require("../utils/httpError");
const { generateSlug, excerptFrom, estimateReadMinutes, assertSafeLexicalUrls } = require("../utils/lexical");
const { requireId, clampString, asBoolean, normalizeName, assertSafeHttpUrl } = require("../utils/validate");
const { pagination } = require("../utils/pagination");
const { uploadLogo } = require("../services/cloudinary");

function publicBlogCard(blog) {
  const plain = blog.toObject ? blog.toObject() : { ...blog };
  return {
    _id: plain._id,
    title: plain.title,
    slug: plain.slug,
    tags: plain.tags || [],
    coverImageUrl: plain.coverImageUrl || "",
    excerpt: plain.excerpt || excerptFrom(plain, 180),
    author: plain.author || "Athul Suresh",
    type: plain.type || "blog",
    is_published: Boolean(plain.is_published),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    viewCount: plain.viewCount || 0,
    shareCount: plain.shareCount || 0,
    likeCount: plain.likeCount || 0,
    commentCount: plain.commentCount || 0,
    readMinutes: estimateReadMinutes(plain.content, plain.excerpt),
  };
}

function pickBlogFields(body) {
  const title = clampString(body?.title, 180);
  const slug = clampString(body?.slug, 180) || generateSlug(title);
  return {
    title,
    slug,
    content: body?.content,
    tags: Array.isArray(body?.tags)
      ? body.tags.map((tag) => clampString(tag, 40)).filter(Boolean).slice(0, 20)
      : [],
    tech_stack: Array.isArray(body?.tech_stack) ? body.tech_stack : [],
    coverImageUrl: assertSafeHttpUrl(clampString(body?.coverImageUrl, 2000), "Cover image"),
    excerpt: clampString(body?.excerpt, 500),
    author: normalizeName(body?.author || "Athul Suresh"),
    is_published: asBoolean(body?.is_published, asBoolean(body?.published, false)),
    type: "blog",
  };
}

exports.createBlogPost = async (req, res, next) => {
  try {
    const fields = pickBlogFields(req.body);
    assertSafeLexicalUrls(fields.content);
    if (!fields.title || !fields.content) {
      throw fail(400, "Title and content are required.");
    }
    const newBlog = await EditorContent.create(fields);
    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      blog: newBlog,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllBlogPosts = async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { is_published: true, type: "blog" };
    const [blogs, total] = await Promise.all([
      EditorContent.find(filter)
        .populate("tech_stack", "name logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EditorContent.countDocuments(filter),
    ]);
    const summarized = await summarizeBlogs(blogs, { includePending: false });
    res.status(200).json({
      success: true,
      data: summarized.map(publicBlogCard),
      page,
      limit,
      total,
    });
  } catch (error) {
    next(error);
  }
};

exports.adminListBlogs = async (req, res, next) => {
  try {
    const blogs = await EditorContent.find({ type: "blog" })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    let data = blogs;
    try {
      data = await summarizeBlogs(blogs, { includePending: true });
    } catch (error) {
      console.error("adminListBlogs summarize", error?.message || error);
    }
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEditorContentById = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Field note");
    const blog = await EditorContent.findOne({ _id: id, is_published: true, type: "blog" });
    if (!blog) throw fail(404, "Not found");
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

exports.adminGetBlogById = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Field note");
    const blog = await EditorContent.findById(id);
    if (!blog) throw fail(404, "Not found");
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

exports.updateBlogContentById = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Content");
    const fields = pickBlogFields(req.body);
    assertSafeLexicalUrls(fields.content);
    if (!fields.title || !fields.slug || !fields.content) {
      throw fail(400, "Title, slug, and content are required");
    }
    const updatedContent = await EditorContent.findByIdAndUpdate(id, fields, {
      new: true,
      runValidators: true,
    });
    if (!updatedContent) throw fail(404, "Content not found");
    res.status(200).json({
      success: true,
      message: "Content updated successfully",
      data: updatedContent,
    });
  } catch (error) {
    next(error);
  }
};

exports.addTechStack = async (req, res, next) => {
  try {
    const name = clampString(req.body?.name, 80);
    const type = clampString(req.body?.type, 80);
    const description = clampString(req.body?.description, 500);
    if (!name || !type || !description) throw fail(400, "All fields are required");
    const logo = req.file ? await uploadLogo(req.file.buffer) : "";
    const newTech = await TechStack.create({ name, type, description, logo });
    res.status(201).json({
      success: true,
      message: "Tech stack item added successfully",
      data: newTech,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTechStack = async (req, res, next) => {
  try {
    const tools = await TechStack.find().select("name type logo description").limit(200);
    res.status(200).json(tools);
  } catch (error) {
    next(error);
  }
};

exports.toggleBlogPublish = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Blog");
    const { is_published } = req.body;
    if (typeof is_published !== "boolean") {
      throw fail(400, "is_published must be a boolean");
    }
    const updatedBlog = await EditorContent.findByIdAndUpdate(
      id,
      { is_published },
      { new: true }
    );
    if (!updatedBlog) throw fail(404, "Blog not found");
    res.status(200).json({
      success: true,
      message: `Blog has been ${is_published ? "published" : "unpublished"} successfully.`,
      data: updatedBlog,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteBlogPost = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Blog");
    const deletedBlog = await EditorContent.findByIdAndDelete(id);
    if (!deletedBlog) throw fail(404, "Blog not found");
    await Promise.all([
      Like.deleteMany({ postId: deletedBlog._id }),
      Comment.deleteMany({ postId: deletedBlog._id }),
    ]);
    res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    next(error);
  }
};
