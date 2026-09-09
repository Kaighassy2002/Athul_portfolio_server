const { v2: cloudinary } = require("cloudinary");
const { config } = require("../config/env");
const { fail } = require("../utils/httpError");

function cloudinaryConfigured() {
  return Boolean(
    config.CLOUDINARY_CLOUD_NAME &&
      config.CLOUDINARY_API_KEY &&
      config.CLOUDINARY_API_SECRET
  );
}

function ensureConfigured() {
  if (!cloudinaryConfigured()) {
    throw fail(503, "Image storage is not configured.");
  }
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadLogo(buffer) {
  ensureConfigured();
  if (!buffer || !buffer.length) {
    throw fail(400, "Image file is missing.");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "portfolio/logos",
        resource_type: "image",
        overwrite: false,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          return reject(fail(502, "Could not store the image."));
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = {
  cloudinaryConfigured,
  uploadLogo,
};
