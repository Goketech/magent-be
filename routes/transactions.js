const express = require("express");
const {
  createTransaction,
  updateTransactionStatus,
} = require("../controllers/transactionController");
const {
  createTransactionValidation,
  updateTransactionValidation,
} = require("../middlewares/validators/transactionValidators");
const auth = require("../middlewares/auth");
const { globalLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post(
  "/create-transaction",
  globalLimiter,
  auth,
  createTransactionValidation,
  createTransaction
);
router.post(
  "/update-transaction-status",
  globalLimiter,
  auth,
  updateTransactionValidation,
  updateTransactionStatus
);

module.exports = router;
