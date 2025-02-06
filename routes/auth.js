const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getNonce,
  verifySignature,
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
router.post("/get-nonce", getNonce);
router.post("/verify-signature", verifySignature);
router.post(
  "/google",
  authLimiter,
  googleAuthValidation,
  handleValidationErrors,
  googleAuth
);

module.exports = router;
