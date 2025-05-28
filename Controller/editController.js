const EditorContent = require('../Models/EditorContent');


exports.saveEditorContent = async (req, res) => {
  try {
    const { title, tags, coverImageUrl, content } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    
    const tagsArray = Array.isArray(tags) ? tags : [];

    const newContent = new EditorContent({
      title,
      tags: tagsArray,
      coverImageUrl: coverImageUrl || "",
      content,
    });

    await newContent.save();

    res.status(200).json({ message: "Content saved successfully", data: newContent });
  } catch (error) {
    console.error("Error saving content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.getEditorContents = async (req, res) => {
  try {
    const contents = await EditorContent.find().sort({ createdAt: -1 }); // newest first

    res.status(200).json({ 
      message: 'Contents fetched successfully', 
      data: contents 
    });
  } catch (error) {
    console.error('Error fetching contents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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


exports.updateEditorContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, tags, coverImageUrl, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const updatedContent = await EditorContent.findByIdAndUpdate(
      id,
      {
        title,
        tags: Array.isArray(tags) ? tags : [],
        coverImageUrl: coverImageUrl || "",
        content,
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
