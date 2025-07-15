const mongoose = require("mongoose");

const publisherSchema = new mongoose.Schema(
  {
    wallet: { type: String, required: true },
    referralCode: { type: String, required: true, unique: true },
    referralCount: { type: Number, default: 0 },
    paidOut: { type: Number, default: 0 },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  goals: {
    type: String,
    enum: [
      "engagement",
      "waitlist",
      "feedback",
      "followers",
      "installs",
      "signups",
    ],
    required: true,
  },
  kpi: {
    type: String,
    enum: ["likes", "shares", "comments"],
    required: function () {
      return this.goals === "engagement";
    },
  },
  targetNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  targetAudience: {
    age: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "both"],
      required: true,
    },
  },
  industry: {
    type: String,
    enum: [
      "defi",
      "infrastructure",
      "depin",
      "consumer dapps",
      "payments",
      "gaming",
      "ai",
      "dao",
    ],
    required: true,
    lowercase: true,
    trim: true,
  },
  valuePerUser: {
    type: String,
    required: true,
    trim: true,
  },
  valuePerUserAmount: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function (val) {
        return (
          typeof this.totalLiquidity !== "number" || val <= this.totalLiquidity
        );
      },
      message: "Value per user amount cannot be greater than total liquidity",
    },
  },
  totalLiquidity: {
    type: Number,
    required: true,
    min: 0,
  },
  website: {
    type: String,
    required: true,
    trim: true,
    match: /^https?:\/\/.+\..+/,
  },
  xAccount: {
    type: String,
    required: true,
    trim: true,
  },
  youtube: {
    type: String,
    trim: true,
  },
  instagram: {
    type: String,
    trim: true,
  },
  telegram: {
    type: String,
    trim: true,
  },
  discord: {
    type: String,
    trim: true,
  },
  otherSocials: {
    type: String,
    trim: true,
  },
  otherInfo: {
    type: String,
    trim: true,
  },
  media: [
    {
      url: {
        type: String,
        required: true,
        match: /^https?:\/\/.+/,
        trim: true,
      },
      typeOfMedia: {
        type: String,
        enum: ["image", "video"],
        required: true,
      },
    },
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "inactive", "active"],
    default: "pending",
  },
  publishers: [
    {
     type: [publisherSchema],
      default: [],
    },
  ],
  publisherCount: {
    type: Number,
    default: 0,
  },
  spent: { type: Number, default: 0 },
  feedbackFormId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Form",
  },
  feedbackFormUrl: {
    type: String,
    trim: true,
    required: false,
  },
  feedbackFormResponses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormResponse",
    },
  ],
  feedbackFormResponseCount: {
    type: Number,
    default: 0,
  },
  totalResults: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return !this.endDate || value <= this.endDate;
      },
      message: "Start date must be before end date.",
    },
  },
  endDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return !this.startDate || value >= this.startDate;
      },
      message: "End date must be after start date.",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const Campaign = mongoose.model("Campaign", campaignSchema);
module.exports = Campaign;
