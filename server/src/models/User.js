const mongoose = require('mongoose');

// SDD 3.12.1 — Users Collection
// full_name, email (unique), password_hash (bcrypt), phone_number (11 digits,
// Pakistani 03XX format), date_of_birth (ISO 8601), insurance_provider (optional)
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters'],
    match: [/^[a-zA-Z\s]+$/, 'Full name may contain letters and spaces only'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [256, 'Email cannot exceed 256 characters'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
  },
  // NEVER stored in plain text — always a bcrypt hash (salt factor 10)
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^03\d{9}$/, 'Phone number must be 11 digits starting with 03'],
  },
  dateOfBirth: {
    type: Date,
  },
  insuranceProvider: {
    type: String,
    trim: true,
    maxlength: [100, 'Insurance provider cannot exceed 100 characters'],
  },
  // Admin can deactivate accounts (not in SDD 3.12.1 — small deliberate
  // addition; documented in PHASE3_NOTES.md). Deactivated users keep their
  // data but cannot obtain new JWTs (checked at login).
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Strip the hash from any JSON sent to clients (defence-in-depth)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
