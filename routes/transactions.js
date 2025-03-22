const express = require("express");
const {
  createTransaction,
  updateTransactionStatus,
} = require("../controllers/transactionController");
const auth = require("../middlewares/auth");
const { globalLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/create-transaction", globalLimiter, auth, createTransaction);
router.post(
  "/update-transaction-status",
  globalLimiter,
  auth,
  updateTransactionStatus
);

module.exports = router;
