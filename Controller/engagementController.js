const mongoose = require("mongoose");
const EditorContent = require("../Models/EditorContent");
const Like = require("../Models/Like");
const Comment = require("../Models/Comment");

function isId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function publicCommenter(comment, user) {
  return {
    id: user ? String(user._id) : comment.userId ? String(comment.userId) : null,
    name: user?.name || comment.userName || "Reader",
    avatar: user?.avatar || comment.userAvatar || "",
  };
}

function isApproved(comment) {
  return comment.approved !== false;
}

function isMine(comment, currentUserId) {
  return Boolean(
    currentUserId &&
      String(comment.userId?._id || comment.userId) === String(currentUserId)
  );
}

function shapeComment(comment, currentUserId) {
  const user = comment.userId && comment.userId._id ? comment.userId : null;
  return {
    id: String(comment._id),
    body: comment.body,
    createdAt: comment.createdAt,
    parentId: comment.parentId ? String(comment.parentId) : null,
    approved: isApproved(comment),
    mine: isMine(comment, currentUserId),
    user: publicCommenter(comment, user),
    replies: [],
  };
}

function nestComments(rows, currentUserId) {
  const map = new Map();
  const roots = [];
  rows.forEach((row) => {
    map.set(String(row._id), shapeComment(row, currentUserId));
  });
  rows.forEach((row) => {
    const item = map.get(String(row._id));
    const parentKey = row.parentId ? String(row.parentId) : "";
    if (parentKey && map.has(parentKey)) {
      map.get(parentKey).replies.push(item);
    } else {
      roots.push(item);
    }
  });
  return roots;
}

async function assertPost(id) {
  if (!isId(id)) return null;
  const post = await EditorContent.findById(id).select("_id is_published type");
  if (!post || !post.is_published) return null;
  if (post.type && post.type !== "blog") return null;
  return post;
}

