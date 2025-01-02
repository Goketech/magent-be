const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests, please try again later' }
  });
};

module.exports = {
  globalLimiter: createRateLimiter(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  authLimiter: createRateLimiter(60 * 60 * 1000, 10) // 5 login attempts per hour
};