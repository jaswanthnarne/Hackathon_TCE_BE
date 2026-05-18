const mongoose = require('mongoose');

const challengeSubmissionSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  teamId: { type: String, required: true },
  teamName: { type: String, required: true },
  proof: { type: String, required: true, trim: true }, // link or text
  submittedAt: { type: Date, default: Date.now },
  isWinner: { type: Boolean, default: false },
});

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Challenge description is required'],
      trim: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    reward: {
      type: {
        type: String,
        enum: ['badge', 'coupon', 'swag'],
        default: 'badge',
      },
      name: {
        type: String,
        default: 'Challenge Winner',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    submissions: [challengeSubmissionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Challenge', challengeSchema);
