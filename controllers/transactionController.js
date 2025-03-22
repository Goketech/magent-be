const Transaction = require("../models/Transaction");

exports.createTransaction = async (req, res) => {
  try {
    const { feature, reference, amount } = req.body;

    if (!feature || !reference || !amount) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const transaction = new Transaction({
      userId: req.user._id,
      feature,
      reference,
      amount,
      transactionStatus: "pending",
    });

    await transaction.save();

    res.status(201).json({
      transactionId: transaction._id,
      status: "pending",
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
};

exports.updateTransactionStatus = async (req, res) => {
  try {
    const { transactionId, status, signature } = req.body;

    if (!transactionId || !status) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Verify the user owns this transaction
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    transaction.transactionStatus = status;
    if (signature) {
      transaction.signature = signature;
    }

    await transaction.save();

    res.json({ status: "success", transaction });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
};
