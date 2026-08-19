const CodingLog = require('../models/CodingLog');
const CodingProfile = require('../models/CodingProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function serialize(doc) {
  return {
    id: doc._id,
    profileId: doc.profileId,
    question: doc.question,
    language: doc.language,
    date: doc.date,
    learnings: doc.learnings,
  };
}

async function assertProfileOwnership(profileId, userId) {
  const profile = await CodingProfile.findOne({ _id: profileId, userId });
  if (!profile) throw new ApiError(404, 'Profile not found.');
  return profile;
}

/**
 * GET /api/placement/coding-profiles/:profileId/logs
 * Ported from loadLog() - newest first (the original sorted by
 * `b.id - a.id`, i.e. most-recently-created first).
 */
const listLogs = asyncHandler(async (req, res) => {
  await assertProfileOwnership(req.params.profileId, req.user.id);
  const docs = await CodingLog.find({ profileId: req.params.profileId, userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, logs: docs.map(serialize) });
});

/**
 * POST /api/placement/coding-profiles/:profileId/logs
 * Ported from the daily-log-form submit handler's create branch.
 */
const createLog = asyncHandler(async (req, res) => {
  await assertProfileOwnership(req.params.profileId, req.user.id);

  const { question, language, date, learnings } = req.body;
  const trimmedQuestion = typeof question === 'string' ? question.trim() : '';
  const trimmedLearnings = typeof learnings === 'string' ? learnings.trim() : '';

  if (!trimmedQuestion || !date || !trimmedLearnings) {
    throw new ApiError(400, 'Question Title, Date Solved, and Key Concepts are required.');
  }

  const doc = await CodingLog.create({
    userId: req.user.id,
    profileId: req.params.profileId,
    question: trimmedQuestion,
    language: language || 'Python',
    date,
    learnings: trimmedLearnings,
  });

  res.status(201).json({ success: true, log: serialize(doc) });
});

/**
 * PUT /api/placement/coding-profiles/:profileId/logs/:logId
 * Ported from the daily-log-form submit handler's edit branch.
 */
const updateLog = asyncHandler(async (req, res) => {
  await assertProfileOwnership(req.params.profileId, req.user.id);

  const { question, language, date, learnings } = req.body;
  const trimmedQuestion = typeof question === 'string' ? question.trim() : '';
  const trimmedLearnings = typeof learnings === 'string' ? learnings.trim() : '';

  if (!trimmedQuestion || !date || !trimmedLearnings) {
    throw new ApiError(400, 'Question Title, Date Solved, and Key Concepts are required.');
  }

  const doc = await CodingLog.findOne({ _id: req.params.logId, profileId: req.params.profileId, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Log entry not found.');

  doc.question = trimmedQuestion;
  doc.language = language || doc.language;
  doc.date = date;
  doc.learnings = trimmedLearnings;
  await doc.save();

  res.status(200).json({ success: true, log: serialize(doc) });
});

/**
 * DELETE /api/placement/coding-profiles/:profileId/logs/:logId
 * Ported from deleteEntry(id) (the confirm() dialog is a frontend concern).
 */
const deleteLog = asyncHandler(async (req, res) => {
  const doc = await CodingLog.findOneAndDelete({ _id: req.params.logId, profileId: req.params.profileId, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Log entry not found.');
  res.status(200).json({ success: true, message: 'Log entry deleted.' });
});

module.exports = {
  listLogs,
  createLog,
  updateLog,
  deleteLog,
};
