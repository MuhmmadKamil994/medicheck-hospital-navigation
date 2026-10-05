const { validationResult } = require('express-validator');

/**
 * Runs after an express-validator chain. If validation failed,
 * responds 400 with per-field messages instead of reaching the controller.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
}

module.exports = validate;
