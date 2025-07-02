const { Queue, Worker } = require("bullmq");
const redis = require('../utils/redis');
const ContentHistory = require("../models/ContentHistory");

const postQueue = new Queue("twitter-posts", { connection: redis });

const worker = new Worker(
  "twitter-posts",
  async (job) => {
    const { text, accessToken, userId, scheduleId } = job.data;

    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    console.log("Post response:", response);

    if (!response.ok) {
      console.error("Post failed:", await response.json());
      throw new Error("Failed to post on Twitter");
    }

    const responseData = await response.json();
    console.log("Post successful:", responseData);

    if (scheduleId) {
      const contentHistory = await ContentHistory.findOne({
        scheduleId: scheduleId,
      });
      if (contentHistory) {
        contentHistory.text = text;
        await contentHistory.save();
      }
    }

    return responseData;
  },
  { connection: redis }
);

worker.on("completed", async (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);

  // Update content history if the job failed
  const { scheduleId } = job.data;
  if (scheduleId) {
    const contentHistory = await ContentHistory.findOne({
      scheduleId: scheduleId,
    });
    if (contentHistory && contentHistory.status !== "cancelled") {
      contentHistory.status = "failed";
      await contentHistory.save();
    }
  }
});

module.exports = postQueue;
