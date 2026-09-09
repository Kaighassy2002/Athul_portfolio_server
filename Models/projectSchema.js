const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  tech_stack: [{ type: mongoose.Schema.Types.ObjectId, ref: "TechStack" }],
  type: {
    type: String,
    default: "project",
    enum: ["project"],
    required: true,
  },
  image: { type: String, default: "", maxlength: 2000 },
});

module.exports = mongoose.model("project", projectSchema);
