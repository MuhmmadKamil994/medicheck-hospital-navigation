const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const dbGuard = require('../utils/dbGuard');
const asyncHandler = require('../utils/asyncHandler');

const TOKEN_TTL = '24h'; // SDD Ch.5: tokens are short-lived (24-hour expiry)

// POST /api/admin/login
// Issues a JWT with a role claim ({id, role:'superadmin', kind:'admin'}) so
// the shared `auth` middleware accepts it and `requireAdmin` can gate
// admin-only routes. There is deliberately NO admin self-register route
// (SDD 1.5); admins are created via scripts/createAdmin.js.
const login = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  // Generic message on purpose: never reveal whether the email exists.
  const ok = admin && (await bcrypt.compare(password, admin.passwordHash));
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: admin._id, role: admin.role || 'superadmin', kind: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
  res.json({ success: true, token, admin: admin.toSafeObject() });
});

module.exports = { login };
