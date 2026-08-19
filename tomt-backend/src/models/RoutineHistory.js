const mongoose = require('mongoose');

// Ported from health-routine.html's `healthLogHistory` and
// professional-routine.html's `proRoutineLogHistory` - identical storage
// shape (an array of {date, data}), one collection discriminated by
// `routineType`. `data` stays Mixed since its keys are fully
// user-defined (driven by RoutineConfig's custom queries), exactly like
// the original's dynamically-keyed entry objects.
const routineHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    routineType: {
      type: String,
      enum: ['health', 'professional'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoutineHistory', routineHistorySchema);
