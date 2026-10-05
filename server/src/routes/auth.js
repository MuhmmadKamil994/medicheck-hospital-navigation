const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { register, login, me } = require('../controllers/authController');

const router = express.Router();

// Pakistani mobile: exactly 11 digits, starts with 03
const PK_PHONE = /^03\d{9}$/;

const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name cannot exceed 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Full name may contain letters and spaces only'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .isLength({ max: 256 }).withMessage('Email cannot exceed 256 characters')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(PK_PHONE).withMessage('Phone number must be 11 digits starting with 03'),
  body('dateOfBirth')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
  body('insuranceProvider')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('Insurance provider cannot exceed 100 characters'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', auth, me);

module.exports = router;
