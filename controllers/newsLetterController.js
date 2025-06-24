const NewsLetter = require("../models/Newsletter");

const register = async (req, res) => {
  try {
    const { email } = req.body;

    if (await NewsLetter.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const newsLetter = new NewsLetter({
      email,
    });
    await newsLetter.save();

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

module.exports = {
  register,
};
