const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleAuth,
} = require("../controllers/authController");
const { authLimiter } = require("../middlewares/rateLimit");
const {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  handleValidationErrors,
} = require("../middlewares/validators/authValidators");

router.post(
  "/register",
  // authLimiter,
  registerValidation,
  handleValidationErrors,
  register
);
router.post(
  "/login",
  authLimiter,
  loginValidation,
  handleValidationErrors,
  login
);
router.post(
  "/google",
  authLimiter,
  googleAuthValidation,
  handleValidationErrors,
  googleAuth
);

module.exports = router;
