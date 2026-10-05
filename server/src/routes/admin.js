const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { login } = require('../controllers/adminController');
const {
  listAppointments,
  updateAppointmentStatus,
  listUsers,
  setUserActive,
  createHospital,
  updateHospital,
  deleteHospital,
} = require('../controllers/adminManagementController');

const router = express.Router();

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// No registration route here on purpose (SDD 1.5: admin accounts are
// created manually, never self-registered).
router.post('/login', loginValidation, validate, login);

// Everything below requires a logged-in superadmin (SDD DFD 5.0).
router.use(auth, requireAdmin);

const idValidation = [
  param('id').isMongoId().withMessage('Invalid id'),
];

const appointmentsQueryValidation = [
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['pending', 'confirmed', 'cancelled'])
    .withMessage('status must be pending, confirmed or cancelled'),
  query('date')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('date must be YYYY-MM-DD'),
];

const appointmentStatusValidation = [
  ...idValidation,
  body('status')
    .isIn(['confirmed', 'cancelled'])
    .withMessage('status must be confirmed or cancelled'),
];

const usersQueryValidation = [
  query('page')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

const userActiveValidation = [
  ...idValidation,
  body('isActive')
    .isBoolean().withMessage('isActive must be true or false'),
];

router.get('/appointments', appointmentsQueryValidation, validate, listAppointments);
router.patch('/appointments/:id', appointmentStatusValidation, validate, updateAppointmentStatus);
router.get('/users', usersQueryValidation, validate, listUsers);
router.patch('/users/:id', userActiveValidation, validate, setUserActive);

// Hospital management (SDD 3.7). Added in Phase 4b — the original backend
// shipped the admin tables without these endpoints.
const hospitalBodyValidation = (forUpdate = false) => {
  const req = (chain) => (forUpdate ? chain.optional({ values: 'falsy' }) : chain);
  return [
    req(body('name').trim().notEmpty().withMessage('Hospital name is required'))
      .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
    req(body('latitude').notEmpty().withMessage('latitude is required'))
      .isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
    req(body('longitude').notEmpty().withMessage('longitude is required'))
      .isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
    body('address').optional({ values: 'falsy' }).trim().isLength({ max: 300 })
      .withMessage('Address cannot exceed 300 characters'),
    body('specializations').optional().isArray().withMessage('specializations must be an array'),
    body('operatingHours').optional({ values: 'falsy' }).trim(),
    body('insuranceAccepted').optional().isArray().withMessage('insuranceAccepted must be an array'),
    body('availabilityStatus').optional().isBoolean().withMessage('availabilityStatus must be true or false')
      .toBoolean(),
    body('contactNumber').optional({ values: 'falsy' }).trim().isLength({ max: 15 })
      .withMessage('Contact number cannot exceed 15 characters'),
  ];
};

router.post('/hospitals', hospitalBodyValidation(false), validate, createHospital);
router.patch('/hospitals/:id', idValidation, hospitalBodyValidation(true), validate, updateHospital);
router.delete('/hospitals/:id', idValidation, validate, deleteHospital);

module.exports = router;
