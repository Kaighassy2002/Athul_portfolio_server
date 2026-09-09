const { HttpError } = require("../utils/httpError");
const { config } = require("../config/env");

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: "Not found",
  });
}

function errorHandler(err, _req, res, _next) {
  if (res.headersSent) return;

  const status = Number(err.status || err.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const isClient = safeStatus < 500;

  if (!isClient) {
    console.error("[error]", err?.message || err);
  }

  res.status(safeStatus).json({
    success: false,
    message: isClient && err.expose !== false
      ? err.message || "Request failed"
      : "Something went wrong",
    ...(isClient && err.code ? { code: err.code } : {}),
    ...(config.isProd || isClient ? {} : {}),
  });
}

module.exports = { notFound, errorHandler, HttpError };
