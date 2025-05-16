const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middlewares/adminAuth');

// Public
router.post('/invite', adminController.sendInvite);
router.post('/signup', adminController.signupWithInvite);
router.post('/login', adminController.login);

// Protected
router.use(authenticateAdmin);
router.get('/transactions', adminController.fetchAllTransactions);
router.get('/transactions/successful', adminController.fetchSuccessfulTransactions);
router.get('/users/active', adminController.countActiveUsers);
router.get('/campaigns', adminController.fetchAllCampaigns);
router.get('/campaigns/pending', adminController.fetchPendingCampaigns);
router.patch('/campaigns/:id/approve', adminController.approveCampaign);
router.get('/campaigns/:id/transactions', adminController.fetchCampaignTransactions);
router.get('/dashboard/stats', adminController.fetchAdminDashboardStats);
router.get('/transactions/successful/campaigns', adminController.fetchSuccessfulCampaignTransactions);
router.get('/transactions/successful/content', adminController.fetchSuccessfulContentTransactions);

module.exports = router;