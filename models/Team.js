const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  usn: { type: String, trim: true, uppercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  college: { type: String, trim: true, default: '' },
  year: { type: String, trim: true, default: '' },
  branch: { type: String, trim: true, default: '' },
  isLead: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
});

const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    teamName: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: 100,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    forcePasswordChange: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'locked'],
      default: 'pending',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockReason: {
      type: String,
      default: '',
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    teamLead: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      usn: { type: String, default: '', uppercase: true },
      phone: { type: String, default: '' },
      college: { type: String, default: '' },
      year: { type: String, default: '' },
      branch: { type: String, default: '' },
    },
    members: [memberSchema],
    passwordHistory: [
      {
        hash: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
    passwordResetRequested: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
    lastLoginIP: String,
    timeExtension: {
      extraMinutes: { type: Number, default: 0 },
      grantedAt: Date,
      grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      reason: String,
    },
    // Problem Statement Selection
    selectedProblem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProblemStatement',
      default: null,
    },
    selectionChangesLeft: {
      type: Number,
      default: 3,
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

// Hash password before save
teamSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
teamSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
teamSchema.methods.isAccountLocked = function () {
  if (this.isLocked) return true;
  if (this.lockUntil && this.lockUntil > Date.now()) return true;
  return false;
};

// Increment login attempts
teamSchema.methods.incrementLoginAttempts = async function () {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 15;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= maxAttempts) {
      this.lockUntil = new Date(Date.now() + lockDuration * 60 * 1000);
    }
  }
  await this.save();
};

// Reset login attempts
teamSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

// Index for searching
teamSchema.index({ teamId: 1 });
teamSchema.index({ teamName: 'text', 'teamLead.name': 'text', 'teamLead.email': 'text', 'members.usn': 'text' });

module.exports = mongoose.model('Team', teamSchema);
