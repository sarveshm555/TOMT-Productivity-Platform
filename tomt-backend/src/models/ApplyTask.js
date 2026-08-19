const mongoose = require('mongoose');

// Ported from needtoapply.html's `applyTasks` localStorage array. Kept as
// its own collection (distinct from OngoingTask) rather than merged with a
// `stage` field as Phase 2's initial sketch proposed - the two original
// pages have genuinely different fields (this one has `applied`; ongoing
// has `msg` + `completed`) and were always separate localStorage keys, so
// two collections is the more faithful, simpler mapping.
const applyTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Application Name is required.'],
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required.'],
    },
    link: {
      type: String,
      required: [true, 'Link is required.'],
      trim: true,
    },
    applied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApplyTask', applyTaskSchema);
