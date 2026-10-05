const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { book, list, cancel } = require('../controllers/appointmentController');

const router = express.Router();

// All appointment routes require a logged-in user.
router.use(auth);

// SDD 3.12.4: appointment_date must be a future date,
// appointment_time is HH:MM 24-hour format.
const bookValidation = [
  body('hospitalId')
    .isMongoId().withMessage('Invalid hospital id'),
  body('appointmentDate')
    .isISO8601().withMessage('appointmentDate must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (new Date(value) < startOfToday) {
        throw new Error('appointmentDate must be today or in the future');
      }
      return true;
    }),
  body('appointmentTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('appointmentTime must be HH:MM in 24-hour format'),
];

const idValidation = [
  param('id').isMongoId().withMessage('Invalid appointment id'),
];

router.post('/book', bookValidation, validate, book);
router.get('/', list);
router.delete('/:id', idValidation, validate, cancel);

module.exports = router;
