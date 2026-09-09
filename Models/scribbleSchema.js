const mongoose = require("mongoose");

const ScribbleContentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 180 },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    type: {
      type: String,
      default: "scribble",
      enum: ["scribble"],
      required: true,
    },
    character: { type: mongoose.Schema.Types.ObjectId, ref: "characterSchema" },
    category: { type: String, default: "", maxlength: 80 },
    author: { type: String, default: "Athul Suresh", maxlength: 80 },
    coverImageUrl: { type: String, default: "", maxlength: 2000 },
    excerpt: { type: String, default: "", maxlength: 500 },
    is_published: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ScribbleContentSchema.index({ is_published: 1, createdAt: -1 });

module.exports = mongoose.model("ScribbleContent", ScribbleContentSchema);
