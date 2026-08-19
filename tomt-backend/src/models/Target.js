const mongoose = require('mongoose');

// Ported from target.html's `futureGoalsTracker` localStorage array.
// Status ("Active"/"Overdue") is intentionally NOT stored - it's derived
// from targetDate on every read, exactly like the original's
// calculateStatus(targetDate) function, so it's always correct relative to
// "now" rather than going stale.
const targetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Target name is required.'],
      trim: true,
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required.'],
    },
    progressNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Target', targetSchema);
