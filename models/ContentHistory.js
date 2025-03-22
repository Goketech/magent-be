const mongoose = require('mongoose');

const contentHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['finalized', 'running', 'cancelled'],
    default: 'running'
  },
  text: {
    type: String
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  scheduleId: {
    type: String
  }
}, { timestamps: true });

const ContentHistory = mongoose.model('ContentHistory', contentHistorySchema);
module.exports = ContentHistory;