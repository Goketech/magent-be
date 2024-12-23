const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true
    },
    price: {
      type: Number,
      required: true
    },
    features: {
      aiCalls: {
        limit: { type: Number, required: true },
        period: { type: String, enum: ['daily', 'monthly'], required: true }
      }
    },
    isCustom: {
      type: Boolean,
      default: false
    }
  }, { timestamps: true });
  
  const Plan = mongoose.model('Plan', planSchema);
  module.exports = Plan;