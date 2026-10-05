const express = require('express');
const { query, param, body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { nearby, detail, geocode, route } = require('../controllers/hospitalController');

const router = express.Router();

// All hospital routes require a logged-in user (nearby needs the user's
// insurance; route proxies a third-party service, so no anonymous use).
router.use(auth);

const nearbyValidation = [
  query('lat')
    .notEmpty().withMessage('lat is required')
    .isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
  query('lng')
    .notEmpty().withMessage('lng is required')
    .isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),
  query('radiusKm')
    .optional({ values: 'falsy' })
    .isFloat({ min: 1, max: 50 }).withMessage('radiusKm must be between 1 and 50'),
  query('specialization').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  query('insurance').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  query('openNow').optional({ values: 'falsy' }).isIn(['true', 'false']),
];

const routeValidation = [
  query('fromLat').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('fromLat invalid'),
  query('fromLng').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('fromLng invalid'),
  query('toLat').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('toLat invalid'),
  query('toLng').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('toLng invalid'),
];

const idValidation = [param('id').isMongoId().withMessage('Invalid hospital id')];

const geocodeValidation = [
  body('address')
    .trim()
    .notEmpty().withMessage('address is required')
    .isLength({ max: 300 }).withMessage('address cannot exceed 300 characters'),
];

// NOTE: /nearby and /route must be registered BEFORE /:id.
router.get('/nearby', nearbyValidation, validate, nearby);
router.get('/route', routeValidation, validate, route);
router.post('/geocode', requireAdmin, geocodeValidation, validate, geocode);
router.get('/:id', idValidation, validate, detail);

module.exports = router;
