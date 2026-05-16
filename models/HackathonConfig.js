const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  id: String,
  text: String,
  order: Number,
});

const scheduleSchema = new mongoose.Schema({
  id: String,
  time: String,
  title: String,
  description: { type: String, default: '' },
  venue: { type: String, default: '' },
  speaker: { type: String, default: '' },
  order: Number,
});

const prizeSchema = new mongoose.Schema({
  rank: Number,
  title: String,
  amount: { type: Number, default: 0 },
  description: { type: String, default: '' },
});

const featureSchema = new mongoose.Schema({
  icon: { type: String, default: 'code' },
  title: String,
  description: { type: String, default: '' },
});

const faqSchema = new mongoose.Schema({
  question: String,
  answer: String,
  order: { type: Number, default: 0 },
});

const sponsorSchema = new mongoose.Schema({
  name: String,
  logoUrl: { type: String, default: '' },
  website: { type: String, default: '' },
  tier: { type: String, enum: ['title', 'gold', 'silver', 'bronze', 'partner'], default: 'partner' },
});

const hackathonConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'TCE Hackathon',
    },
    tagline: {
      type: String,
      default: 'Code. Create. Conquer.',
    },
    description: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    registrationDeadline: {
      type: Date,
    },
    submissionDeadline: {
      type: Date,
    },
    venue: {
      collegeName: { type: String, default: 'TCE College' },
      hallName: { type: String, default: '' },
      address: { type: String, default: 'Gadag, Karnataka' },
      mapsLink: { type: String, default: '' },
    },
    mode: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      default: 'offline',
    },
    fee: {
      isFree: { type: Boolean, default: true },
      amount: { type: Number, default: 0 },
      paymentInstructions: { type: String, default: '' },
    },
    teamSettings: {
      minSize: { type: Number, default: 2 },
      maxSize: { type: Number, default: 5 },
    },
    questionSettings: {
      totalQuestions: { type: Number, default: 30 },
      timeLimit: { type: Number, default: 60 },
      negativeMarking: { type: Boolean, default: false },
      passingScore: { type: Number, default: 40 },
      randomizeOrder: { type: Boolean, default: true },
      shuffleOptions: { type: Boolean, default: true },
    },
    isRegistrationOpen: {
      type: Boolean,
      default: true,
    },
    isSubmissionOpen: {
      type: Boolean,
      default: false,
    },
    isProblemSelectionOpen: {
      type: Boolean,
      default: true,
    },
    isResultPublished: {
      type: Boolean,
      default: false,
    },
    isLeaderboardPublic: {
      type: Boolean,
      default: false,
    },
    rules: [ruleSchema],
    schedule: [scheduleSchema],
    prizes: [prizeSchema],
    socialLinks: {
      website: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },

    // Landing Page Configuration
    landingPage: {
      heroTitle: { type: String, default: 'Build the future.' },
      heroSubtitle: { type: String, default: 'One commit at a time.' },
      heroDescription: { type: String, default: 'Join elite developers, designers, and innovators to solve complex problems. 24 hours to engineer your vision, pitch your product, and win.' },
      ctaPrimaryText: { type: String, default: 'Register Team' },
      ctaSecondaryText: { type: String, default: 'Learn More' },
      aboutTitle: { type: String, default: 'The Hackathon' },
      aboutDescription: { type: String, default: '' },
      sprintDuration: { type: String, default: '24h' },
      scheduleDate: { type: String, default: '' },
      scheduleTime: { type: String, default: '' },
      venueName: { type: String, default: '' },
      venueAddress: { type: String, default: '' },
      venueMapUrl: { type: String, default: '' },
      features: [featureSchema],
      faqs: [faqSchema],
      sponsors: [sponsorSchema],
      showPrizes: { type: Boolean, default: true },
      showFAQ: { type: Boolean, default: true },
      showSchedule: { type: Boolean, default: true },
      showRules: { type: Boolean, default: true },
      showSponsors: { type: Boolean, default: false },
      showFeatures: { type: Boolean, default: true },
      footerText: { type: String, default: '' },
      contactEmail: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('HackathonConfig', hackathonConfigSchema);
