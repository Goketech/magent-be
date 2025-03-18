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
  Wake up to the reality that Magent is the Only A.I Marketing Co-pilot that will help you with faster and smarter marketing.  
  
  You know that long brainstorming sessions you have with your Marketing department just to identify your ideal customers? It's faster with Magent.  
  
  Who is your Ideal Customer? What are their pain points, interests, passion points? Enough of the guesswork, that's our bragging rights!  
  
  I guess you didn't know that Magent A.I can help you identify your market size and uncover industry trends.  
  
  Magent: Knock Knock,  
  You: Who's There?  
  Magent: The only  
  You: The only Who?  
  Magent: The only Marketing A.I you need.  
  
  It's time to phuck things up!  
  Take a break—let's create threads for you.  
  In fact, we will also run your digital advertising for you.  
  
  We won't say this twice, so listen up:  
  Move your advertising forward with our A.I-powered platform. Let's help you create, scale, and optimize your digital campaigns.  
  
  You should have gotten tired of jumping between meetings and monitoring multi-marketing platforms. Take a break—let's help you save time with A.I-powered marketing automation and management.  
  
  I know it gets frustrating when you have to make decisions with outdated data. But outdated data isn't the problem—you just haven't used Magent for real-time data updates.  
  
  Solana's first A.I solution empowers marketers with unprecedented control to take marketing to the next level—real-time insights with more transparency.  
  
  After running campaigns across multi-marketing platforms, did you forget that you have to compile reports, analyze, share recommendations, and repeat?  
  Hold my beer—I’ll do it all with just a click!  
  
  I heard some wannabe A.I-powered marketing platforms need you to request a demo first.  
  Hold my beer—let’s get started without a demo.  
  
  You are in November 2027 and still using data from December 2026. Do you think your audience is made of bots? They aren't the Ancient of Days, and their behaviors won’t wait for you.  
  It's time to phuck things up with real-time data updates.  
  
  Have you ever wondered what's hidden in your data? 👀 Sometimes, the real magic is between the lines. ✨  
  
  “Measure what matters.” Sounds easy, right? But what if you’re measuring the wrong things? 🤔 Time to rethink those KPIs.  
  
  Marketing is 50% creativity, 50% data, and 100% knowing how to connect the two. 🎨📊 What’s your go-to formula?  
  
  What’s cooler than crushing your goals? 🎯 Understanding exactly why you crushed them. Getting your data right is the real MVP. 🏆  
  
  Algorithms don’t sleep. Neither do opportunities. 🌙 Are you making the most of what your data is saying? 🧩  
  
  Not all data is created equal. The real question is: Which numbers actually matter to you? 🤔  
  
  Good marketing feels like magic. 🪄 But behind the curtain? Data, patterns, and strategy are doing all the work. 😉  
  
  Curious minds don’t stop at “what.” They ask “why.” Let Magent assist you in digging deeper into your data—your answers are waiting. 🔍✨  
  
  The future of marketing is at your fingertips. Want to see what that's like? Start by analyzing the patterns you see today. The answers are in the details. 🌌  
  
  Social media, email, SEO… your marketing channels are talking. The question is: Are you listening? 🎧  
  
  Data isn’t scary. Numbers aren’t enemies. Together, they’re the map that leads to smarter marketing. 🗺️✨  
  
  🚨 Fact: You’re sitting on a goldmine of untapped marketing insights. All you need to do is look closer. 👀  
  
  People don’t hate ads—they hate that your ads don't speak to them. 🛑 Understand your audience, and they’ll actually want to engage. 💬  
  
  What’s the story behind your website traffic? 📊 Every spike, drop, and trend has something to say. Listen carefully. 🧠  
  
  The best marketing isn’t loud. It’s smart, subtle, and hits exactly where it needs to. 🎯 What’s your next smart move? 💡  
  
  Your marketing data is like a puzzle 🧩—once you put it together, the full picture is always worth it.  
  
  Some see “numbers.” Others see “opportunities.” Which team are you on? 🧐  
  
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
    return res
      .status(400)
      .json({
        error:
          "Invalid duration: end time is before or equal to the start time.",
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

  Here are the sample posts to use as a guide:  
  
  ---
  Wake up to the reality that Magent is the Only A.I Marketing Co-pilot that will help you with faster and smarter marketing.  
  
  You know that long brainstorming sessions you have with your Marketing department just to identify your ideal customers? It's faster with Magent.  
  
  Who is your Ideal Customer? What are their pain points, interests, passion points? Enough of the guesswork, that's our bragging rights!  
  
  I guess you didn't know that Magent A.I can help you identify your market size and uncover industry trends.  
  
  Magent: Knock Knock,  
  You: Who's There?  
  Magent: The only  
  You: The only Who?  
  Magent: The only Marketing A.I you need.  
  
  It's time to phuck things up!  
  Take a break—let's create threads for you.  
  In fact, we will also run your digital advertising for you.  
  
  We won't say this twice, so listen up:  
  Move your advertising forward with our A.I-powered platform. Let's help you create, scale, and optimize your digital campaigns.  
  
  You should have gotten tired of jumping between meetings and monitoring multi-marketing platforms. Take a break—let's help you save time with A.I-powered marketing automation and management.  
  
  I know it gets frustrating when you have to make decisions with outdated data. But outdated data isn't the problem—you just haven't used Magent for real-time data updates.  
  
  Solana's first A.I solution empowers marketers with unprecedented control to take marketing to the next level—real-time insights with more transparency.  
  
  After running campaigns across multi-marketing platforms, did you forget that you have to compile reports, analyze, share recommendations, and repeat?  
  Hold my beer—I’ll do it all with just a click!  
  
  I heard some wannabe A.I-powered marketing platforms need you to request a demo first.  
  Hold my beer—let’s get started without a demo.  
  
  You are in November 2027 and still using data from December 2026. Do you think your audience is made of bots? They aren't the Ancient of Days, and their behaviors won’t wait for you.  
  It's time to phuck things up with real-time data updates.  
  
  Have you ever wondered what's hidden in your data? 👀 Sometimes, the real magic is between the lines. ✨  
  
  “Measure what matters.” Sounds easy, right? But what if you’re measuring the wrong things? 🤔 Time to rethink those KPIs.  
  
  Marketing is 50% creativity, 50% data, and 100% knowing how to connect the two. 🎨📊 What’s your go-to formula?  
  
  What’s cooler than crushing your goals? 🎯 Understanding exactly why you crushed them. Getting your data right is the real MVP. 🏆  
  
  Algorithms don’t sleep. Neither do opportunities. 🌙 Are you making the most of what your data is saying? 🧩  
  
  Not all data is created equal. The real question is: Which numbers actually matter to you? 🤔  
  
  Good marketing feels like magic. 🪄 But behind the curtain? Data, patterns, and strategy are doing all the work. 😉  
  
  Curious minds don’t stop at “what.” They ask “why.” Let Magent assist you in digging deeper into your data—your answers are waiting. 🔍✨  
  
  The future of marketing is at your fingertips. Want to see what that's like? Start by analyzing the patterns you see today. The answers are in the details. 🌌  
  
  Social media, email, SEO… your marketing channels are talking. The question is: Are you listening? 🎧  
  
  Data isn’t scary. Numbers aren’t enemies. Together, they’re the map that leads to smarter marketing. 🗺️✨  
  
  🚨 Fact: You’re sitting on a goldmine of untapped marketing insights. All you need to do is look closer. 👀  
  
  People don’t hate ads—they hate that your ads don't speak to them. 🛑 Understand your audience, and they’ll actually want to engage. 💬  
  
  What’s the story behind your website traffic? 📊 Every spike, drop, and trend has something to say. Listen carefully. 🧠  
  
  The best marketing isn’t loud. It’s smart, subtle, and hits exactly where it needs to. 🎯 What’s your next smart move? 💡  
  
  Your marketing data is like a puzzle 🧩—once you put it together, the full picture is always worth it.  
  
  Some see “numbers.” Others see “opportunities.” Which team are you on? 🧐  
  
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
