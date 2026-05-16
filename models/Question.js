const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
});

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  isHidden: { type: Boolean, default: false },
});

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
    },
    questionType: {
      type: String,
      enum: [
        'mcq-single',
        'mcq-multiple',
        'true-false',
        'coding',
        'debugging',
        'output-prediction',
        'subjective',
        'fill-blank',
      ],
      required: [true, 'Question type is required'],
    },
    options: [optionSchema],
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
    },
    marks: {
      type: Number,
      required: [true, 'Marks is required'],
      min: 0,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      enum: [
        'Arrays',
        'Pointers',
        'Functions',
        'Loops',
        'Structures',
        'Strings',
        'Recursion',
        'Dynamic Memory',
        'File Handling',
        'General',
      ],
      default: 'General',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    round: {
      type: String,
      enum: ['Prelims', 'Finals', 'Both'],
      default: 'Both',
    },
    explanation: {
      type: String,
      default: '',
    },
    hint: {
      type: String,
      default: '',
    },
    codeSnippet: {
      type: String,
      default: '',
    },
    expectedOutput: {
      type: String,
      default: '',
    },
    testCases: [testCaseSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ questionType: 1, category: 1, difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
