const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: [{
      type: String,
    }],
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
    },
    type: {
      type: String,
      enum: ['credentials', 'approval', 'rejection', 'password_reset', 'password_denied', 
             'submission_confirm', 'results', 'certificate', 'announcement', 'custom'],
      default: 'custom',
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
    },
    sentBy: {
      type: String,
      default: 'system',
    },
    error: {
      type: String,
      default: '',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index({ sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
