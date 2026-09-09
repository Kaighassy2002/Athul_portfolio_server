const mongoose = require("mongoose");

const characterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80,
    },
    description: { type: String, default: "", maxlength: 1000 },
    image_url: { type: String, default: "", maxlength: 2000 },
    type: {
      type: String,
      enum: ["fictional", "real", "personal"],
      default: "personal",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("characterSchema", characterSchema);
