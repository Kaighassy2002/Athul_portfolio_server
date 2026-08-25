const EditorContent = require('../Models/EditorContent');
const Like = require('../Models/Like');
const Comment = require('../Models/Comment');

const TechStack = require('../Models/techStackSchema')
const { summarizeBlogs } = require('./engagementController')

const generateSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

exports.createBlogPost = async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      tags,
      tech_stack,
      coverImageUrl,
      excerpt,
      author,
      is_published
    } = req.body;

    const newBlog = new EditorContent({
      title,
      slug: slug || generateSlug(title),
      content,
      tags,
      tech_stack,
      coverImageUrl,
      excerpt,
      author,
      is_published: Boolean(is_published),
      type: "blog",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newBlog.save();
    res.status(200).json({ message: 'Blog post created successfully', blog: newBlog });

  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
};






// GET all blog posts
exports.getAllBlogPosts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.published === "true") {
      filter.is_published = true;
    }

    const blogs = await EditorContent.find(filter)
      .populate('tech_stack')
      .sort({ createdAt: -1 });

    res.status(200).json(await summarizeBlogs(blogs));
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};


exports.getEditorContentById = async (req, res) => {
  try {
    const blog = await EditorContent.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Not found" });

    res.status(200).json({ data: blog });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.updateBlogContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      content,
      tags,
      tech_stack,
      coverImageUrl,
      excerpt,
      is_published,
      published // 👈 Accept frontend field
    } = req.body;

    if (!title || !slug || !content) {
      return res.status(400).json({ error: "Title, slug, and content are required" });
    }

    const updatedContent = await EditorContent.findByIdAndUpdate(
      id,
      {
        title,
        slug,
        content,
        tags: Array.isArray(tags) ? tags : [],
        tech_stack: Array.isArray(tech_stack) ? tech_stack : [],
        coverImageUrl: coverImageUrl || "",
        excerpt: excerpt || "",
        is_published: typeof is_published === "boolean" 
          ? is_published 
          : typeof published === "boolean" 
            ? published 
            : false,
        updatedAt: new Date(),
        type: "blog"
      },
      { new: true }
    );

    if (!updatedContent) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.status(200).json({ message: "Content updated successfully", data: updatedContent });
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};






exports.addTechStack = async (req, res) => {
  try {
    const { name, type, description } = req.body;

    // ✅ Validate required fields
    if (!name || !type || !description) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // ✅ Handle file path if image uploaded
    const logoPath = req.file ? `/uploads/logos/${req.file.filename}` : '';

    const newTech = new TechStack({
      name,
      type,
      description,
      logo: logoPath,
    });

    await newTech.save();

    res.status(201).json({
      message: 'Tech stack item added successfully',
      data: newTech,
    });

  } catch (error) {
    console.error('❌ Error in addTechStack:', error);
    res.status(500).json({ message: 'Error saving tech stack item' });
  }
};


// exports.getTechStack = async (req, res) => {
//   try {
//     const characters = await TechStack.find().sort({ name: 1 }); 
//     res.status(200).json(characters);
//   } catch (error) {
//     console.error('Error fetching characters:', error);
//     res.status(500).json({ message: 'Server error', error });
//   }
// };

// 
exports.getTechStack = async (req, res) => {
  try {
    const tools = await TechStack.find(); 
    res.status(200).json(tools);
  } catch (error) {
    console.error("Error fetching tech stack:", error);
    res.status(500).json({ message: "Failed to retrieve tech stack" });
  }
};


// PATCH /publish-blog/:id
exports.toggleBlogPublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;

    // ✅ Validate input
    if (typeof is_published !== "boolean") {
      return res.status(400).json({ error: "is_published must be a boolean" });
    }

    // ✅ Update just the is_published field
    const updatedBlog = await EditorContent.findByIdAndUpdate(
      id,
      { is_published, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.status(200).json({
      message: `Blog has been ${is_published ? "published" : "unpublished"} successfully.`,
      data: updatedBlog
    });
  } catch (error) {
    console.error("Error toggling blog publish status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteBlogPost = async (req, res) => {
  try {
    const deletedBlog = await EditorContent.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    await Promise.all([
      Like.deleteMany({ postId: deletedBlog._id }),
      Comment.deleteMany({ postId: deletedBlog._id }),
    ]);
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




