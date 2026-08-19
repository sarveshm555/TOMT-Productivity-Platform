const Target = require('../models/Target');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Ported 1:1 from target.html's calculateStatus(targetDate): a goal is
 * "Overdue" once its target date's end-of-day (23:59:59.999) has passed,
 * otherwise "Active". Kept as a pure function, computed on every read
 * (see Target.js model comment for why).
 */
function calculateStatus(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  target.setHours(23, 59, 59, 999);
  return target < now ? 'Overdue' : 'Active';
}

function serialize(doc) {
  return {
    id: doc._id,
    name: doc.name,
    targetDate: doc.targetDate,
    progressNote: doc.progressNote,
    status: calculateStatus(doc.targetDate),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/targets
 * Ported from loadGoals()'s sort: ascending by targetDate (soonest first).
 */
const listTargets = asyncHandler(async (req, res) => {
  const targets = await Target.find({ userId: req.user.id }).sort({ targetDate: 1 });
  res.status(200).json({ success: true, targets: targets.map(serialize) });
});

/**
 * POST /api/targets
 * Ported from the goal-form submit handler's create branch.
 */
const createTarget = asyncHandler(async (req, res) => {
  const { name, targetDate, progressNote } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'Target / Goal Name is required.');
  }
  if (!targetDate) {
    throw new ApiError(400, 'Target Date is required.');
  }

  const target = await Target.create({
    userId: req.user.id,
    name: name.trim(),
    targetDate,
    progressNote: typeof progressNote === 'string' ? progressNote.trim() : '',
  });

  res.status(201).json({ success: true, target: serialize(target) });
});

/**
 * PUT /api/targets/:id
 * Ported from the goal-form submit handler's edit branch.
 */
const updateTarget = asyncHandler(async (req, res) => {
  const { name, targetDate, progressNote } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'Target / Goal Name is required.');
  }
  if (!targetDate) {
    throw new ApiError(400, 'Target Date is required.');
  }

  const target = await Target.findOne({ _id: req.params.id, userId: req.user.id });
  if (!target) {
    throw new ApiError(404, 'Target not found.');
  }

  target.name = name.trim();
  target.targetDate = targetDate;
  target.progressNote = typeof progressNote === 'string' ? progressNote.trim() : '';
  await target.save();

  res.status(200).json({ success: true, target: serialize(target) });
});

/**
 * DELETE /api/targets/:id
 * Ported from deleteGoal() (the confirm() dialog itself is a frontend concern).
 */
const deleteTarget = asyncHandler(async (req, res) => {
  const target = await Target.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!target) {
    throw new ApiError(404, 'Target not found.');
  }
  res.status(200).json({ success: true, message: 'Target deleted.' });
});

module.exports = {
  listTargets,
  createTarget,
  updateTarget,
  deleteTarget,
};
