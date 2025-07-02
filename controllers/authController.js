const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nacl = require("tweetnacl");
const bs58 = require("bs58");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const Plan = require("../models/Plan");
const { sendEmail } = require("../utils/email");
const redis = require("../utils/redis");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      userName,
      businessName,
      role,
      expertise,
      industry,
    } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (await User.findOne({ userName: userName })) {
      return res.status(400).json({ message: "Username already registered" });
    }

    // Get free plan
    const freePlan = await Plan.findOne({ name: "Free" });
    if (!freePlan) {
      return res.status(500).json({ message: "Default plan not found" });
    }

    const user = new User({
      userName: userName,
      businessName: businessName,
      industry: industry,
      expertise: expertise,
      accountType: role,
      email,
      password,
      plan: freePlan._id,
      planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
    });
    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.businessName || user.userName,
        picture: user.profilePicture,
        role: user.accountType,
        walletAddress: user.walletAddress || null,
        publisherCampaigns: user.publisherCampaigns || {},
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.businessName || user.userName,
        picture: user.profilePicture,
        role: user.accountType,
        walletAddress: user.walletAddress || null,
        publisherCampaigns: user.publisherCampaigns || {},
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { credential, isSignup = false, signupData = {} } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    // Verify the Google JWT token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const { email, name, picture, sub: googleId, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: "Google email not verified" });
    }

    // Check if user exists
    let user = await User.findOne({
      $or: [{ email: email }, { googleId: googleId }],
    });

    let isNewUser = false;

    if (!user) {
      // Check if this is a signup request
      if (!isSignup) {
        return res.status(404).json({
          message: "No account found with this email. Please sign up first.",
          shouldSignup: true,
        });
      }

      // Validate required signup data
      if (!signupData.role) {
        return res.status(400).json({ message: "Role is required for signup" });
      }

      // Get free plan
      const freePlan = await Plan.findOne({ name: "Free" });
      if (!freePlan) {
        return res.status(500).json({ message: "Default plan not found" });
      }

      // Generate username from email if not provided
      const baseUsername = email.split("@")[0];
      let userName = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (await User.findOne({ userName: userName })) {
        userName = `${baseUsername}${counter}`;
        counter++;
      }

      // Create new user
      user = new User({
        userName: userName,
        businessName:
          signupData.role === "advertiser"
            ? signupData.companyName || name
            : name,
        industry:
          signupData.role === "advertiser" ? signupData.industry : undefined,
        expertise:
          signupData.role === "publisher" ? signupData.expertise : undefined,
        accountType: signupData.role,
        email: email,
        googleId: googleId,
        profilePicture: picture,
        isEmailVerified: true, // Google emails are pre-verified
        plan: freePlan._id,
        planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      });

      await user.save();
      isNewUser = true;
    } else {
      // Update existing user's Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
      }

      // Update profile picture if available
      if (picture && !user.profilePicture) {
        user.profilePicture = picture;
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Return response
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.businessName || user.userName,
        picture: user.profilePicture,
        role: user.accountType,
        walletAddress: user.walletAddress || null,
        publisherCampaigns: user.publisherCampaigns || {},
      },
      isNewUser,
    });
  } catch (error) {
    console.error("Google authentication error:", error);

    if (error.message && error.message.includes("Token used too early")) {
      return res
        .status(400)
        .json({ message: "Invalid token timing. Please try again." });
    }

    res.status(500).json({ message: "Google authentication failed" });
  }
};

const getNonce = async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey)
    return res.status(400).json({ error: "Public key is required" });

  const nonce = Math.random().toString(36).substring(2);
  redis.set(publicKey, nonce);

  res.json({ nonce });
};

const verifySignature = async (req, res) => {
  try {
    const { publicKey, signature } = req.body;

    if (!publicKey || !signature) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const nonce = await redis.get(publicKey);
    if (!nonce) return res.status(400).json({ error: "Nonce not found" });

    const verified = nacl.sign.detached.verify(
      Buffer.from(nonce),
      bs58.default.decode(signature),
      bs58.default.decode(publicKey)
    );

    if (!verified) return res.status(401).json({ error: "Invalid signature" });

    let user = await User.findOne({ _id: req.user._id });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date(), walletAddress: publicKey } }
    );

    res.json({ token: publicKey });
  } catch (error) {
    console.error("Error in verifySignature:", error);
    return res.status(500).json({ error: "Failed to connect wallet" });
  }
};

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) {
    // don't reveal that email is unknown
    console.log("checking here");
    return res
      .status(200)
      .json({ message: "If that email exists, a reset link has been sent." });
  }

  // generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const key = `pwd-reset:${token}`;

  // store token → email, expire in 3600s (1 hr)
  await redis.set(key, email, "EX", 60 * 60);

  // build reset link
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

  // send styled HTML email
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333;">
      <!-- Banner -->
      <div style="background:#ffffff;padding:20px 0;text-align:center;border-bottom:1px solid #eee;">
        <img src="${
          process.env.COMPANY_LOGO_URL
        }" alt="Magent Logo" style="height:50px;" />
      </div>

      <!-- Hero section -->
      <div style="padding:40px 20px;text-align:center;background:#f9f9f9;">
        <h1 style="margin-bottom:0.5em;font-size:24px;">Reset your password</h1>
        <p style="margin:0;font-size:16px;">We received a request to reset the password for your account.</p>
      </div>

      <!-- Button -->
      <div style="padding:30px 20px;text-align:center;">
        <a
          href="${resetUrl}"
          style="display:inline-block;padding:12px 24px;font-size:16px;color:#fff;background:#330065;text-decoration:none;border-radius:4px;"
        >Reset Password</a>
      </div>

      <!-- Footer -->
      <div style="padding:20px 20px;font-size:12px;color:#888;text-align:center;border-top:1px solid #eee;">
        <p>If you didn’t request a password reset, please ignore this email.</p>
        <p>&copy; ${new Date().getFullYear()} Magent. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(email, "Magent — Password Reset", null, html);

  res
    .status(200)
    .json({ message: "If that email exists, a reset link has been sent." });
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token and new password are required" });
  }

  const key = `pwd-reset:${token}`;
  const email = await redis.get(key);
  if (!email) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    // should not happen, but just in case
    return res.status(400).json({ message: "Invalid token" });
  }

  // update password (assuming your User model hashes on save)
  user.password = newPassword;
  await user.save();

  // delete token so it can’t be reused
  await redis.del(key);

  res.status(200).json({ message: "Password successfully reset" });
};

module.exports = {
  register,
  login,
  getNonce,
  verifySignature,
  googleAuth,
  requestPasswordReset,
  resetPassword,
};
