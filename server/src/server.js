require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// --- security stack (SDD 3.3) ---
app.use(helmet()); // secure HTTP headers incl. basic CSP
// Production: set CORS_ORIGIN to the frontend URL(s), comma-separated
// (e.g. https://medicheck.vercel.app). Local dev leaves it open.
app.use(
  cors(
    process.env.CORS_ORIGIN
      ? { origin: process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) }
      : undefined
  )
);
app.use(express.json({ limit: '10kb' })); // reject oversized bodies early

// Brute-force protection on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later' },
});
app.use('/api/auth', authLimiter);
app.use('/api/admin', authLimiter); // admin login gets the same protection

// --- routes ---
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/symptoms', require('./routes/symptoms'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/appointments', require('./routes/appointments'));

// --- 404 + central errors (order matters) ---
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// DB connects in the background; the server boots regardless so that
// /api/health stays reachable and routes can answer 503 when Atlas is down
// (e.g. networks that block direct TLS, like this dev VM's egress proxy).
connectDB().then(async (ok) => {
  if (!ok) {
    console.warn('[server] running WITHOUT database — auth routes will return 503');
    return;
  }
  // Auto-seed: first boot against an empty database gets the 8 demo
  // hospitals automatically. Idempotent (skips when hospitals exist),
  // disabled with SEED_ON_BOOT=false, and never allowed to crash boot.
  if (process.env.SEED_ON_BOOT !== 'false') {
    try {
      const { seedHospitalsIfEmpty } = require('./utils/seedData');
      const { seeded, count } = await seedHospitalsIfEmpty();
      console.log(
        seeded
          ? `[seed] auto-seeded ${count} hospitals on first boot`
          : `[seed] ${count} hospital(s) present — auto-seed skipped`
      );
    } catch (err) {
      console.warn('[seed] auto-seed failed, continuing without it:', err.message);
    }
  } else {
    console.log('[seed] auto-seed disabled via SEED_ON_BOOT=false');
  }
  // One-time admin bootstrap (Render free tier has no shell): set
  // SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD env vars, deploy, then delete them.
  try {
    const { seedAdminIfConfigured } = require('./utils/seedData');
    const r = await seedAdminIfConfigured();
    console.log(
      r.seeded
        ? `[seed] admin account created for ${r.email} — DELETE the SEED_ADMIN_* env vars now`
        : `[seed] admin bootstrap skipped (${r.reason})`
    );
  } catch (err) {
    console.warn('[seed] admin bootstrap failed, continuing:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`[server] MediCheck API listening on port ${PORT}`);
});

// Appointment SMS reminders (SDD DFD 4.0): every 30 min, confirmed
// appointments within the next 24h get one reminder SMS each.
// Disable with ENABLE_REMINDERS=false (e.g. for pure API test runs).
if (process.env.ENABLE_REMINDERS !== 'false') {
  const { startReminderJob } = require('./jobs/reminderJob');
  startReminderJob();
} else {
  console.log('[reminders] disabled via ENABLE_REMINDERS=false');
}
