
 const ScribbleContent = require('../Models/scribbleSchema')
 const Character = require('../Models/characterSchema');


// scribbile post

exports.createScribble = async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      character,     // should be a valid ObjectId
      category,
      author,        // optional
      is_published   // optional
    } = req.body;

    // Validation (basic)
    if (!title || !slug || !content || !category ) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const newScribble = new ScribbleContent({
      title,
      slug,
      content,
      character,     
      category,
      author,
      is_published
    });

    await newScribble.save();

    return res.status(200).json({
      message: 'Scribble created successfully',
      scribble: newScribble
    });

  } catch (error) {
    console.error('Error creating scribble:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

// characterpost
exports.createCharacter = async (req, res) => {
  try {
    const { name, description, image_url, type } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({ message: 'Character name is required' });
    }

    // Optional: check for duplicate name
    const existing = await Character.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'Character with this name already exists' });
    }

    const newCharacter = new Character({
      name: name.trim(),
      description,
      image_url,
      type
    });

    await newCharacter.save();

    res.status(200).json({
      message: 'Character created successfully',
      character: newCharacter
    });

  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// GET /characters
exports.getCharacters = async (req, res) => {
  try {
    const characters = await Character.find().sort({ name: 1 }); 
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


// get scribble 

exports.getScribbleContents = async (req, res) => {
  try {
    const scribbleContents = await ScribbleContent.find().sort({ createdAt: -1 }); // newest first
  console.log(scribbleContents.length);
  
    res.status(200).json({
      message: 'Scribble contents fetched successfully',
      data: scribbleContents
    });
  } catch (error) {
    console.error('Error fetching scribble contents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getScribbleContentById = async (req, res) => {
  try {
    const scriible = await ScribbleContent.findById(req.params.id);
    if (!scriible) return res.status(404).json({ error: "Not found" });

    res.status(200).json({ data: scriible });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// update scribble

exports.updateScribbleById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      content,
      character,
      category,
      is_published
    } = req.body;

    // Validate required fields
    if (!title || !slug || !content || !category) {
      return res.status(400).json({ error: "Title, slug, content, and category are required" });
    }

    const updatedScribble = await ScribbleContent.findByIdAndUpdate(
      id,
      {
        title,
        slug,
        content,
        character,
        category,
        is_published: typeof is_published === 'boolean' ? is_published : false,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedScribble) {
      return res.status(404).json({ error: "Scribble not found" });
    }

    res.status(200).json({
      message: "Scribble updated successfully",
      data: updatedScribble
    });
  } catch (error) {
    console.error("Error updating scribble:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
