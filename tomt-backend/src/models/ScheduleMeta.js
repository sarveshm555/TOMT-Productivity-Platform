const mongoose = require('mongoose');

// Ported from schedule.html's `lastScheduleVisitDate` localStorage key -
// the single piece of state checkAndMigrateTasks() uses to detect a new
// day. One document per user.
const scheduleMetaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    lastVisitDate: {
      type: String, // "YYYY-MM-DD"
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduleMeta', scheduleMetaSchema);
