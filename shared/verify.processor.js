// workers/verify.processor.js
const { Queue, Worker } = require("bullmq");
const Campaign = require("../models/Campaign");
const SolanaService = require("../services/solana.service");

const redisConnection = new Redis({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

const verifyQueue = new Queue("verifyQueue", { connection: redisConnection });

const worker = new Worker("verifyQueue", async (job) => {
  const { campaignId, referralCode, recipientAta } = job.data;

  console.log(
    `Processing payout for campaign ${campaignId}, ref=${referralCode}`
  );

  // 1) Fetch campaign
  const campaign = await Campaign.findOne({ campaignId });
  if (!campaign) {
    throw new Error("Campaign not found in worker");
  }

  // 2) Find publisher by referralCode
  const publisher = campaign.publishers.find(
    (p) => p.referralCode === referralCode
  );
  if (!publisher) {
    throw new Error("Publisher not found in worker");
  }

  // 3) Double-check we haven’t already paid them for this referral
  //    In this design, `publisher.paidOut / valuePerUserAmount` = number of referrals paid so far.
  //    If `publisher.referralCount * valuePerUserAmount <= publisher.paidOut`, skip.
  const alreadyPaidReferrals = Math.floor(
    publisher.paidOut / campaign.valuePerUserAmount
  );
  if (publisher.referralCount <= alreadyPaidReferrals) {
    // Nothing to do—either duplicate job or they’ve already been paid this referral.
    console.log(`No new referrals to pay for ref=${referralCode}`);
    return Promise.resolve();
  }

  // 4) Check budget one more time
  if (campaign.spent + campaign.valuePerUserAmount > campaign.totalLiquidity) {
    // Budget exhausted; mark campaign inactive
    campaign.status = "inactive";
    await campaign.save();
    throw new Error("Budget exhausted in worker");
  }

  // 5) Call on‐chain rewardUser
  try {
    await SolanaService.rewardUserOnChain(campaignId, recipientAta);
  } catch (err) {
    console.error("On‐chain rewardUser failed:", err);
    throw err;
  }

  // 6) Update spent & publisher.paidOut
  campaign.spent += campaign.valuePerUserAmount;
  publisher.paidOut += campaign.valuePerUserAmount;

  // 7) If campaign now exhausted or publisherCount ≥ targetNumber, mark completed
  if (
    campaign.spent >= campaign.totalLiquidity ||
    campaign.publisherCount >= campaign.targetNumber
  ) {
    campaign.status = "completed";
  }

  await campaign.save();
  console.log(
    `✅ Paid out ${campaign.valuePerUserAmount} to publisher ${referralCode}`
  );
  return Promise.resolve();
});

module.exports = verifyQueue;
