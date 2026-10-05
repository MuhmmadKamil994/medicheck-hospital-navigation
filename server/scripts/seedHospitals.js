/**
 * Seed real Bahawalpur hospitals into the Hospitals collection.
 *
 *   node scripts/seedHospitals.js
 *
 * Thin CLI wrapper around src/utils/seedData.js (shared with the
 * boot-time auto-seed). Idempotent: skips when hospitals already exist.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { seedHospitalsIfEmpty } = require('../src/utils/seedData');

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('[seed] MONGODB_URI is not set in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    console.error('[seed] MongoDB connection failed:', err.message);
    process.exit(1);
  }

  try {
    const { seeded, count } = await seedHospitalsIfEmpty();
    if (seeded) {
      console.log(`[seed] inserted ${count} Bahawalpur hospitals (coordinates approximate)`);
    } else {
      console.log(`[seed] ${count} hospital(s) already exist — skipping (idempotent)`);
    }
  } catch (err) {
    console.error('[seed] failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
