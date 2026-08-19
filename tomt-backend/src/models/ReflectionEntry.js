const mongoose = require('mongoose');

// Ported from powerful_questions.html's `reflectionEntriesData` localStorage
// object, keyed by dateKey ("YYYY-MM-DD" -> {timestamp, answers}). Here
// each date becomes its own document instead of one giant per-user object,
// with a compound unique index so re-saving the same date overwrites it
// (matching the original's `entries[dateKey] = {...}` overwrite behavior).
const answerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, default: '' },
  },
  { _id: false }
);

const reflectionEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateKey: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

reflectionEntrySchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('ReflectionEntry', reflectionEntrySchema);
