const mongoose = require('mongoose');

// Ported from daily-coding-log.html's `codingLog_<profileName>` dynamic
// localStorage keys. Normalized per Phase 2 (Section 6/11): a real
// `profileId` foreign key replaces the name-keyed dynamic storage, so
// renaming a profile can never silently orphan its log (a real risk of
// the original's name-based key).
const codingLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingProfile',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question Title is required.'],
      trim: true,
    },
    language: {
      type: String,
      enum: ['Python', 'Java', 'C++', 'JavaScript'],
      default: 'Python',
    },
    date: {
      type: String, // "YYYY-MM-DD", matches the original's plain date string
      required: true,
    },
    learnings: {
      type: String,
      required: [true, 'Key Concepts is required.'],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodingLog', codingLogSchema);
