const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Utility middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation error",
      details: errors.array().map(e => ({ field: e.param, message: e.msg })),
    });
  }
  next();
};

const isMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

// Validation for creating a transaction
const createTransactionValidation = [
  body("feature")
    .trim()
    .notEmpty().withMessage("Feature is required.")
    .isString().withMessage("Feature must be a string."),
  body("reference")
    .trim()
    .notEmpty().withMessage("Reference is required.")
    .isString().withMessage("Reference must be a string."),
  body("amount")
    .notEmpty().withMessage("Amount is required.")
    .isNumeric().withMessage("Amount must be a number.")
    .custom((val) => val > 0).withMessage("Amount must be greater than zero."),
  validate,
];

// Validation for updating a transaction
const updateTransactionValidation = [
  body("transactionId")
    .notEmpty().withMessage("Transaction ID is required.")
    .custom((value) => {
      if (!isMongoId(value)) throw new Error("Invalid transactionId format.");
      return true;
    }),
  body("status")
    .trim()
    .notEmpty().withMessage("Status is required.")
    .isIn(["pending", "success", "failed"]).withMessage("Invalid status value."),
  body("signature")
    .optional()
    .isString().withMessage("Signature must be a string."),
  validate,
];

module.exports = {
  createTransactionValidation,
  updateTransactionValidation,
};
