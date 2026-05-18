const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema(
  {
    mealPass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealPass',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'redeemedByModel',
    },
    redeemedByModel: {
      type: String,
      enum: ['Admin', 'Team'],
      default: 'Admin',
    },
    method: {
      type: String,
      enum: ['qr_scan', 'manual_entry', 'tap_redeem'],
      default: 'manual_entry',
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: each team can redeem each pass only once
redemptionSchema.index({ mealPass: 1, team: 1 }, { unique: true });

module.exports = mongoose.model('Redemption', redemptionSchema);
