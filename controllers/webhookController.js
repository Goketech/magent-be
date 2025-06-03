const Campaign = require("../models/Campaign");
const verifyQueue = require("../shared/verify.processor");
const { getAssociatedTokenAddressSync } = require("@solana/spl-token");
const { PublicKey } = require("@solana/web3.js");

const USDC_MINT = new PublicKey(process.env.USDC_MINT);

/**
 *  WAITLIST WEBHOOK
 *
 *  Body JSON:
 *    {
 *      campaignId: 1678854323456,
 *      referralCode: "ABCD1234"
 *    }
 *
 *  Workflow:
 *   1) Lookup Campaign by campaignId. If not found or not active, return error.
 *   2) Find the publisher entry by referralCode. If not found, return error.
 *   3) Check if campaign still has budget and slots (publisherCount < targetNumber).
 *   4) Increment publisher.referralCount and campaign.publisherCount.
 *   5) Calculate remainingBudget = totalLiquidity - spent.
 *      If remainingBudget >= valuePerUserAmount AND publisherCount <= targetNumber:
 *        → queue a job to pay out publisher.
 *      Else:
 *        → mark campaign.status = "completed" (if publisherCount >= targetNumber)
 *           or "inactive" (if budget exhausted).
 *   6) Save campaign and return 200.
 */
// router.post(
//   "/waitlist",
//   verifyWebhookSecret,
exports.waitlistWebhook = async (req, res) => {
  try {
    const { campaignId, referralCode } = req.body;
    if (!campaignId || !referralCode) {
      return res.status(400).json({ error: "Missing payload fields" });
    }

    // 1) Fetch campaign
    const campaign = await Campaign.findOne({ campaignId });
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    if (campaign.status !== "active") {
      return res.status(400).json({ error: "Campaign not active" });
    }

    // 2) Find publisher by referralCode
    const publisher = campaign.publishers.find(
      (p) => p.referralCode === referralCode
    );
    if (!publisher) {
      return res.status(404).json({ error: "Publisher not in campaign" });
    }

    // 3) Check if campaign still has “slots” & budget
    if (campaign.publisherCount >= campaign.targetNumber) {
      campaign.status = "completed";
      await campaign.save();
      return res.status(400).json({ error: "Campaign target reached" });
    }
    if (
      campaign.spent + campaign.valuePerUserAmount >
      campaign.totalLiquidity
    ) {
      campaign.status = "inactive";
      await campaign.save();
      return res.status(400).json({ error: "Insufficient campaign budget" });
    }

    // 4) Increment counts
    publisher.referralCount += 1;
    campaign.publisherCount += 1;

    // 5) After increment, check again if we need to mark campaign completed
    let justCompleted = false;
    if (campaign.publisherCount >= campaign.targetNumber) {
      campaign.status = "completed";
      justCompleted = true;
    }

    // 6) Queue a payout job (if still budget remains)
    const remainingBudget = campaign.totalLiquidity - campaign.spent;
    if (remainingBudget >= campaign.valuePerUserAmount) {
      // We will pay out “valuePerUserAmount − 2%” on-chain to the publisher’s wallet
      // We need their USDC ATA for that:
      const userPubkey = new PublicKey(publisher.wallet);
      const recipientAta = getAssociatedTokenAddressSync(
        USDC_MINT,
        userPubkey,
        false
      ).toBase58();

      // Enqueue a job with { campaignId, referralCode, recipientAta }
      await verifyQueue.add({
        campaignId,
        referralCode,
        recipientAta,
      });
    } else {
      // If this branch is taken, budget is too small for even one more payout
      campaign.status = "inactive";
    }

    // 7) Save updated campaign state
    await campaign.save();

    return res.json({
      status: "received",
      campaignId,
      referralCode,
      publisherCount: campaign.publisherCount,
      remainingBudget: campaign.totalLiquidity - campaign.spent,
      campaignStatus: campaign.status,
    });
  } catch (error) {
    console.error("Error in waitlist webhook:", error);
    return res.status(500).json({ error: error.message });
  }
};
