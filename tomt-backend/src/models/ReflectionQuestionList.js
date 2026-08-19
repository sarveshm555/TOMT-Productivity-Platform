const mongoose = require('mongoose');

// Ported 1:1 from powerful_questions.html's `defaultQuestions` array -
// used the first time a user opens the module, exactly like the original.
const DEFAULT_QUESTIONS = [
  'What you learned today?',
  'What are the things you need to avoid?',
  'Have you maintained concentration and discipline?',
  'Is there any improvement today?',
  'What is your tomorrow goals?',
  'Are you satisfied or not today?',
];

// One document per user, mirrors the `reflectionQuestionsList` localStorage
// array exactly (an ordered list of question strings).
const reflectionQuestionListSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    questions: {
      type: [String],
      default: () => [...DEFAULT_QUESTIONS],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReflectionQuestionList', reflectionQuestionListSchema);
module.exports.DEFAULT_QUESTIONS = DEFAULT_QUESTIONS;
