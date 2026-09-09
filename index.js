require("./config/env");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const router = require("./Routes/router");
const { connectDb } = require("./DB/connection");
const { config, isAllowedOrigin } = require("./config/env");
const { csrfMutating } = require("./middleware/auth");
const { apiLimiter } = require("./middleware/rateLimit");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, false);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "200kb" }));
app.use(csrfMutating);
app.use(apiLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

app.get("/sitemap.xml", require("./Controller/sitemapController").sitemap);

app.use(
  "/uploads/logos",
  express.static(path.join(__dirname, "uploads", "logos"), {
    fallthrough: false,
    index: false,
    maxAge: "7d",
  })
);

app.use(router);
app.use(notFound);
app.use(errorHandler);

let server;

async function start() {
  await connectDb();
  server = app.listen(config.PORT, () => {
    console.log(`portfolio server listening on ${config.PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`shutting down (${signal})`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  try {
    const { disconnectDb } = require("./DB/connection");
    await disconnectDb();
  } catch {
    /* ignore */
  }
  process.exit(0);
}

if (require.main === module) {
  start().catch((error) => {
    console.error("startup failed");
    process.exit(1);
  });
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = { app, start };
