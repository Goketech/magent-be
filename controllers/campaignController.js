const Campaign = require("../models/Campaign");
const Transaction = require("../models/Transaction");

exports.createCampaign = async (req, res) => {
  try {
    const {
      name,
      goals,
      kpi,
      targetNumber,
      publishers,
      targetAudience,
      industry,
      valuePerUser,
      valuePerUserAmount,
      totalLiquidity,
      website,
      xAccount,
      youtube,
      instagram,
      telegram,
      discord,
      otherSocials,
      otherInfo,
      media,
      transactionId,
      startDate,
      endDate,
    } = req.body;

    // Validate required fields
    if (
      !name || !goals || !targetNumber || !targetAudience ||
      !targetAudience.age || !targetAudience.gender || !industry ||
      !valuePerUser || !valuePerUserAmount || !totalLiquidity ||
      !website || !xAccount || !transactionId || !startDate || !endDate
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // If goal is engagement, kpi is required
    if (goals === "engagement" && !kpi) {
      return res.status(400).json({ error: "KPI is required for engagement campaigns" });
    }

    // Validate transaction
    const transaction = await Transaction.findById(transactionId);

    if (!transaction || transaction.transactionStatus !== "success") {
      return res.status(400).json({ error: "Transaction is missing or not successful" });
    }

    if (transaction.amount !== totalLiquidity) {
      return res.status(400).json({ error: "Transaction amount does not match total liquidity" });
    }

    // Create campaign
    const campaign = new Campaign({
      name,
      goals,
      kpi,
      targetNumber,
      publishers,
      targetAudience,
      industry,
      valuePerUser,
      valuePerUserAmount,
      totalLiquidity,
      website,
      xAccount,
      youtube,
      instagram,
      telegram,
      discord,
      otherSocials,
      otherInfo,
      media,
      userId: req.user._id,
      transactionId,
      startDate,
      endDate,
    });

    await campaign.save();

    res.status(201).json({ status: "success", campaignId: campaign._id });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
};

exports.updateCampaignStatus = async (req, res) => {
  try {
    const { campaignId, status } = req.body;

    if (!campaignId || !status) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const allowedStatuses = ["pending", "completed", "inactive", "active"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    campaign.status = status;
    await campaign.save();

    res.json({ status: "success", campaign });
  } catch (error) {
    console.error("Error updating campaign status:", error);
    res.status(500).json({ error: "Failed to update campaign status" });
  }
};

exports.getUserCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user._id });
    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
};

exports.getAllMarketplaceCampaigns = async (req, res) => {
    try {
      const campaigns = await Campaign.find({ status: "active" })
        .select(
          "name status publishers goals kpi targetNumber publishers valuePerUser valuePerUserAmount industry website xAccount media startDate endDate"
        )
        .sort({ createdAt: -1 });
  
      res.status(200).json({
        status: "success",
        results: campaigns.length,
        campaigns,
      });
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  };

