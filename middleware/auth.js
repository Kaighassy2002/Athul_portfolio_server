const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const { config, isAllowedOrigin } = require("../config/env");
const { fail } = require("../utils/httpError");
const { readAccessToken } = require("../utils/cookies");

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role || "user",
      typ: "access",
    },
    config.JWT_SECRET,
    { expiresIn: config.ACCESS_TTL }
  );
}

function signRefreshToken(user, jti) {
  return jwt.sign(
    {
      sub: String(user._id),
      jti,
      typ: "refresh",
    },
    config.JWT_REFRESH_SECRET,
    { expiresIn: `${config.REFRESH_TTL_DAYS}d` }
  );
}

function publicUser(user, { includeEmail = false } = {}) {
  const payload = {
    id: String(user._id),
    name: user.name,
    avatar: user.avatar || "",
    provider: user.provider,
    role: user.role || "user",
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
  };
  if (includeEmail) payload.email = user.email;
  return payload;
}

function isAdminUser(user) {
  return Boolean(user && user.role === "admin");
}

async function loadUserFromRequest(req) {
  const token = readAccessToken(req);
  if (!token) return null;
  const payload = jwt.verify(token, config.JWT_SECRET);
  if (payload.typ && payload.typ !== "access") return null;
  const user = await User.findById(payload.sub).select(
    "name email avatar provider role emailVerified googleId createdAt"
  );
  return user || null;
}

async function optionalAuth(req, _res, next) {
  try {
    req.user = await loadUserFromRequest(req);
  } catch {
    req.user = null;
  }
  next();
}

async function requireAuth(req, res, next) {
  try {
    const user = await loadUserFromRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Login required",
        code: "AUTH_REQUIRED",
      });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
      code: "AUTH_REQUIRED",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Login required",
      code: "AUTH_REQUIRED",
    });
  }
  if (!isAdminUser(req.user)) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      code: "ADMIN_REQUIRED",
    });
  }
  next();
}

function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Login required",
      code: "AUTH_REQUIRED",
    });
  }
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email first.",
      code: "EMAIL_UNVERIFIED",
    });
  }
  next();
}

function csrfMutating(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) {
    if (config.isProd) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  }
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  publicUser,
  isAdminUser,
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireVerified,
  csrfMutating,
  fail,
};
