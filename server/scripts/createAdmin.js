/**
 * Create an admin account MANUALLY (SDD 1.5: no self-registration for admins).
 *
 *   node scripts/createAdmin.js <username> <email> <password>
 *
 * Password must be >= 8 chars. The hash (bcrypt, salt 10) is stored —
 * the plain password never touches the database.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../src/models/Admin');

(async () => {
  const [, , username, email, password] = process.argv;
  if (!username || !email || !password) {
    console.error('Usage: node scripts/createAdmin.js <username> <email> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('[admin] password must be at least 8 characters');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('[admin] MONGODB_URI is not set in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    console.error('[admin] MongoDB connection failed:', err.message);
    process.exit(1);
  }

  const exists = await Admin.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
  if (exists) {
    console.error('[admin] an admin with that username or email already exists');
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10); // SDD 3.3
  await Admin.create({ username, email: email.toLowerCase(), passwordHash, role: 'superadmin' });
  console.log(`[admin] created superadmin "${username}"`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error('[admin] failed:', err.message);
  process.exit(1);
});
