const express = require("express");
const { createCampaign, updateCampaignStatus, getUserCampaigns, getAllMarketplaceCampaigns } = require("../controllers/campaignController");
const auth = require("../middlewares/auth");
const { globalLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/create-campaign", globalLimiter, auth, createCampaign);
router.post("/update-campaign", globalLimiter, auth, updateCampaignStatus);
router.get("/user-campaigns", globalLimiter, auth, getUserCampaigns);
router.get("/marketplace-campaigns", globalLimiter, auth, getAllMarketplaceCampaigns);

module.exports = router;
