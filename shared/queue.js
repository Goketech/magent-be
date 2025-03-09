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
    const { text, accessToken } = job.data;

    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Failed to post on Twitter");
    }

    console.log("Post successful:", await response.json());
  },
  { connection: redisConnection }
);

module.exports = postQueue;
