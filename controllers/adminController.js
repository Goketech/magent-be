const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Invite = require('../models/Invite');
const { sendEmail } = require('../utils/email');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const ContentHistory = require('../models/ContentHistory');

exports.sendInvite = async (req, res) => {
  const { email } = req.body;
  const code = crypto.randomBytes(20).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Invite.create({ code, email, expiresAt });
  const url = `${process.env.APP_URL}/admin/signup?code=${code}`;
  await sendEmail(email, 'Admin Invite', `Use this link to sign up: ${url}`);
  res.json({ message: 'Invite sent' });
};

exports.signupWithInvite = async (req, res) => {
  const { code, email, password } = req.body;
  const invite = await Invite.findOne({ code, email, used: false, expiresAt: { $gt: new Date() } });
  if (!invite) return res.status(400).json({ error: 'Invalid or expired invite' });

  const admin = await Admin.create({ email, password });
  invite.used = true;
  await invite.save();

  res.status(201).json({ message: 'Admin created' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin || !(await admin.verifyPassword(password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
};

exports.fetchAllTransactions = async (req, res) => {
  const txs = await Transaction.find().lean().exec();
  res.json(txs);
};

exports.fetchSuccessfulTransactions = async (req, res) => {
  const stats = await Transaction.aggregate([
    { $match: { transactionStatus: 'success' } },
    { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
  ]);
  res.json(stats[0] || { count: 0, totalAmount: 0 });
};

exports.countActiveUsers = async (req, res) => {
  const count = await User.countDocuments();
  res.json({ activeUsers: count });
};

exports.fetchAllCampaigns = async (req, res) => {
  const campaigns = await Campaign.find().lean().exec();
  res.json(campaigns);
};

exports.fetchPendingCampaigns = async (req, res) => {
  const pending = await Campaign.find({ status: 'pending' }).lean().exec();
  res.json(pending);
};

exports.approveCampaign = async (req, res) => {
  const { id } = req.params;
  const campaign = await Campaign.findByIdAndUpdate(id, { status: 'active' }, { new: true });
  res.json(campaign);
};

exports.fetchCampaignTransactions = async (req, res) => {
  const { id } = req.params;
  const txs = await Transaction.find({ campaign: id }).lean().exec();
  res.json(txs);
};

exports.fetchAdminDashboardStats = async (req, res) => {
  const [users, campaigns, txStats, postStats] = await Promise.all([
    User.countDocuments(),
    Campaign.countDocuments(),
    Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),
    ContentHistory.aggregate([
      {
        $group: {
          _id: null,
          totalPosts: { $sum: '$count' },
          entries: { $sum: 1 }
        }
      }
    ])
  ]);

  res.json({
    users,
    campaigns,
    transactions: txStats[0] || { totalAmount: 0, count: 0 },
    content: postStats[0] || { totalPosts: 0, entries: 0 }
  });
};
