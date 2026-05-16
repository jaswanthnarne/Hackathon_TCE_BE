const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    actionType: {
      type: String,
      required: true,
      enum: [
        'CREATE_TEAM', 'UPDATE_TEAM', 'DELETE_TEAM', 'BULK_DELETE_TEAMS',
        'ADD_MEMBER', 'UPDATE_MEMBER', 'REMOVE_MEMBER', 'CHANGE_LEAD',
        'APPROVE_TEAM', 'REJECT_TEAM', 'LOCK_TEAM', 'UNLOCK_TEAM',
        'RESET_PASSWORD', 'FORCE_PASSWORD_CHANGE',
        'APPROVE_PASSWORD_RESET', 'DENY_PASSWORD_RESET',
        'CREATE_QUESTION', 'UPDATE_QUESTION', 'DELETE_QUESTION',
        'BULK_IMPORT_QUESTIONS', 'DUPLICATE_QUESTION',
        'OVERRIDE_ANSWER', 'OVERRIDE_SCORE', 'OVERRIDE_SUBMISSION',
        'TIME_EXTENSION', 'RESET_ANSWERS',
        'CALCULATE_RESULTS', 'PUBLISH_RESULTS', 'UNPUBLISH_RESULTS',
        'EDIT_RESULT', 'DECLARE_WINNERS',
        'GENERATE_CERTIFICATES', 'EMAIL_CERTIFICATES',
        'CREATE_ANNOUNCEMENT', 'UPDATE_ANNOUNCEMENT', 'DELETE_ANNOUNCEMENT',
        'PIN_ANNOUNCEMENT',
        'SEND_EMAIL',
        'UPDATE_CONFIG', 'UPLOAD_LOGO', 'UPLOAD_BANNER',
        'ADMIN_LOGIN', 'ADMIN_LOGOUT',
        'EXPORT_REPORT',
        'OTHER',
      ],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    targetModel: {
      type: String,
      enum: ['Team', 'Question', 'TeamAnswer', 'Submission', 'Result', 'Announcement', 'HackathonConfig', 'PasswordResetRequest', 'Admin', null],
    },
    description: {
      type: String,
      default: '',
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    reason: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

adminActionLogSchema.index({ adminId: 1, createdAt: -1 });
adminActionLogSchema.index({ actionType: 1, createdAt: -1 });

module.exports = mongoose.model('AdminActionLog', adminActionLogSchema);
