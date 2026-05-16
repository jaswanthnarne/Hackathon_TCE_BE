const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    requestedEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
