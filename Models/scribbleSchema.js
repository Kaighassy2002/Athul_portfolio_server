const mongoose = require('mongoose');

const ScribbleContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: Object, required: true },
  type: {
    type: String,
    default: "scribble",
    enum: ["scribble"],
    required: true,
  },
  character: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
  category: { type: String}, 
  author: { type: String, default: 'Athul Suresh' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  is_published: { type: Boolean, default: false }
});

const ScribbleContent = mongoose.model('ScribbleContent', ScribbleContentSchema);
module.exports = ScribbleContent
