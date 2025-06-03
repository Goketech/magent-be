const Campaign = require("../models/Campaign");
const Transaction = require("../models/Transaction");
const Verification = require("../services/verification.service");
const SolanaService = require("../services/solana.service");

/**
 * Utility: Generate an 8‐character uppercase alphanumeric referral code.
 */
function generateReferralCode() {
  return crypto.randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
}

exports.createCampaign = async (req, res) => {
  try {
    let {
      name,
      goals,
      kpi,
      targetNumber,
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
      !name ||
      !goals ||
      !targetNumber ||
      !targetAudience ||
      !targetAudience.age ||
      !targetAudience.gender ||
      !industry ||
      !valuePerUser ||
      !valuePerUserAmount ||
      !totalLiquidity ||
      !website ||
      !xAccount ||
      !transactionId ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const toLower = (val) =>
      typeof val === "string" ? val.toLowerCase().trim() : val;

    name = toLower(name);
    goals = toLower(goals);
    kpi = toLower(kpi);
    industry = toLower(industry);
    valuePerUser = toLower(valuePerUser);
    website = toLower(website);
    xAccount = toLower(xAccount);
    youtube = toLower(youtube);
    instagram = toLower(instagram);
    telegram = toLower(telegram);
    discord = toLower(discord);
    otherSocials = toLower(otherSocials);
    otherInfo = toLower(otherInfo);

    // Normalize targetAudience.gender
    if (targetAudience && typeof targetAudience.gender === "string") {
      targetAudience.gender = toLower(targetAudience.gender);
    }

    // If goal is engagement, kpi is required
    if (goals === "engagement" && !kpi) {
      return res
        .status(400)
        .json({ error: "KPI is required for engagement campaigns" });
    }

    if (valuePerUserAmount * Number(targetNumber) > totalLiquidity) {
      return res.status(400).json({
        error: "Total Liquidity is not enough to fund the campaign",
      });
    }

    // Validate transaction
    const transaction = await Transaction.findById(transactionId);

    if (!transaction || transaction.transactionStatus !== "success") {
      return res
        .status(400)
        .json({ error: "Transaction is missing or not successful" });
    }

    if (transaction.amount !== totalLiquidity) {
      return res
        .status(400)
        .json({ error: "Transaction amount does not match total liquidity" });
    }

    // Generate a unique campaignId
    const campaignId = Date.now();

    // Create campaign
    const campaign = new Campaign({
      name,
      goals,
      kpi: goals === "engagement" ? kpi : null,
      targetNumber,
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
      campaignId,
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

    await SolanaService.initializeCampaignOnChain(
      campaignId,
      valuePerUserAmount,
      targetNumber
    );

    return res.status(201).json({ status: "success", campaign });
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
    const campaigns = await Campaign.find({
      status: { $in: ["active", "completed"] },
    })
      .select(
        "name status publishers goals kpi targetNumber targetAudience totalLiquidity publishers valuePerUser valuePerUserAmount industry website xAccount media startDate endDate"
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

/**
 * Publisher joins a campaign:
 *  - Check that campaign is active and not full.
 *  - Generate a unique referralCode for this publisher.
 *  - Save { wallet, referralCode, referralCount:0, paidOut:0 } into campaign.publishers.
 *  - Return the referralCode and campaign details to the publisher.
 */
exports.joinCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { wallet } = req.body; // publisher’s Solana wallet (string)
    if (!wallet) {
      return res.status(400).json({ error: "Missing wallet" });
    }

    const campaign = await Campaign.findOne({ campaignId });
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    if (campaign.status !== "active") {
      return res.status(400).json({ error: "Cannot join this campaign" });
    }

    // Check if wallet already joined
    let publisher = campaign.publishers.find((p) => p.wallet === wallet);
    if (publisher) {
      // Already joined: return existing referralCode
      return res.json({
        status:       "already_joined",
        campaignId,
        referralCode: publisher.referralCode,
        campaignName: campaign.name,
        goals:        campaign.goals,
        valuePerUserAmount: campaign.valuePerUserAmount,
        targetNumber: campaign.targetNumber,
        publisherCount: campaign.publisherCount,
        remainingBudget: campaign.totalLiquidity - campaign.spent,
      });
    }

    // 1) Generate a unique referralCode
    let referralCode = generateReferralCode();
    // Ensure uniqueness within this campaign
    while (campaign.publishers.some((p) => p.referralCode === referralCode)) {
      referralCode = generateReferralCode();
    }

    // 2) Add publisher to campaign.publishers
    publisher = {
      wallet,
      referralCode,
      referralCount: 0,
      paidOut:       0,
    };
    campaign.publishers.push(publisher);
    await campaign.save();

    // 3) Return the code + campaign summary
    return res.status(201).json({
      status:       "joined",
      campaignId,
      referralCode,
      campaignName: campaign.name,
      goals:        campaign.goals,
      valuePerUserAmount: campaign.valuePerUserAmount,
      targetNumber: campaign.targetNumber,
      publisherCount: campaign.publisherCount,
      remainingBudget: campaign.totalLiquidity - campaign.spent,
    });
  } catch (error) {
    console.error("Error in joinCampaign:", error);
    return res.status(500).json({ error: error.message });
  }
};
