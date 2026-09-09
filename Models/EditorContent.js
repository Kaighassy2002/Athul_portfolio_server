const mongoose = require("mongoose");

const EditorContentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, trim: true, maxlength: 180 },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  tags: { type: [String], default: [], validate: [(v) => v.length <= 20, "Too many tags"] },
  tech_stack: [{ type: mongoose.Schema.Types.ObjectId, ref: "TechStack" }],
  type: {
    type: String,
    default: "blog",
    enum: ["blog"],
    required: true,
  },
  coverImageUrl: { type: String, default: "", maxlength: 2000 },
  excerpt: { type: String, default: "", maxlength: 500 },
  author: {
    type: String,
    default: "Athul Suresh",
    maxlength: 80,
  },
  is_published: { type: Boolean, default: false, index: true },
  viewCount: { type: Number, default: 0, min: 0 },
  shareCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

EditorContentSchema.index({ is_published: 1, createdAt: -1 });

module.exports = mongoose.model("EditorContent", EditorContentSchema);
