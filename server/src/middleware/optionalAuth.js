const jwt = require('jsonwebtoken');

/**
 * Optional auth for guest-friendly endpoints (POST /api/symptoms/analyze).
 * - Valid Bearer token    -> req.user = { id }, req.isGuest = false
 * - Missing/invalid/expired token -> req.user stays undefined, req.isGuest = true
 *
 * Unlike `auth`, this NEVER 401s: guests are allowed through and the
 * controller decides what guests may do (triage without saving a record).
 * An expired/invalid token on a guest-capable route degrades to guest mode
 * instead of erroring — the analysis itself needs no account.
 */
function optionalAuth(req, res, next) {
  req.isGuest = true;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      req.isGuest = false;
    } catch {
      // invalid/expired token -> stay in guest mode, don't 401
    }
  }
  return next();
}

module.exports = optionalAuth;
