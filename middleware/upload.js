const path = require("path");
const multer = require("multer");
const { fail } = require("../utils/httpError");

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAGIC = [
  { mime: "image/jpeg", test: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff },
  { mime: "image/png", test: (buf) => buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a" },
  { mime: "image/gif", test: (buf) => buf.slice(0, 3).toString() === "GIF" },
  {
    mime: "image/webp",
    test: (buf) =>
      buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP",
  },
];

function sniffMime(buffer) {
  const found = MAGIC.find((entry) => entry.test(buffer));
  return found ? found.mime : "";
}

function fileFilter(_req, file, callback) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(mime)) {
    return callback(fail(400, "Only JPG, PNG, WEBP, or GIF images are allowed."));
  }
  if (String(file.originalname || "").includes("..") || String(file.originalname || "").includes("/")) {
    return callback(fail(400, "Invalid file name."));
  }
  callback(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1 },
});

function rejectUnsafeImage(req, res, next) {
  if (!req.file) return next();
  try {
    const buffer = req.file.buffer;
    if (!buffer || buffer.length < 12) {
      return res.status(400).json({
        success: false,
        message: "File content is not a valid image.",
      });
    }
    const mime = sniffMime(buffer);
    if (!mime || !ALLOWED_MIME.has(mime)) {
      return res.status(400).json({
        success: false,
        message: "File content is not a valid image.",
      });
    }
    req.file.detectedMime = mime;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  upload,
  rejectUnsafeImage,
  sniffMime,
  MAX_BYTES,
  ALLOWED_MIME,
  ALLOWED_EXT,
};
