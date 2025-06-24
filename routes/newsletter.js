const express = require("express");
const { register } = require("../controllers/newsLetterController");
const {
  validateNewsLetterEmail,
  handleValidationErrors,
} = require("../middlewares/validators/authValidators");

const router = express.Router();

router.post(
  "/register",
  validateNewsLetterEmail,
  handleValidationErrors,
  register
);

module.exports = router;