const express = require("express");
const {
  schedulePost,
  generatePost,
  cancelSchedule,
  getContentHistory,
} = require("../controllers/postController");
const {
  schedulePostValidation,
  generatePostValidation,
  cancelScheduleValidation,
} = require("../middlewares/validators/postValidators");
const auth = require("../middlewares/auth");
const { globalLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/schedule-post", globalLimiter, auth, schedulePostValidation, schedulePost);
router.post("/sample-post", globalLimiter, auth, generatePostValidation, generatePost);
router.post("/cancel-schedule", globalLimiter, auth, cancelSchedule);
router.get("/content-history", globalLimiter, auth, cancelScheduleValidation, getContentHistory);

module.exports = router;
