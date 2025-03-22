const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");

const redisConnection = new Redis({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

const postQueue = new Queue("twitter-posts", { connection: redisConnection });

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
  { connection: redisConnection }
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
