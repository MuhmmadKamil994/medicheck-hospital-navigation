const express = require('express');

const router = express.Router();

// GET /api/health — liveness probe (works even if the DB is down)
router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
