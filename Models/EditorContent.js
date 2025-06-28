const mongoose = require('mongoose');

const EditorContentSchema = new mongoose.Schema({
 title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: Object, required: true },
  tags: { type: [String], default: [] },
  tech_stack: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TechStack' }],
   type: {
    type: String,
    default: "blog",
    enum: ["blog"],
    required: true,
  },
  
  coverImageUrl: { type: String, default: "" },
  author: {
      type: String,
      default: 'Athul Suresh',
    },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  is_published: { type: Boolean, default: false },
});

const EditorContent = mongoose.model('EditorContent', EditorContentSchema);

module.exports = EditorContent;
