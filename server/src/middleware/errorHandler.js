/**
 * Central error handler — every error becomes the same JSON shape:
 *   { success: false, message, errors? }
 * Must be registered AFTER all routes in server.js.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const payload = { success: false, message: err.message || 'Internal server error' };
  if (err.errors) payload.errors = err.errors; // express-validator details
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[error] ${req.method} ${req.path} ->`, err.message);
  }
  res.status(status).json(payload);
}

module.exports = errorHandler;
