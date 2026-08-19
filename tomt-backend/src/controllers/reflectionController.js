const ReflectionQuestionList = require('../models/ReflectionQuestionList');
const ReflectionEntry = require('../models/ReflectionEntry');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function getOrCreateQuestionList(userId) {
  let doc = await ReflectionQuestionList.findOne({ userId });
  if (!doc) {
    doc = await ReflectionQuestionList.create({ userId });
  }
  return doc;
}

/**
 * GET /api/reflections/questions
 * Ported from loadQuestions().
 */
const listQuestions = asyncHandler(async (req, res) => {
  const doc = await getOrCreateQuestionList(req.user.id);
  res.status(200).json({ success: true, questions: doc.questions });
});

/**
 * POST /api/reflections/questions
 * Ported from add-question-btn's handler.
 */
const addQuestion = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) {
    throw new ApiError(400, 'Question text is required.');
  }

  const doc = await getOrCreateQuestionList(req.user.id);
  doc.questions.push(trimmed);
  await doc.save();

  res.status(201).json({ success: true, questions: doc.questions });
});

/**
 * DELETE /api/reflections/questions/:index
 * Ported from removeQuestion(i) - index-based removal, matching the
 * original's `diaryQuestions.splice(i, 1)`.
 */
const removeQuestion = asyncHandler(async (req, res) => {
  const index = Number(req.params.index);
  const doc = await getOrCreateQuestionList(req.user.id);

  if (!Number.isInteger(index) || index < 0 || index >= doc.questions.length) {
    throw new ApiError(400, 'Invalid question index.');
  }

  doc.questions.splice(index, 1);
  await doc.save();

  res.status(200).json({ success: true, questions: doc.questions });
});

function serializeEntry(doc) {
  return {
    dateKey: doc.dateKey,
    timestamp: doc.timestamp,
    answers: doc.answers.map((a) => ({ question: a.question, answer: a.answer })),
  };
}

/**
 * GET /api/reflections/entries
 * Ported from getStoredEntries() + renderEntriesList()'s key sort - returns
 * an object keyed by dateKey (like the original), plus entries sorted
 * newest-first are trivial for the frontend to derive from
 * Object.keys(...).sort().reverse() exactly as before.
 */
const listEntries = asyncHandler(async (req, res) => {
  const docs = await ReflectionEntry.find({ userId: req.user.id });
  const entries = {};
  docs.forEach((doc) => {
    entries[doc.dateKey] = serializeEntry(doc);
  });
  res.status(200).json({ success: true, entries });
});

/**
 * POST /api/reflections/entries
 * Ported from the diary-form submit handler - saves (overwrites) today's
 * entry. dateKey is computed server-side with the exact same formula the
 * original used client-side (`new Date().toISOString().split('T')[0]`,
 * i.e. UTC date), so behavior is identical.
 */
const saveEntry = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new ApiError(400, 'Answers are required.');
  }

  const dateKey = new Date().toISOString().split('T')[0];
  const timestamp = new Date();

  const entry = await ReflectionEntry.findOneAndUpdate(
    { userId: req.user.id, dateKey },
    { userId: req.user.id, dateKey, timestamp, answers },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ success: true, entry: serializeEntry(entry) });
});

/**
 * DELETE /api/reflections/entries
 * Ported from clear-diary-data's handler (the confirm() dialog itself is a
 * frontend concern).
 */
const clearEntries = asyncHandler(async (req, res) => {
  await ReflectionEntry.deleteMany({ userId: req.user.id });
  res.status(200).json({ success: true, message: 'All reflections cleared.' });
});

module.exports = {
  listQuestions,
  addQuestion,
  removeQuestion,
  listEntries,
  saveEntry,
  clearEntries,
};
