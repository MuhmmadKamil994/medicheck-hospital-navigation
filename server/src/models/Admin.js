const mongoose = require('mongoose');

// SDD 3.12.5 — Admin Collection
// Admin accounts are created MANUALLY (seed script / DB console).
// There is deliberately NO self-registration route for admins.
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [256, 'Email cannot exceed 256 characters'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  role: {
    type: String,
    default: 'superadmin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

adminSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
