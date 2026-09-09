function lexicalPlainText(content) {
  const parse = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  };

  const walk = (node) => {
    if (!node) return "";
    if (typeof node.text === "string") return node.text;
    if (Array.isArray(node.children)) return node.children.map(walk).join(" ");
    return "";
  };

  const parsed = parse(content);
  return walk(parsed?.root || parsed).replace(/\s+/g, " ").trim();
}

function estimateReadMinutes(content, excerpt = "") {
  const text = lexicalPlainText(content) || excerpt || "";
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!words) return 3;
  return Math.max(1, Math.round(words / 220));
}

function excerptFrom(item, max = 180) {
  if (item?.excerpt) return String(item.excerpt).slice(0, 400);
  const text = lexicalPlainText(item?.content);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function generateSlug(value) {
  return (
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

function parseLexical(content) {
  if (!content) return null;
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return content;
}

function assertSafeLexicalUrls(content) {
  const { isSafeHttpUrl } = require("./validate");
  const { fail } = require("./httpError");

  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.src === "string" && node.src.trim()) {
      if (!isSafeHttpUrl(node.src)) {
        throw fail(400, "Use public http(s) image URLs.");
      }
    }
    if (typeof node.url === "string" && node.url.trim()) {
      if (!isSafeHttpUrl(node.url)) {
        throw fail(400, "Use public http(s) links.");
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };

  const parsed = parseLexical(content);
  if (parsed) walk(parsed.root || parsed);
  return content;
}

module.exports = {
  lexicalPlainText,
  estimateReadMinutes,
  excerptFrom,
  generateSlug,
  assertSafeLexicalUrls,
};
