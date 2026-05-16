const mongoose = require('mongoose');

const teamAnswerSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    marksAwarded: {
      type: Number,
      default: 0,
    },
    isOverridden: {
      type: Boolean,
      default: false,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    overrideReason: {
      type: String,
      default: '',
    },
    overriddenAt: Date,
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now,
    },
    isMarkedForReview: {
      type: Boolean,
      default: false,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

teamAnswerSchema.index({ teamId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('TeamAnswer', teamAnswerSchema);
