const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EditorContent",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    userName: { type: String, default: "" },
    userAvatar: { type: String, default: "" },
    approved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", CommentSchema);
