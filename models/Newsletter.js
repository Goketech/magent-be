const mongoose = require("mongoose");

const newsLetterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    }
  },
  { timestamps: true }
);

const NewsLetter = mongoose.model("NewsLetter", newsLetterSchema);
module.exports = NewsLetter;