exports.getEngagement = async (req, res) => {
  try {
    const post = await assertPost(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Field note not found." });
    }

    const currentUserId = req.user?._id;
    const [likeCount, liked, comments, postDoc] = await Promise.all([
      Like.countDocuments({ postId: post._id }),
      currentUserId
        ? Like.exists({ postId: post._id, userId: currentUserId })
        : false,
      Comment.find({ postId: post._id })
        .populate("userId", "name avatar")
        .sort({ createdAt: 1 }),
      EditorContent.findById(post._id).select("viewCount shareCount"),
    ]);

    const visible = comments.filter(
      (comment) => isApproved(comment) || isMine(comment, currentUserId)
    );
    const approvedCount = comments.filter(isApproved).length;

    res.status(200).json({
      likeCount,
      liked: Boolean(liked),
      commentCount: approvedCount,
      viewCount: postDoc?.viewCount || 0,
      shareCount: postDoc?.shareCount || 0,
      comments: nestComments(visible, currentUserId),
    });
  } catch (error) {
    console.error("getEngagement", error);
    res.status(500).json({ message: "Could not load notes on this plate." });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await assertPost(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Field note not found." });
    }

    const filter = { postId: post._id, userId: req.user._id };
    const existing = await Like.findOne(filter);

    if (existing) {
      await existing.deleteOne();
    } else {
      try {
        await Like.create(filter);
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }

    const likeCount = await Like.countDocuments({ postId: post._id });
    res.status(200).json({
      liked: !existing,
      likeCount,
    });
  } catch (error) {
    console.error("toggleLike", error);
    res.status(500).json({ message: "Could not update the like." });
  }
};

exports.addComment = async (req, res) => {
  try {
    const post = await assertPost(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Field note not found." });
    }

    const body = String(req.body?.body || "").trim();
    if (body.length < 1) {
      return res.status(400).json({ message: "Write a note before sending." });
    }
    if (body.length > 2000) {
      return res.status(400).json({ message: "That note is a little too long." });
    }

    let parentId = req.body?.parentId || null;
    if (parentId) {
      if (!isId(parentId)) {
        return res.status(400).json({ message: "That thread could not be found." });
      }
      const parent = await Comment.findOne({ _id: parentId, postId: post._id });
      if (!parent) {
        return res.status(400).json({ message: "That thread could not be found." });
      }
      if (parent.parentId) parentId = parent.parentId;
    }

    const created = await Comment.create({
      postId: post._id,
      userId: req.user._id,
      parentId,
      body,
      userName: req.user.name,
      userAvatar: req.user.avatar || "",
      approved: false,
    });

    const populated = await created.populate("userId", "name avatar");
    res.status(201).json({
      comment: shapeComment(populated, req.user._id),
    });
  } catch (error) {
    console.error("addComment", error);
    res.status(500).json({ message: "Could not file that note." });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }
    if (String(comment.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only remove your own notes." });
    }

    await Comment.deleteMany({
      $or: [{ _id: comment._id }, { parentId: comment._id }],
    });

    res.status(200).json({ message: "Note removed.", id: String(comment._id) });
  } catch (error) {
    console.error("deleteComment", error);
    res.status(500).json({ message: "Could not remove that note." });
  }
};

async function incrementCounter(id, field) {
  const post = await assertPost(id);
  if (!post) return null;
  return EditorContent.findByIdAndUpdate(
    post._id,
    { $inc: { [field]: 1 } },
    { new: true, select: "viewCount shareCount" }
  );
}

exports.recordView = async (req, res) => {
  try {
    const post = await incrementCounter(req.params.id, "viewCount");
    if (!post) {
      return res.status(404).json({ message: "Field note not found." });
    }
    res.status(200).json({ viewCount: post.viewCount || 0 });
  } catch (error) {
    console.error("recordView", error);
    res.status(500).json({ message: "Could not record the view." });
  }
};

exports.recordShare = async (req, res) => {
  try {
    const post = await incrementCounter(req.params.id, "shareCount");
    if (!post) {
      return res.status(404).json({ message: "Field note not found." });
    }
    res.status(200).json({ shareCount: post.shareCount || 0 });
  } catch (error) {
    console.error("recordShare", error);
    res.status(500).json({ message: "Could not record the share." });
  }
};

exports.summarizeBlogs = async function summarizeBlogs(blogs) {
  const ids = blogs.map((blog) => blog._id).filter(Boolean);
  if (!ids.length) return [];

  const [likeRows, commentRows] = await Promise.all([
    Like.aggregate([
      { $match: { postId: { $in: ids } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    Comment.aggregate([
      { $match: { postId: { $in: ids } } },
      {
        $group: {
          _id: "$postId",
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$approved", false] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const likes = Object.fromEntries(likeRows.map((row) => [String(row._id), row.count]));
  const comments = Object.fromEntries(commentRows.map((row) => [String(row._id), row]));

  return blogs.map((blog) => {
    const plain = blog.toObject ? blog.toObject() : { ...blog };
    const key = String(plain._id);
    const comment = comments[key] || {};
    return {
      ...plain,
      viewCount: plain.viewCount || 0,
      shareCount: plain.shareCount || 0,
      likeCount: likes[key] || 0,
      commentCount: comment.count || 0,
      pendingCommentCount: comment.pending || 0,
    };
  });
};

function shapeAdminComment(comment) {
  const post = comment.postId && comment.postId._id ? comment.postId : null;
  const user = comment.userId && comment.userId._id ? comment.userId : null;
  return {
    id: String(comment._id),
    body: comment.body,
    createdAt: comment.createdAt,
    approved: isApproved(comment),
    parentId: comment.parentId ? String(comment.parentId) : null,
    post: {
      id: post ? String(post._id) : comment.postId ? String(comment.postId) : "",
      title: post?.title || "Untitled blog",
      is_published: Boolean(post?.is_published),
    },
    user: {
      id: user ? String(user._id) : "",
      name: user?.name || comment.userName || "Reader",
      email: user?.email || "",
      avatar: user?.avatar || comment.userAvatar || "",
    },
  };
}

exports.listComments = async (_req, res) => {
  try {
    const comments = await Comment.find()
      .populate("postId", "title slug is_published")
      .populate("userId", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      comments: comments.map(shapeAdminComment),
    });
  } catch (error) {
    console.error("listComments", error);
    res.status(500).json({ message: "Could not load comments." });
  }
};

exports.approveComment = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(404).json({ message: "Comment not found." });
    }
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    )
      .populate("postId", "title slug is_published")
      .populate("userId", "name email avatar");

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    res.status(200).json({
      message: "Comment approved.",
      comment: shapeAdminComment(comment),
    });
  } catch (error) {
    console.error("approveComment", error);
    res.status(500).json({ message: "Could not approve that comment." });
  }
};

exports.adminDeleteComment = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(404).json({ message: "Comment not found." });
    }
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }
    await Comment.deleteMany({
      $or: [{ _id: comment._id }, { parentId: comment._id }],
    });
    res.status(200).json({ message: "Comment deleted.", id: String(comment._id) });
  } catch (error) {
    console.error("adminDeleteComment", error);
    res.status(500).json({ message: "Could not delete that comment." });
  }
};
