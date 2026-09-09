process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-access-secret-value";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-value";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { escapeRegex } = require("../utils/crypto");
const { sniffMime, ALLOWED_MIME } = require("../middleware/upload");
const { isAllowedOrigin } = require("../config/env");
const { app } = require("../index");

test("escapeRegex blocks injection characters", () => {
  const escaped = escapeRegex("React.js+");
  assert.equal(escaped, "React\\.js\\+");
  assert.doesNotThrow(() => new RegExp(`^${escaped}$`, "i"));
});

test("sniffMime accepts jpeg and png magic bytes", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const png = Buffer.from("89504e470d0a1a0a0000", "hex");
  assert.equal(sniffMime(jpeg), "image/jpeg");
  assert.equal(sniffMime(png), "image/png");
  assert.equal(sniffMime(Buffer.from("not-an-image")), "");
  assert.ok(ALLOWED_MIME.has("image/jpeg"));
});

test("CORS allowlist rejects unknown origins", () => {
  assert.equal(isAllowedOrigin("https://www.athulsuresh.me"), true);
  assert.equal(isAllowedOrigin("https://evil.example"), false);
  assert.equal(isAllowedOrigin(""), false);
});

test("health endpoint is public", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.env, undefined);
});

test("sitemap is public xml", async () => {
  const res = await request(app).get("/sitemap.xml");
  assert.equal(res.status, 200);
  assert.match(String(res.headers["content-type"] || ""), /xml/);
  assert.match(res.text, /www.sitemaps.org/);
  assert.match(res.text, /\/atlas/);
  assert.doesNotMatch(res.text, /\/login/);
});

test("CMS writes are open and still validate payloads", async () => {
  const res = await request(app)
    .post("/blog/save")
    .set("Origin", "http://localhost:5173")
    .send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("invalid public ids 404 without leaking internals", async () => {
  const res = await request(app).get("/blog/not-a-valid-id");
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, undefined);
});

test("signup rejects invalid payloads before touching the database", async () => {
  const res = await request(app)
    .post("/auth/signup")
    .set("Origin", "http://localhost:5173")
    .send({ name: "A", email: "nope", password: "short" });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});
