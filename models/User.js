const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  businessName: {
    type: String,
    // required: true,
    trim: true
  },
  email: {
    type: String,
    // required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required:function () {
      return !this.googleId && !this.walletAddress;
    },
  },
  googleId: {
    type: String
  },
  walletAddress: {
    type: String,
    unique: true,
    sparse: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  planStartDate: {
    type: Date,
    default: Date.now
  },
  planEndDate: {
    type: Date,
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  usage: {
    aiCalls: {
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
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

// ─── INSTANCE METHOD: list of publisher‐side details ────────────────────────────
// Returns an array of { campaignId, referralCode, referralCount, paidOut } for this user.
userSchema.methods.getPublisherStats = async function() {
  if (!this.walletAddress) return [];

  const campaigns = await mongoose.model('Campaign').find(
    { 'publishers.wallet': this.walletAddress },
    { 
      campaignId:    1, 
      name:          1, 
      goals:         1,
      valuePerUserAmount: 1,
      totalLiquidity: 1,
      'publishers.$': 1 
    }
  );

  return campaigns.map(camp => {
    const pub = camp.publishers[0];
    return {
      campaignId:         camp.campaignId,
      campaignName:       camp.name,
      goals:              camp.goals,
      valuePerUserAmount: camp.valuePerUserAmount,
      totalLiquidity:     camp.totalLiquidity,
      referralCode:       pub.referralCode,
      referralCount:      pub.referralCount,
      paidOut:            pub.paidOut,
      remainingToPay:     Math.max(0, camp.valuePerUserAmount * pub.referralCount - pub.paidOut)
    };
  });
};

const User = mongoose.model('User', userSchema);
module.exports = User;