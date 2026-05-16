const mongoose = require('mongoose');
const crypto = require('crypto');

const teamInviteSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    invitedBy: {
      type: String, // team lead name
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    usn: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    phone: { type: String, default: '' },
    college: { type: String, default: '' },
    year: { type: String, default: '' },
    branch: { type: String, default: '' },
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  { timestamps: true }
);

teamInviteSchema.index({ token: 1 });
teamInviteSchema.index({ teamId: 1, email: 1 });
teamInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TeamInvite', teamInviteSchema);
