const mongoose = require('mongoose');

const problemStatementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    category: {
      type: String,
      required: true,
      default: 'General',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    expectedOutcome: {
      type: String,
      default: '',
    },
    techStack: {
      type: String,
      default: '',
    },
    resources: {
      type: String,
      default: '',
    },
    maxTeams: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    selectedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

problemStatementSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('ProblemStatement', problemStatementSchema);
