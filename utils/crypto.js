const crypto = require("crypto");

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function hashIp(value) {
  return sha256(`ip:${value || "unknown"}`);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { randomToken, sha256, hashIp, escapeRegex };
