const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const planCheck = require('../middlewares/planCheck');

router.post('/ai/query',
  auth,
  planCheck('aiCalls'),
  async (req, res) => {
    try {
      // Increment AI call usage
      req.user.usage.aiCalls.count += 1;
      await req.user.save();

      // Your AI endpoint call logic here
      
      res.json({ result: 'AI response' });
    } catch (error) {
      res.status(500).json({ error: 'AI call failed' });
    }
  }
);

module.exports = router;