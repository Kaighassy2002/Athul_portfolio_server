const mongoose = require("mongoose");
const EditorContent = require("../Models/EditorContent");
const ScribbleContent = require("../Models/scribbleSchema");
const { config } = require("../config/env");

const SITE = (
  config.isProd && /localhost|127\.0\.0\.1/.test(config.CLIENT_URL)
    ? "https://www.athulsuresh.me"
    : config.CLIENT_URL || "https://www.athulsuresh.me"
).replace(/\/$/, "");

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlTag(path, updatedAt) {
  const loc = `${SITE}${path}`;
  const lastmod = updatedAt
    ? new Date(updatedAt).toISOString().slice(0, 10)
    : "";
  return `<url><loc>${escapeXml(loc)}</loc>${
    lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
  }</url>`;
}

async function safeList(query) {
  try {
    return await query;
  } catch {
    return [];
  }
}

exports.sitemap = async (_req, res, next) => {
  try {
    const connected = mongoose.connection.readyState === 1;
    const [blogs, scribbles] = connected
      ? await Promise.all([
          safeList(
            EditorContent.find({ is_published: true, type: "blog" })
              .select("_id updatedAt")
              .sort({ updatedAt: -1 })
              .limit(200)
              .lean()
          ),
          safeList(
            ScribbleContent.find({ is_published: true })
              .select("_id updatedAt")
              .sort({ updatedAt: -1 })
              .limit(200)
              .lean()
          ),
        ])
      : [[], []];

    const urls = [
      urlTag("/"),
      urlTag("/atlas"),
      urlTag("/blog"),
      urlTag("/scribble"),
      urlTag("/contact"),
      ...blogs.map((blog) => urlTag(`/blog/${blog._id}`, blog.updatedAt)),
      ...scribbles.map((item) => urlTag(`/scribble/${item._id}`, item.updatedAt)),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
      "\n"
    )}\n</urlset>\n`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=600");
    res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
};
