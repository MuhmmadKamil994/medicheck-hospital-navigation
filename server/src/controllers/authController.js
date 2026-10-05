const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDbReady } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const TOKEN_TTL = '24h'; // SDD Ch.5: tokens are short-lived (24-hour expiry)

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// 503 when MongoDB is unreachable so the client gets a clear message
// instead of a hang or a crash.
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

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const { fullName, email, password, phoneNumber, dateOfBirth, insuranceProvider } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10); // SDD 3.3: salt factor 10
  const user = await User.create({
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    phoneNumber: phoneNumber.trim(),
    dateOfBirth: dateOfBirth || undefined,
    insuranceProvider: insuranceProvider ? insuranceProvider.trim() : undefined,
  });

  const token = signToken(user._id);
  res.status(201).json({ success: true, token, user: user.toSafeObject() });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Generic message on purpose (SDD test TC-03): never reveal whether the
  // email exists or the password was wrong.
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  // Deactivated accounts (see PATCH /api/admin/users/:id) cannot log in.
  if (user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: 'This account has been deactivated — please contact support',
    });
  }

  const token = signToken(user._id);
  res.json({ success: true, token, user: user.toSafeObject() });
});

// GET /api/auth/me  (protected)
const me = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, user: user.toSafeObject() });
});

module.exports = { register, login, me };
