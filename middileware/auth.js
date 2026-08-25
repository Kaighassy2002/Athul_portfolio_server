const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev-atlas-secret-change-me";

function bearerToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return "";
}

function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar || "",
    provider: user.provider,
    createdAt: user.createdAt,
  };
}

async function requireAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({
      message: "Login required",
      code: "AUTH_REQUIRED",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        message: "Login required",
        code: "AUTH_REQUIRED",
      });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "Session expired. Please login again.",
      code: "AUTH_REQUIRED",
    });
  }
}

async function optionalAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    /* visitors can still read */
  }
  next();
}

module.exports = {
  JWT_SECRET,
  signToken,
  publicUser,
  requireAuth,
  optionalAuth,
};
