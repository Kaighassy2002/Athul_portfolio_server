const mongoose = require("mongoose");
const { fail } = require("./httpError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function requireId(value, label = "Item") {
  if (!isId(value)) throw fail(404, `${label} not found.`);
  return String(value);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value, max = 80) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function clampString(value, max, fallback = "") {
  return String(value || fallback).trim().slice(0, max);
}

function asBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return "Password should be at least 8 characters.";
  }
  if (password.length > 128) {
    return "Password is too long.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password should include a letter and a number.";
  }
  return "";
}

function assertEmail(email) {
  if (!EMAIL_RE.test(email)) {
    throw fail(400, "Please use a valid email.");
  }
  return email;
}

function isSafeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  if (raw.startsWith("//")) return false;
  const lower = raw.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function assertSafeHttpUrl(value, label = "URL") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!isSafeHttpUrl(raw)) {
    throw fail(400, `${label} must be a public http(s) address.`);
  }
  return raw.slice(0, 2000);
}

module.exports = {
  EMAIL_RE,
  isId,
  requireId,
  normalizeEmail,
  normalizeName,
  clampString,
  asBoolean,
  validatePassword,
  assertEmail,
  isSafeHttpUrl,
  assertSafeHttpUrl,
};
