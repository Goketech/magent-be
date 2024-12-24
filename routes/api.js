const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const planCheck = require("../middlewares/planCheck");

const hostName = process.env.HOST_NAME;
const serverPort = process.env.SERVER_PORT;
const agentId = process.env.AGENT_ID;

const validateInput = (req, res, next) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Input field is required",
    });
  }

  if (typeof input !== "string") {
    return res.status(400).json({
      error: "Bad Request",
      message: "Input must be a string",
    });
  }

  if (input.trim().length === 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Input cannot be empty",
    });
  }

  next();
};

router.post(
  "/ai/query",
  auth,
  planCheck("aiCalls", validateInput),
  async (req, res) => {
    try {
      // Increment AI call usage
      req.user.usage.aiCalls.count += 1;
      await req.user.save();
      console.log("AI call req.body:", req.body);
      const { input } = req.body;
      console.log("AI call input:", input);
      // Your AI endpoint call logic here
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

    } catch (error) {
      console.error("AI call failed:", error);
      res.status(500).json({ error: "AI call failed" });
    }
  }
);

module.exports = router;
