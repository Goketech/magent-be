const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Utility middleware to send validation errors
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

// Validation for scheduling posts
const schedulePostValidation = [
  body("topic")
    .trim()
    .notEmpty().withMessage("Topic is required.")
    .isString().withMessage("Topic must be a string."),
  body("secondTopic")
    .optional()
    .isString().withMessage("Second topic must be a string."),
  body("firstStyle")
    .trim()
    .notEmpty().withMessage("First style is required.")
    .isString().withMessage("First style must be a string."),
  body("secondStyle")
    .trim()
    .notEmpty().withMessage("Second style is required.")
    .isString().withMessage("Second style must be a string."),
  body("minInterval")
    .notEmpty().withMessage("minInterval is required.")
    .isInt({ gt: 0 }).withMessage("minInterval must be a positive integer (in hours)."),
  body("maxInterval")
    .notEmpty().withMessage("maxInterval is required.")
    .isInt({ gt: 0 }).withMessage("maxInterval must be a positive integer (in hours).")
    .custom((max, { req }) => {
      if (parseInt(max) < parseInt(req.body.minInterval)) {
        throw new Error("maxInterval must be greater than or equal to minInterval.");
      }
      return true;
    }),
  body("duration")
    .notEmpty().withMessage("Duration is required.")
    .isInt({ gt: 0 }).withMessage("Duration must be a positive number (in days)."),
  body("accessToken")
    .notEmpty().withMessage("accessToken is required.")
    .isString().withMessage("accessToken must be a string."),
  body("transactionId")
    .notEmpty().withMessage("transactionId is required.")
    .custom((value) => {
      if (!isMongoId(value)) throw new Error("Invalid transactionId format.");
      return true;
    }),
  validate,
];

// Validation for generating a single post
const generatePostValidation = [
  body("topic")
    .notEmpty().withMessage("topic is required.")
    .isArray({ min: 1 }).withMessage("topic must be a non-empty array.")
    .custom((arr) => {
      if (!arr.every((t) => typeof t.value === "string")) {
        throw new Error("Each topic must have a 'value' string.");
      }
      return true;
    }),
  body("firstStyle")
    .trim()
    .notEmpty().withMessage("firstStyle is required.")
    .isString().withMessage("firstStyle must be a string."),
  body("secondStyle")
    .trim()
    .notEmpty().withMessage("secondStyle is required.")
    .isString().withMessage("secondStyle must be a string."),
  validate,
];

// Validation for cancelling a schedule
const cancelScheduleValidation = [
  param("scheduleId")
    .notEmpty().withMessage("scheduleId is required.")
    .isString().withMessage("scheduleId must be a string."),
  validate,
];

module.exports = {
  schedulePostValidation,
  generatePostValidation,
  cancelScheduleValidation,
};
