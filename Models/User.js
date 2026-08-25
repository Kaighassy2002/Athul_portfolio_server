const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, default: "" },
    googleId: { type: String, default: "", index: true },
    avatar: { type: String, default: "" },
    provider: {
      type: String,
      enum: ["local", "google", "both"],
      default: "local",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
