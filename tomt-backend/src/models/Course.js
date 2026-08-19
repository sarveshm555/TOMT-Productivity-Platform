const mongoose = require('mongoose');

// Ported from education-notes.html's `learningCoursesData` localStorage array.
const courseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Learning Topic / Course Name is required.'],
      trim: true,
    },
    source: {
      type: String,
      required: [true, 'Source is required.'],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
