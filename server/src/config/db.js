const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas.
 * Resolves even when the database is unreachable — the server must stay up
 * so /api/health keeps working and routes can answer 503 gracefully.
 * Callers check readiness via mongoose.connection.readyState === 1.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[db] MONGODB_URI is not set — running without database');
    return false;
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // fail fast instead of hanging 30s
    });
    console.log('[db] MongoDB connected');
    return true;
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    return false;
  }
}

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbReady };
