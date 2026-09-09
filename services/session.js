const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const RefreshToken = require("../Models/RefreshToken");
const { config, isAdminEmail } = require("../config/env");
const { randomToken, sha256 } = require("../utils/crypto");
const { signAccessToken, signRefreshToken, publicUser } = require("../middleware/auth");
const { setAuthCookies, clearAuthCookies, readRefreshToken } = require("../utils/cookies");

async function applyAdminRole(user) {
  if (isAdminEmail(user.email) && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }
  return user;
}

async function issueSession(res, user) {
  await applyAdminRole(user);
  const jti = randomToken(16);
  const refresh = signRefreshToken(user, jti);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(jti),
    expiresAt: new Date(Date.now() + config.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
  });
  const access = signAccessToken(user);
  setAuthCookies(res, access, refresh);
  return {
    user: publicUser(user, { includeEmail: true }),
  };
}

async function rotateRefresh(req, res) {
  const token = readRefreshToken(req);
  if (!token) return null;
  const payload = jwt.verify(token, config.JWT_REFRESH_SECRET);
  if (payload.typ !== "refresh" || !payload.jti) return null;
  const record = await RefreshToken.findOne({
    tokenHash: sha256(payload.jti),
    revoked: false,
    expiresAt: { $gt: new Date() },
  });
  if (!record) return null;
  record.revoked = true;
  await record.save();
  const user = await User.findById(payload.sub);
  if (!user) return null;
  return issueSession(res, user);
}

async function revokeRefresh(req) {
  const token = readRefreshToken(req);
  if (!token) return;
  try {
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET);
    if (payload.jti) {
      await RefreshToken.updateMany(
        { tokenHash: sha256(payload.jti) },
        { revoked: true }
      );
    }
  } catch {
    /* already invalid */
  }
}

async function destroyUserSessions(userId) {
  await RefreshToken.updateMany({ userId }, { revoked: true });
}

function clearSession(res) {
  clearAuthCookies(res);
}

module.exports = {
  issueSession,
  rotateRefresh,
  revokeRefresh,
  destroyUserSessions,
  clearSession,
  applyAdminRole,
};
