const mongoose = require('mongoose');

const mealPassSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Meal pass name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'beverage', 'other'],
      default: 'other',
    },
    activeFrom: {
      type: Date,
      required: [true, 'Active start time is required'],
    },
    activeUntil: {
      type: Date,
      required: [true, 'Active end time is required'],
    },
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

// Virtual: check if currently within active window
mealPassSchema.virtual('isCurrentlyActive').get(function () {
  const now = new Date();
  return this.isActive && now >= this.activeFrom && now <= this.activeUntil;
});

mealPassSchema.set('toJSON', { virtuals: true });
mealPassSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MealPass', mealPassSchema);
