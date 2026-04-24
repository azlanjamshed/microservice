const { body, validationResult } = require("express-validator");

const validateProduct = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ min: 2, max: 120 })
    .withMessage("Title must be between 2 and 120 characters."),
  body("Description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must be at most 1000 characters."),
  body("priceAmount")
    .notEmpty()
    .withMessage("Price amount is required.")
    .isFloat({ gt: 0 })
    .withMessage("Price amount must be greater than 0."),
  body("priceCurrency")
    .optional({ checkFalsy: true })
    .isIn(["INR", "USD"])
    .withMessage("Price currency must be INR or USD."),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: "Validation failed.",
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
}


module.exports = {
  validateProduct,
  handleValidationErrors,
};
