const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  image: { type: String, required: true, maxlength: 2000 },
  category: { type: String, required: true, trim: true, maxlength: 120 },
  startDate: { type: String, required: true, maxlength: 40 },
  expireDate: { type: String, default: "", maxlength: 40 },
  organization: { type: String, required: true, trim: true, maxlength: 160 },
  links: { type: String, required: true, maxlength: 2000 },
});

module.exports = mongoose.model("certificate", certificateSchema);
