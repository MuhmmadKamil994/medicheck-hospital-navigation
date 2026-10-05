/**
 * requireAdmin — must run AFTER the `auth` middleware.
 * Allows only JWTs carrying role === 'superadmin' (issued by
 * POST /api/admin/login). Everything else gets 403.
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
}

module.exports = requireAdmin;
