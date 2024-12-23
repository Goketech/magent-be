const express = require('express');
const router = express.Router();
const { register, login, googleAuth } = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimit');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);

module.exports = router;