const express = require("express");
const {
  register,
  login,
  googleAuth,
  getNonce,
  verifySignature,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");
const { verifyRecaptcha } = require("../middlewares/recaptcha");
const { authLimiter } = require("../middlewares/rateLimit");
const {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  resetPasswordValidation,
  requestPasswordResetValidation,
  handleValidationErrors,
} = require("../middlewares/validators/authValidators");
const auth = require("../middlewares/auth");

const router = express.Router();

router.post(
  "/register",
  // authLimiter,
  registerValidation,
  verifyRecaptcha,
  handleValidationErrors,
  register
);
router.post(
  "/login",
  authLimiter,
  loginValidation,
  verifyRecaptcha,
  handleValidationErrors,
  login
);
router.post(
  "/request-password-reset",
  authLimiter,
  requestPasswordResetValidation,
  handleValidationErrors,
  requestPasswordReset
);
router.post(
  "/reset-password",
  authLimiter,
  resetPasswordValidation,
  handleValidationErrors,
  resetPassword
);
router.post("/get-nonce", auth, getNonce);
router.post("/verify-signature", auth, verifySignature);
router.post(
  "/google",
  authLimiter,
  googleAuthValidation,
  handleValidationErrors,
  googleAuth
);

module.exports = router;
