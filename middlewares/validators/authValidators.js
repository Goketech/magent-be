const { body, validationResult } = require("express-validator");

// Common validation functions
const validateEmail = body("email")
  .trim()
  .isEmail()
  .normalizeEmail()
  .withMessage("Please provide a valid email address");

const validateRole = body("role")
  .trim()
  .notEmpty()
  .withMessage("Role is required")
  .isString()
  .withMessage("Role must be a string")
  .isIn(["advertiser", "publisher", "mvp"])
  .withMessage("Role must be one of: advertiser, publisher, mvp");

const validatePassword = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters long")
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage(
    "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  );

const validateBusinessName = body("userName")
  .trim()
  .notEmpty()
  .withMessage("User name is required")
  .isLength({ min: 2, max: 100 })
  .withMessage("User name must be between 2 and 100 characters")
  .matches(/^[a-zA-Z0-9\s\-'.]+$/)
  .withMessage(
    "User name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods"
  );

const captachaValidation = body("captchaToken")
  .trim()
  .notEmpty()
  .withMessage("Captcha token is required")
  .isString()
  .withMessage("Captcha token must be a string")


// Validation chains for different routes
const registerValidation = [
  validateBusinessName,
  validateEmail,
  validatePassword,
  validateRole,
  captachaValidation,
  body("industry").custom((value, { req }) => {
    if (req.body.role === "advertiser" && !value) {
      throw new Error("Industry is required for advertisers");
    }
    return true;
  }),
  body("expertise").custom((value, { req }) => {
    if (req.body.role === "publisher" && !value) {
      throw new Error("Expertise is required for publishers");
    }
    return true;
  }),
   body("businessName").custom((value, { req }) => {
    if (req.body.role === "advertiser" && !value) {
      throw new Error("Business Name is required for advertisers");
    }
    return true;
  }),
  body("businessName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Business name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-'.]+$/)
    .withMessage(
      "Business name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods"
    ),
];

const loginValidation = [
  validateEmail,
  captachaValidation,
  body("password").notEmpty().withMessage("Password is required"),
];

const googleAuthValidation = [
  body("token").notEmpty().withMessage("Google token is required"),
];

const requestPasswordResetValidation = [
  validateEmail,
];

const validateNewPassword = body("newPassword")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters long")
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage(
    "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  );

  const resetPasswordValidation = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),
  validateNewPassword,
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation Error",
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  resetPasswordValidation,
  requestPasswordResetValidation,
  handleValidationErrors,
};
