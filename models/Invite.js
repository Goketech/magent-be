const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
  });
  
  module.exports = mongoose.model('Invite', inviteSchema);