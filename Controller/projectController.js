const Project = require("../Models/projectSchema");
const TechStack = require("../Models/techStackSchema");
const { fail } = require("../utils/httpError");
const { clampString, requireId } = require("../utils/validate");
const { escapeRegex } = require("../utils/crypto");

exports.createProject = async (req, res, next) => {
  try {
    const title = clampString(req.body?.title, 160);
    const description = clampString(req.body?.description, 4000);
    const image = clampString(req.body?.image, 2000);
    if (!title || !description) throw fail(400, "Title and description are required.");

    const incoming = Array.isArray(req.body?.tech_stack) ? req.body.tech_stack : [];
    const techStackIds = [];

    for (const techName of incoming.slice(0, 20)) {
      const name = clampString(techName, 80);
      if (!name) continue;
      let tech = await TechStack.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      });
      if (!tech) {
        tech = await TechStack.create({ name });
      }
      techStackIds.push(tech._id);
    }

    const savedProject = await Project.create({
      title,
      description,
      tech_stack: techStackIds,
      image,
    });
    res.status(201).json(savedProject);
  } catch (error) {
    next(error);
  }
};

exports.getAllProjects = async (req, res, next) => {
  try {
    const projects = await Project.find()
      .populate({ path: "tech_stack", select: "name logo -_id" })
      .limit(100);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Project");
    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) throw fail(404, "Project not found");
    res.status(200).json({ success: true, message: "Project deleted." });
  } catch (error) {
    next(error);
  }
};
