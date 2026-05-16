const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      unique: true,
    },
    projectTitle: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: 200,
    },
    projectDescription: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    fileUrl: { type: String, default: '' },
    filePublicId: { type: String, default: '' },
    presentationUrl: { type: String, default: '' },
    presentationPublicId: { type: String, default: '' },
    githubUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    liveDemoUrl: { type: String, default: '' },
    additionalNotes: { type: String, default: '', maxlength: 2000 },
    isOverridden: { type: Boolean, default: false },
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    submittedAt: { type: Date, default: Date.now },
    isLate: { type: Boolean, default: false },
    // Evaluation
    evaluation: {
      score: { type: Number, default: null },
      maxScore: { type: Number, default: 100 },
      feedback: { type: String, default: '' },
      criteria: [{
        name: { type: String },
        score: { type: Number },
        maxScore: { type: Number, default: 10 },
        comment: { type: String, default: '' },
      }],
      evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      evaluatedAt: { type: Date },
      status: { type: String, enum: ['pending', 'evaluated', 'reviewed'], default: 'pending' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);
