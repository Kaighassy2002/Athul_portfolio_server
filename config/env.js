const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function trim(value) {
  return String(value || "").trim();
}

function parseList(value) {
  return trim(value)
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function envValue(...keys) {
  for (const key of keys) {
    const value = trim(process.env[key]);
    if (value) return value;
  }
  return "";
}

const NODE_ENV = envValue("NODE_ENV") || "development";
const isProd = NODE_ENV === "production";
const isTest = NODE_ENV === "test";

const required = {
  CONNECTION_STRING: envValue("CONNECTION_STRING"),
  JWT_SECRET: envValue("JWT_SECRET"),
  JWT_REFRESH_SECRET: envValue("JWT_REFRESH_SECRET"),
};

if (!isTest) {
  if (isProd) {
    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (missing.length) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(", ")}`
      );
    }
  }

  if (!required.JWT_SECRET) {
    throw new Error("JWT_SECRET must be set.");
  }

  if (!required.CONNECTION_STRING) {
    throw new Error("CONNECTION_STRING must be set.");
  }
}

const CLIENT_URL = (
  envValue("CLIENT_URL") || "http://localhost:5173"
).replace(/\/$/, "");

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "https://athul-portfolio-seven.vercel.app",
  "https://www.athulsuresh.me",
  "https://athulsuresh.me",
  CLIENT_URL,
  ...parseList(process.env.ALLOWED_ORIGINS),
  ...parseList(process.env.EDITOR_URL),
]);

const ADMIN_EMAILS = new Set(
  parseList(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase())
);

const config = {
  NODE_ENV,
  isProd,
  isTest,
  PORT: Number(process.env.PORT || 3000),
  CONNECTION_STRING: required.CONNECTION_STRING,
  JWT_SECRET: required.JWT_SECRET || "test-access-secret",
  JWT_REFRESH_SECRET:
    required.JWT_REFRESH_SECRET ||
    (isProd ? "" : `${required.JWT_SECRET || "test-access-secret"}-refresh`),
  ACCESS_TTL: envValue("ACCESS_TTL") || "15m",
  REFRESH_TTL_DAYS: Number(process.env.REFRESH_TTL_DAYS || 7),
  BCRYPT_COST: Number(process.env.BCRYPT_COST || 12),
  CLIENT_URL,
  EDITOR_URL: (envValue("EDITOR_URL") || "http://localhost:5174").replace(
    /\/$/,
    ""
  ),
  allowedOrigins,
  ADMIN_EMAILS,
  GOOGLE_CLIENT_ID: envValue("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: envValue("GOOGLE_CLIENT_SECRET", "CLIENT_SECRET"),
  SMTP_HOST: envValue("SMTP_HOST"),
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: envValue("SMTP_USER"),
  SMTP_PASS: envValue("SMTP_PASS"),
  SMTP_FROM: envValue("SMTP_FROM"),
  CONTACT_TO: envValue("CONTACT_TO"),
  COOKIE_SAMESITE: (envValue("COOKIE_SAMESITE") || (isProd ? "none" : "lax")).toLowerCase(),
  CLOUDINARY_CLOUD_NAME: envValue("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: envValue("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: envValue("CLOUDINARY_API_SECRET"),
};

function isAdminEmail(email) {
  return ADMIN_EMAILS.has(String(email || "").trim().toLowerCase());
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return allowedOrigins.has(String(origin).trim().replace(/\/$/, ""));
}

module.exports = {
  config,
  isAdminEmail,
  isAllowedOrigin,
};
