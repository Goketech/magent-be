const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: this.accountType === "advertiser",
      // unique: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    industry: {
      type: String,
      required:function () {
        return this.accountType === "advertiser";
      },
      trim: true,
    },
    expertise: {
      type: String,
      required:function () {
        return this.accountType === "publisher";
      },
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    accountType: {
      required: true,
      type: String,
      enum: ["advertiser", "publisher", "mvp"],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.walletAddress;
      },
    },
    googleId: {
      type: String,
    },
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planStartDate: {
      type: Date,
      default: Date.now,
    },
    planEndDate: {
      type: Date,
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    usage: {
      aiCalls: {
        count: { type: Number, default: 0 },
        lastReset: { type: Date, default: Date.now },
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('advertiserCampaigns', {
  ref: 'Campaign',
  localField: '_id',
  foreignField: 'userId',
});

userSchema.virtual('publisherCampaigns', {
  ref: 'Campaign',
  localField: 'walletAddress',
  foreignField: 'publishers.wallet',
});

const User = mongoose.model("User", userSchema);
module.exports = User;
