const mongoose = require('mongoose');

// Ported from schedule.html's `dailyTasksData` localStorage array (this
// module - scheduleController.js) and reused by pending-tasks.html's "Move
// All to Today's Schedule" (pendingTaskController.js). One shared
// collection, exactly matching the original's shared `dailyTasksData` key
// that both pages read/wrote.
const scheduleTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    task: {
      type: String,
      required: [true, 'Task description is required.'],
      trim: true,
    },
    dueDate: {
      type: String, // "YYYY-MM-DD", matches the original's plain date string
      required: true,
    },
    time: {
      type: String, // "HH:MM" or "N/A", matches the original's plain time string
      default: 'N/A',
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'No Priority'],
      default: 'No Priority',
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduleTask', scheduleTaskSchema);
