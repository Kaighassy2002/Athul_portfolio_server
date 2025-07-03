const Project = require('../Models/projectSchema');
const TechStack = require('../Models/techStackSchema');

exports.createProject = async (req, res) => {
  try {
    const { title, description, tech_stack, image } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const techStackIds = [];

    for (const techName of tech_stack) {
      const existing = await TechStack.findOne({
        name: { $regex: new RegExp(`^${techName}$`, 'i') }
      });

      if (!existing) {
        return res.status(400).json({ error: `Tech stack "${techName}" not found.` });
      }

      techStackIds.push(existing._id);
    }

    const newProject = new Project({
      title,
      description,
      tech_stack: techStackIds,
      image
    });

    const savedProject = await newProject.save();
    res.status(200).json(savedProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};



exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate({
        path: 'tech_stack',
        select: 'name logo -_id' 
      });

    res.status(200).json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
