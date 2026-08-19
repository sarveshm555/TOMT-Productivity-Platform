const mongoose = require('mongoose');

// Ported from daily-learning-tracker.html's `courseLog_<courseName>`
// dynamic localStorage keys. Normalized per Phase 2 (Section 6/11) exactly
// like CodingLog.js - a real `courseId` foreign key replaces the
// name-keyed dynamic storage.
const courseLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    link: {
      type: String,
      default: '',
    },
    topic: {
      type: String,
      required: [true, 'Topic Covered is required.'],
      trim: true,
    },
    date: {
      type: String, // "YYYY-MM-DD", matches the original's plain date string
      required: true,
    },
    learnings: {
      type: String,
      required: [true, 'Key Takeaways is required.'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CourseLog', courseLogSchema);
