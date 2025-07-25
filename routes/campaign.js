const express = require("express");
const {
  createCampaign,
  updateCampaignStatus,
  getUserCampaigns,
  getAllMarketplaceCampaigns,
  joinCampaign,
} = require("../controllers/campaignController");
const {
  createCampaignValidation,
  updateCampaignStatusValidation,
  joinCampaignValidation,
} = require("../middlewares/validators/campaignValidators");
const auth = require("../middlewares/auth");
const { globalLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post(
  "/create-campaign",
  globalLimiter,
  auth,
  createCampaignValidation,
  createCampaign
);
router.post(
  "/update-campaign",
  globalLimiter,
  auth,
  updateCampaignStatusValidation,
  updateCampaignStatus
);
router.get("/user-campaigns", globalLimiter, auth, getUserCampaigns);
router.get(
  "/marketplace-campaigns",
  globalLimiter,
  auth,
  getAllMarketplaceCampaigns
);
router.post(
  "/join-campaign/:campaignId",
  globalLimiter,
  auth,
  joinCampaignValidation,
  joinCampaign
);

module.exports = router;
