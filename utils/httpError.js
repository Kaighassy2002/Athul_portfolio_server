class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || "";
    this.expose = status < 500;
  }
}

function fail(status, message, code) {
  return new HttpError(status, message, code);
}

function publicError(_err, fallback = "Something went wrong") {
  return {
    success: false,
    message: fallback,
  };
}

module.exports = { HttpError, fail, publicError };
