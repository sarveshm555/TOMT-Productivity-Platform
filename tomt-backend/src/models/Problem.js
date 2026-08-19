const mongoose = require('mongoose');

// Ported from problem.html's `userProblemData` localStorage array. The
// original stored a pre-formatted `time` string (`new Date().toLocaleString()`)
// at creation time; this instead relies on `createdAt` (a real Date) and
// lets the frontend format it for display - same visible result, more
// robust data (not locale-baked-in at write time).
const problemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    problem: {
      type: String,
      required: [true, 'Please describe the problem.'],
      trim: true,
    },
    solution: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Problem', problemSchema);
