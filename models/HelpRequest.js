const mongoose = require('mongoose');

const helpRequestSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    teamId: {
      type: String,
      required: true,
    },
    teamName: {
      type: String,
      required: true,
    },
    tableNumber: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['technical', 'hardware', 'power', 'food', 'network', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['open', 'claimed', 'resolved'],
      default: 'open',
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    claimedByName: {
      type: String,
      default: '',
    },
    claimedAt: Date,
    resolvedAt: Date,
    resolutionNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

helpRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HelpRequest', helpRequestSchema);
