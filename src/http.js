// Small helpers so route handlers can be async and report friendly errors.

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Express 4 does not catch errors thrown inside async handlers; this forwards them to the error handler.
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, wrap };
