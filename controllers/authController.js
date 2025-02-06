const jwt = require("jsonwebtoken");
const nacl = require("tweetnacl");
const bs58 = require("bs58");
const Redis = require("ioredis");

const User = require("../models/User");
const Plan = require("../models/Plan");

const NONCE_STORE = new Redis({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const register = async (req, res) => {
  try {
    const { businessName, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Get free plan
    const freePlan = await Plan.findOne({ name: "Free" });
    if (!freePlan) {
      return res.status(500).json({ message: "Default plan not found" });
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
    res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
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
    res.status(500).json({ message: "Google authentication failed" });
  }
};

const getNonce = async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey)
    return res.status(400).json({ error: "Public key is required" });

  const nonce = Math.random().toString(36).substring(2);
  NONCE_STORE.set(publicKey, nonce);

  res.json({ nonce });
};

const verifySignature = async (req, res) => {
  const { publicKey, signature } = req.body;

  if (!publicKey || !signature) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const nonce = NONCE_STORE.get(publicKey);
  if (!nonce) return res.status(400).json({ error: "Nonce not found" });

  const verified = nacl.sign.detached.verify(
    Buffer.from(nonce),
    bs58.decode(signature),
    bs58.decode(publicKey)
  );

  if (!verified) return res.status(401).json({ error: "Invalid signature" });

  let user = await User.findOne({ walletAddress: publicKey });

  if (!user) {
    const freePlan = await Plan.findOne({ name: "Free" });
    if (!freePlan) {
      return res.status(500).json({ message: "Default plan not found" });
    }

    user = new User({
      walletAddress: publicKey,
      plan: freePlan._id,
      planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await user.save();
  }

  // Issue JWT
  const token = jwt.sign({ publicKey }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

  res.json({ token });
};

module.exports = {
  register,
  login,
  getNonce,
  verifySignature,
  googleAuth,
};
