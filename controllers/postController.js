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

  const selectedTopic = Math.random() < 0.5 ? topic : secondTopic;

  const input = `Generate a precise and engaging tweet on this topic: "${selectedTopic}". The tweet should blend the styles of "${firstStyle}" and "${secondStyle}" while strictly following the tone, structure, and approach of the provided sample posts. 

  Here are the sample posts to use as a guide:  
  
  ---

  I guess you didn't know that Magent A.I can help you identify your market size and uncover industry trends.     
  The best marketing isn’t about shouting louder; it’s about knowing exactly who to whisper to. 🤫📈  
  Ever feel like your audience is speaking a language you don’t understand? 🗣️ Data is the translator you’ve been waiting for. 🌟  
  Transparency + insights = progress. Dive deeper into what matters and build real connections. ✨  
  The power of insights transforms decisions. Always remember: Smart strategy starts with clarity. 📊  
  ---
  
  - **DO NOT reuse or post any of the sample posts above.** Instead, use them as a reference for style, tone, and engagement.  
  - The response must be **clear, concise, correct, complete, courteous, and coherent** while keeping the same impactful and engaging tone.  
  - **Limit the tweet to 280 characters.**  
  - **No hashtags allowed.**  
  - **DO NOT ask follow-up questions, seek input from users, or include engagement prompts (e.g., 'What do you think?').**  
  - **Ensure it follows the given writing style but remains original.**`;

  const startTime = Date.now();
  const endTime = startTime + duration * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  if (startTime >= endTime) {
    return res.status(400).json({
      error: "Invalid duration: end time is before or equal to the start time.",
    });
  }
  let currentTime = startTime;

  while (currentTime < endTime) {
    const delay =
      Math.floor(
        Math.random() * (maxInterval - minInterval + 1) + minInterval
      ) *
      60 *
      60 *
      1000; // Convert hours to milliseconds

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

  const selectedTopic = Math.random() < 0.5 ? topic : secondTopic;

  const input = `Generate a precise and engaging tweet on this topic: "${selectedTopic}". The tweet should blend the styles of "${firstStyle}" and "${secondStyle}" while strictly following the tone, structure, and approach of the provided sample posts. 
  The best marketing isn’t loud. It’s smart, subtle, and hits exactly where it needs to. 🎯 What’s your next smart move? 💡  
  Your marketing data is like a puzzle 🧩—once you put it together, the full picture is always worth it.  
  The best marketing isn’t about shouting louder; it’s about knowing exactly who to whisper to. 🤫📈  
  Ever feel like your audience is speaking a language you don’t understand? 🗣️ Data is the translator you’ve been waiting for. 🌟  
  Transparency + insights = progress. Dive deeper into what matters and build real connections. ✨  
  The power of insights transforms decisions. Always remember: Smart strategy starts with clarity. 📊  
  ---
  
  - **DO NOT reuse or post any of the sample posts above.** Instead, use them as a reference for style, tone, and engagement.  
  - The response must be **clear, concise, correct, complete, courteous, and coherent** while keeping the same impactful and engaging tone.  
  - **Limit the tweet to 280 characters.**  
  - **No hashtags allowed.**  
  - **DO NOT ask follow-up questions, seek input from users, or include engagement prompts (e.g., 'What do you think?').**  
  - **Ensure it follows the given writing style but remains original.**`;

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
