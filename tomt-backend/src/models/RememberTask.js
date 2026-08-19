const mongoose = require('mongoose');

// Ported from remember_block.html's `rememberActiveTasks` +
// `rememberHistoryTasks` localStorage arrays. The original used two
// separate arrays and moved an item between them on complete; this uses
// one collection with a `status` field instead (Phase 2, Section 1) - same
// net behavior, normalized storage.
const rememberTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Task text is required.'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'No Priority'],
      default: 'No Priority',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'done'],
      default: 'active',
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RememberTask', rememberTaskSchema);
