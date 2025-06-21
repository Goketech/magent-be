const axios = require('axios');

const verifyRecaptcha = async (req, res, next) => {
  try {
    const { captchaToken } = req.body;

    // Check if captcha token is provided
    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA token is required'
      });
    }

    // Verify the reCAPTCHA token with Google
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: captchaToken,
        remoteip: req.ip || req.connection.remoteAddress
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { success, score, action } = response.data;

    // For reCAPTCHA v2, we only need to check if success is true
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed. Please try again.'
      });
    }

    // If verification successful, continue to next middleware
    next();

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'reCAPTCHA verification failed due to server error'
    });
  }
};

module.exports = { verifyRecaptcha };
