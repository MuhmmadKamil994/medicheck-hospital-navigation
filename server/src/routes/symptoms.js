const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { analyze, history, remove } = require('../controllers/symptomController');

const router = express.Router();

// Guests may call /analyze without an account (no record is saved for them),
// so this router does NOT use a blanket `auth` — each route picks its guard.
// Analyze is the expensive route (one Gemini call per request): a per-IP
// limiter protects the free-tier quota from abuse.
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 triage calls per IP per window (generous for demo, safe for quota)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many symptom checks — please try again later' },
});

// SDD 3.12.2: max 20 symptoms, each max 100 characters.
const analyzeValidation = [
  body('symptoms')
    .isArray({ min: 1, max: 20 })
    .withMessage('symptoms must be an array of 1 to 20 items'),
  body('symptoms.*')
    .isString().withMessage('Each symptom must be text')
    .trim()
    .notEmpty().withMessage('Symptom cannot be empty')
    .isLength({ max: 100 }).withMessage('Each symptom cannot exceed 100 characters'),
  body('severity')
    .optional({ values: 'falsy' })
    .isIn(['mild', 'moderate', 'severe'])
    .withMessage('severity must be mild, moderate or severe'),
  body('duration')
    .optional({ values: 'falsy' })
    .trim()
    .isString().withMessage('duration must be text')
    .isLength({ max: 50 }).withMessage('duration cannot exceed 50 characters'),
];

const idValidation = [
  param('id').isMongoId().withMessage('Invalid record id'),
];

// Guest-friendly: no token -> Gemini triage, nothing saved. Logged-in ->
// triage + SymptomRecord saved to history.
router.post('/analyze', analyzeLimiter, optionalAuth, analyzeValidation, validate, analyze);
// History and delete stay strictly personal: JWT required.
router.get('/history', auth, history);
router.delete('/:id', auth, idValidation, validate, remove);

module.exports = router;
