const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Plan = require("../models/Plan");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const register = async (req, res) => {
  try {
    const { businessName, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Get free plan
    const freePlan = await Plan.findOne({ name: "Free" });
    if (!freePlan) {
      return res.status(500).json({ error: "Default plan not found" });
    }

    const user = new User({
      businessName,
      email,
      password,
      plan: freePlan._id,
      planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
    });
    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { token } = req.body; // Verify this token with Google OAuth2
    // Implementation depends on your frontend setup
    // You'll need to verify the token and extract user information

    let user = await User.findOne({ email: googleEmail });

    if (!user) {
      const freePlan = await Plan.findOne({ name: "Free" });
      user = new User({
        businessName: googleName,
        email: googleEmail,
        googleId: googleId,
        plan: freePlan._id,
        planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await user.save();
    }

    const jwtToken = generateToken(user._id);
    res.json({ token: jwtToken });
  } catch (error) {
    res.status(500).json({ error: "Google authentication failed" });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
};
