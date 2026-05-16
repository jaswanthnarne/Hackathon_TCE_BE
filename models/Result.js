const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      unique: true,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
    },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        answer: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        marksAwarded: Number,
      },
    ],
    isWinner: {
      type: Boolean,
      default: false,
    },
    awardTitle: {
      type: String,
      default: '',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    certificateUrl: {
      type: String,
      default: '',
    },
    certificateGeneratedAt: Date,
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Result', resultSchema);
