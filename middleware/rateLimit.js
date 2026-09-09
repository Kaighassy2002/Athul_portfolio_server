const rateLimit = require("express-rate-limit");

function limiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });
}

const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests. Please wait a moment.",
});

const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please wait a moment.",
});

const resetLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many reset requests. Please wait a moment.",
});

const contactLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many notes. Please wait before sending another.",
});

const engageLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Slow down a little.",
});

const viewShareLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Slow down a little.",
});

const commentLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: "Too many notes in a short time.",
});

const uploadLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many uploads.",
});

module.exports = {
  apiLimiter,
  authLimiter,
  resetLimiter,
  contactLimiter,
  engageLimiter,
  viewShareLimiter,
  commentLimiter,
  uploadLimiter,
};
