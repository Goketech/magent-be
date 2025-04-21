const postQueue = require("../shared/queue");
const Transaction = require("../models/Transaction");
const ContentHistory = require("../models/ContentHistory");

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
    transactionId,
  } = req.body;

  if (
    !topic ||
    !minInterval ||
    !maxInterval ||
    !duration ||
    !accessToken ||
    !firstStyle ||
    !secondStyle ||
    !transactionId
  ) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  // Verify transaction is successful
  const transaction = await Transaction.findById(transactionId);
  if (!transaction || transaction.transactionStatus !== "success") {
    return res.status(400).json({ error: "Valid transaction required" });
  }

  // Verify the user owns this transaction
  if (transaction.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const contentHistory = new ContentHistory({
    userId: req.user._id,
    status: "running",
    transactionId: transactionId,
    scheduleId: `schedule_${Date.now()}_${req.user._id}`,
  });

  await contentHistory.save();

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
  let postCount = 0;

  while (currentTime < endTime) {
    const delay =
      Math.ceil(maxInterval - minInterval + 1 + minInterval) * 60 * 60 * 1000; // Convert hours to milliseconds

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
            userId: req.user._id.toString(),
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
          {
            text: data[0].text,
            accessToken,
            userId: req.user._id.toString(),
            scheduleId: contentHistory.scheduleId,
          },
          { delay }
        );

        postCount++;
      }
    } catch (error) {
      console.error("Error generating AI content:", error);
    }
  }

  contentHistory.count = postCount;
  await contentHistory.save();

  res.json({
    message: "Scheduled successfully",
    scheduleId: contentHistory.scheduleId,
    postCount,
  });
};

exports.generatePost = async (req, res) => {
  const { topic, firstStyle, secondStyle } = req.body;

  if (!topic || !firstStyle || !secondStyle) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  let selectedTopic;

  if (topic.length === 1) {
    selectedTopic = topic[0].value;
  } else if (topic.length > 1) {
    selectedTopic = Math.random() < 0.5 ? topic[0].value : topic[1].value;
  } else {
    selectedTopic = 'Magent';
  }

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
        userId: req.user._id.toString(),
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

exports.cancelSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    if (!scheduleId) {
      return res.status(400).json({ error: "Missing scheduleId parameter" });
    }

    const contentHistory = await ContentHistory.findOne({
      scheduleId: scheduleId,
      userId: req.user._id,
    });

    if (!contentHistory) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    // Update content history status
    contentHistory.status = "cancelled";
    await contentHistory.save();

    // Get all pending jobs from the queue
    const jobs = await postQueue.getJobs(["waiting", "delayed"]);

    // Cancel all jobs associated with this schedule
    for (const job of jobs) {
      if (
        job.data.scheduleId === scheduleId &&
        job.data.userId === req.user._id.toString()
      ) {
        await job.remove();
      }
    }

    res.json({ message: "Schedule cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling schedule:", error);
    res.status(500).json({ error: "Failed to cancel schedule" });
  }
};

// Get user's content history
exports.getContentHistory = async (req, res) => {
  try {
    const contentHistory = await ContentHistory.find({ userId: req.user._id })
      .populate("transactionId")
      .sort({ createdAt: -1 });

    res.json(contentHistory);
  } catch (error) {
    console.error("Error fetching content history:", error);
    res.status(500).json({ error: "Failed to fetch content history" });
  }
};
