const postQueue = require("../shared/queue");

const hostName = process.env.HOST_NAME;
const serverPort = process.env.SERVER_PORT;
const agentId = process.env.AGENT_ID;

exports.schedulePost = async (req, res) => {
  const {
    topic,
    secondTopic,
    firstStyle,
    secondStyle,
    minInterval,
    maxInterval,
    duration,
    accessToken,
  } = req.body;

  if (
    !topic ||
    !minInterval ||
    !maxInterval ||
    !duration ||
    !accessToken ||
    !firstStyle ||
    !secondStyle
  ) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const input = `Generate a precise and engaging tweet on these topics: "${topic}" and "${secondTopic}". The tweet should blend the styles of "${firstStyle}" and "${secondStyle}". Ensure it is clear, concise, concrete, correct, complete, courteous, and coherent.
    Limit the character length of the tweet to 280 characters. No hashtags allowed. Do not ask any questions in the tweet.`;

  const startTime = Date.now();
  const endTime = startTime + duration * 60 * 60 * 1000; // Convert hours to milliseconds
  let currentTime = startTime;

  while (currentTime < endTime) {
    const delay =
      Math.floor(
        Math.random() * (maxInterval - minInterval + 1) + minInterval
      ) *
      60 *
      60 *
      1000; // Convert minutes to milliseconds

    currentTime += delay;

    if (currentTime > endTime) break; // Ensure posts don't exceed the duration

    try {
      const response = await fetch(
        `http://${hostName}:${serverPort}/${agentId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: input,
            userId: "user",
            userName: "User",
          }),
        }
      );

      console.log("AI call response:", response);

      const reader = response.body.getReader();
      let result = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      // Parse the result as JSON
      const data = JSON.parse(result);
      console.log("AI-generated data:", data);

      if (data[0].text) {
        await postQueue.add(
          "twitter-post",
          { text: data[0].text, accessToken },
          { delay }
        );
      }
    } catch (error) {
      console.error("Error generating AI content:", error);
    }
  }

  res.json({ message: "Scheduled successfully" });
};

exports.generatePost = async (req, res) => {
  const { topic, secondTopic, firstStyle, secondStyle } = req.body;

  const input = `Generate a precise and engaging tweet on these topics: "${topic}" and "${secondTopic}". The tweet should blend the styles of "${firstStyle}" and "${secondStyle}". Ensure it is clear, concise, concrete, correct, complete, courteous, and coherent.
    Limit the character length of the tweet to 280 characters. No hashtags allowed. Do not ask any questions in the tweet.`;

  const response = await fetch(
    `http://${hostName}:${serverPort}/${agentId}/message`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input,
        userId: "user",
        userName: "User",
      }),
    }
  );

  console.log("AI call response:", response);

  const reader = response.body.getReader();
  let result = "";
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  // Parse the result as JSON
  const data = JSON.parse(result);
  console.log("AI call data:", data);
  return res.json(data);
};
