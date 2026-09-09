const mongoose = require("mongoose");

const techStackSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  type: { type: String, trim: true, maxlength: 80 },
  logo: { type: String, trim: true, maxlength: 2000 },
  description: { type: String, trim: true, maxlength: 500 },
});

module.exports = mongoose.model("TechStack", techStackSchema);
