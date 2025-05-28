const mongoose = require('mongoose');

const EditorContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  tags: {
    type: [String], 
    default: [],
  },
  coverImageUrl: {
    type: String,
    default: "", 
  },
  content: {
    type: Object,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const EditorContent = mongoose.model('EditorContent', EditorContentSchema);

module.exports = EditorContent;
