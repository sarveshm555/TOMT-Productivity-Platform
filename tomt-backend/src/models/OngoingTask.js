const mongoose = require('mongoose');

// Ported from ongoing.html's `ongoingTasks` localStorage array. See
// ApplyTask.js for why this stays a separate collection.
const ongoingTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Process Name is required.'],
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required.'],
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    msg: {
      type: String,
      default: '',
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OngoingTask', ongoingTaskSchema);
