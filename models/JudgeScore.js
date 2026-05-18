const mongoose = require('mongoose');

const judgeScoreSchema = new mongoose.Schema(
  {
    judge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    scores: {
      innovation: { type: Number, min: 0, max: 10, default: 0 },
      technicalComplexity: { type: Number, min: 0, max: 10, default: 0 },
      uiux: { type: Number, min: 0, max: 10, default: 0 },
      businessViability: { type: Number, min: 0, max: 10, default: 0 },
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
    totalWeighted: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Each judge can score each team only once (upsert pattern)
judgeScoreSchema.index({ judge: 1, team: 1 }, { unique: true });

// Pre-save: compute weighted total (default weights: 30% innovation, 25% tech, 25% uiux, 20% business)
judgeScoreSchema.pre('save', function (next) {
  const s = this.scores;
  this.totalWeighted = (s.innovation * 0.3) + (s.technicalComplexity * 0.25) + (s.uiux * 0.25) + (s.businessViability * 0.2);
  this.totalWeighted = Math.round(this.totalWeighted * 100) / 100;
  next();
});

module.exports = mongoose.model('JudgeScore', judgeScoreSchema);
