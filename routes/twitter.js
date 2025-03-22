const express = require("express");
const {
  schedulePost,
  generatePost,
  cancelSchedule,
  getContentHistory,
} = require("../controllers/postController");
const auth = require("../middlewares/auth");
const { globalLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/schedule-post", globalLimiter, auth, schedulePost);
router.post("/sample-post", globalLimiter, auth, generatePost);
router.post("/cancel-schedule", globalLimiter, auth, cancelSchedule);
router.get("/content-history", globalLimiter, auth, getContentHistory);

module.exports = router;
