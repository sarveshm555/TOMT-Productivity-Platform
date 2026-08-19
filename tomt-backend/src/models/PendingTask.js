const mongoose = require('mongoose');

// Ported from pending-tasks.html's `pastPendingTasksData` localStorage array.
const pendingTaskSchema = new mongoose.Schema(
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
      type: String, // kept as the original's plain "YYYY-MM-DD" string / '' - no time component
      default: '',
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

module.exports = mongoose.model('PendingTask', pendingTaskSchema);
