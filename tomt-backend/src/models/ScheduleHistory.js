const mongoose = require('mongoose');

// Ported from schedule.html's `scheduleHistoryData` localStorage array,
// reused by pending-tasks.html's completeTask() - both original pages
// wrote into this same shared key. `completedAt` replaces the original's
// two redundant fields (`completedDateString` - a pre-formatted string -
// and `completedTime` - a raw Date.now() ms number) with a single real
// Date; each page's history view formats it independently using that
// page's own original format string (see scheduleController.js /
// pendingTaskController.js), which is actually a fidelity IMPROVEMENT over
// the original: since both original pages wrote to the same array with
// two different format strings, whichever page completed a task last
// silently determined how it displayed everywhere. Storing the raw
// timestamp and formatting per-view removes that inconsistency while
// still rendering each page exactly as it originally intended.
const scheduleHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    task: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'No Priority'],
      default: 'No Priority',
    },
    completedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduleHistory', scheduleHistorySchema);
