const { isDbReady } = require('../config/db');

/**
 * Shared DB guard: 503 when MongoDB is unreachable so the client gets a
 * clear message instead of a hang or a crash. (Same behaviour as the
 * inline dbGuard in authController — extracted for reuse in Phase 2+.)
 * @returns true if DB is ready, false after sending the 503 response
 */
function dbGuard(res) {
  if (!isDbReady()) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable — please try again in a moment',
    });
    return false;
  }
  return true;
}

module.exports = dbGuard;
