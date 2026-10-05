/**
 * Shared hospital seed data + idempotent seeding logic.
 *
 * Used by:
 *  - scripts/seedHospitals.js   (manual CLI: node scripts/seedHospitals.js)
 *  - src/server.js               (auto-seed on boot when SEED_ON_BOOT !== 'false')
 *
 * IDEMPOTENT: if any hospitals already exist, nothing is inserted.
 * Never throws for "already seeded" — only real DB errors propagate,
 * and callers must catch those so a seed failure can never crash boot.
 *
 * NOTE ON COORDINATES: lat/lng below are APPROXIMATE (Bahawalpur city area,
 * ~29.3956, 71.6722; BVH verified via Nominatim 2026-10-05). They exist so
 * the map, filters and booking flow demo end-to-end; the owner replaces them
 * with verified data (his homework) via the admin panel or a re-seed.
 */
const Hospital = require('../models/Hospital');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

const SEED_HOSPITALS = [
  {
    name: 'Bahawal Victoria Hospital',
    address: 'Circular Road, Bahawalpur',
    lat: 29.3900142, lng: 71.6818314, // VERIFIED via Nominatim 2026-10-05
    specializations: ['Cardiology', 'Emergency', 'Orthopedics', 'Surgery'],
    operatingHours: 'Open 24 hours (Emergency dept)',
    insuranceAccepted: ['Sehat Sahulat', 'Jubilee'],
    availabilityStatus: true,
    contactNumber: '062-9250061',
  },
  {
    name: 'Civil Hospital Bahawalpur',
    address: 'Hospital Road, Bahawalpur',
    lat: 29.4005, lng: 71.6743, // approx.
    specializations: ['Surgery', 'Radiology', 'Dermatology', 'Pediatrics'],
    operatingHours: 'Open 24 hours',
    insuranceAccepted: ['Sehat Sahulat'],
    availabilityStatus: true,
    contactNumber: '062-9250211',
  },
  {
    name: 'Al-Shifa Medical Clinic',
    address: 'Model Town B, Bahawalpur',
    lat: 29.3812, lng: 71.6598, // approx.
    specializations: ['General Physician', 'Pediatrics'],
    operatingHours: '9:00 AM - 9:00 PM',
    insuranceAccepted: ['Sehat Sahulat'],
    availabilityStatus: true,
    contactNumber: '062-2881234',
  },
  {
    name: 'City Care Clinic',
    address: 'Gulberg Road, Bahawalpur',
    lat: 29.3988, lng: 71.6901, // approx.
    specializations: ['General Physician', 'Dental'],
    operatingHours: '10:00 AM - 10:00 PM',
    insuranceAccepted: ['EFU'],
    availabilityStatus: true,
    contactNumber: '062-2885678',
  },
  {
    name: 'Noor Medicare Hospital',
    address: 'Satellite Town, Bahawalpur',
    lat: 29.3721, lng: 71.6488, // approx.
    specializations: ['Cardiology', 'Gynecology', 'General Physician'],
    operatingHours: 'Open 24 hours (Emergency dept)',
    insuranceAccepted: ['Sehat Sahulat', 'EFU', 'Jubilee'],
    availabilityStatus: true,
    contactNumber: '062-2273456',
  },
  {
    name: 'Model Town Medical Centre',
    address: 'Model Town A, Bahawalpur',
    lat: 29.3855, lng: 71.6654, // approx.
    specializations: ['Orthopedics', 'Physiotherapy'],
    operatingHours: '9:00 AM - 8:00 PM',
    insuranceAccepted: [],
    availabilityStatus: true,
    contactNumber: '062-2889012',
  },
  {
    name: 'Gulberg Dental & Medical Clinic',
    address: 'Gulberg Road, Bahawalpur',
    lat: 29.4012, lng: 71.6877, // approx.
    specializations: ['Dental', 'Dermatology'],
    operatingHours: '11:00 AM - 9:00 PM',
    insuranceAccepted: [],
    availabilityStatus: true,
    contactNumber: '062-2883456',
  },
  {
    name: 'Shalimar Medical Clinic',
    address: 'Shalimar Colony, Bahawalpur',
    lat: 29.4102, lng: 71.6621, // approx.
    specializations: ['Pediatrics', 'General Physician'],
    operatingHours: '9:00 AM - 9:00 PM',
    insuranceAccepted: ['Sehat Sahulat'],
    availabilityStatus: false, // listed but currently inactive — exercises the filter
    contactNumber: '062-2887890',
  },
];

/**
 * Insert the seed hospitals if the collection is empty.
 * Requires an already-connected mongoose instance (server boot path).
 * @returns {Promise<{seeded: boolean, count: number}>}
 */
async function seedHospitalsIfEmpty() {
  const existing = await Hospital.countDocuments();
  if (existing > 0) {
    return { seeded: false, count: existing };
  }
  const docs = SEED_HOSPITALS.map(({ lat, lng, ...rest }) => ({
    ...rest,
    location: { type: 'Point', coordinates: [lng, lat] }, // GeoJSON: lng FIRST
  }));
  await Hospital.insertMany(docs);
  return { seeded: true, count: docs.length };
}

/**
 * One-time admin bootstrap for hosts without shell access (e.g. Render free tier).
 *
 * Set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD as environment variables, deploy,
 * verify admin login works, then DELETE both variables (and redeploy).
 *
 * IDEMPOTENT: skips when any admin already exists or when the vars are absent.
 * Never throws for "already seeded" — only real errors propagate, and the
 * boot caller catches those so a seed failure can never crash the server.
 *
 * @returns {Promise<{seeded: boolean, email?: string, reason?: string}>}
 */
async function seedAdminIfConfigured() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  if (!email || !password) {
    return { seeded: false, reason: 'SEED_ADMIN_EMAIL/PASSWORD not set' };
  }
  const existing = await Admin.countDocuments();
  if (existing > 0) {
    return { seeded: false, reason: `${existing} admin(s) already present` };
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters');
  }
  const username = email.split('@')[0].slice(0, 50) || 'admin';
  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ username, email, passwordHash, role: 'superadmin' });
  return { seeded: true, email };
}

module.exports = { SEED_HOSPITALS, seedHospitalsIfEmpty, seedAdminIfConfigured };
