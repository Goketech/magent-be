const express = require("express");
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
const auth = require("../middlewares/auth");


const router = express.Router();

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
