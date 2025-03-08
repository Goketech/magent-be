const express = require("express");
const { schedulePost, generatePost } = require("../controllers/postController");

const router = express.Router();

router.post("/schedule-post", schedulePost);
router.post("/sample-post", generatePost);


module.exports = router;