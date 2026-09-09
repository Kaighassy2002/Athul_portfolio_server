const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validatePassword, normalizeEmail, EMAIL_RE, isSafeHttpUrl, assertSafeHttpUrl } = require("../utils/validate");
const { assertSafeLexicalUrls } = require("../utils/lexical");

test("password rules", () => {
  assert.equal(validatePassword("short"), "Password should be at least 8 characters.");
  assert.equal(validatePassword("a".repeat(129)), "Password is too long.");
  assert.equal(validatePassword("longenough"), "Password should include a letter and a number.");
  assert.equal(validatePassword("12345678"), "Password should include a letter and a number.");
  assert.equal(validatePassword("long-enough-password1"), "");
});

test("email normalization", () => {
  assert.equal(normalizeEmail("  Ada@Example.COM "), "ada@example.com");
  assert.equal(EMAIL_RE.test("ada@example.com"), true);
  assert.equal(EMAIL_RE.test("nope"), false);
});

test("isSafeHttpUrl allows http(s) and empty", () => {
  assert.equal(isSafeHttpUrl(""), true);
  assert.equal(isSafeHttpUrl("https://res.cloudinary.com/demo/image.png"), true);
  assert.equal(isSafeHttpUrl("http://example.com/a.jpg"), true);
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHttpUrl("data:image/png;base64,abc"), false);
  assert.equal(isSafeHttpUrl("//evil.example/x"), false);
  assert.equal(isSafeHttpUrl("/uploads/logos/a.png"), false);
});

test("assertSafeHttpUrl rejects unsafe covers", () => {
  assert.equal(assertSafeHttpUrl(""), "");
  assert.equal(
    assertSafeHttpUrl("https://cdn.example/cover.jpg", "Cover image"),
    "https://cdn.example/cover.jpg"
  );
  assert.throws(
    () => assertSafeHttpUrl("javascript:alert(1)", "Cover image"),
    (error) => error.status === 400
  );
});

test("assertSafeLexicalUrls rejects javascript image src", () => {
  assert.throws(
    () =>
      assertSafeLexicalUrls({
        root: {
          children: [{ type: "image", src: "javascript:alert(1)", children: [] }],
        },
      }),
    (error) => error.status === 400
  );
  assert.doesNotThrow(() =>
    assertSafeLexicalUrls({
      root: {
        children: [{ type: "image", src: "https://cdn.example/photo.jpg", children: [] }],
      },
    })
  );
});
