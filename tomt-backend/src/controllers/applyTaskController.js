const ApplyTask = require('../models/ApplyTask');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isHighPriority } = require('../utils/priority');

function serialize(doc) {
  const deadline = doc.deadline.toISOString().slice(0, 10);
  return {
    id: doc._id,
    name: doc.name,
    deadline,
    link: doc.link,
    applied: doc.applied,
    isHighPriority: !doc.applied && isHighPriority(deadline),
  };
}

/**
 * Ported 1:1 from needtoapply.html's render() sort: unapplied items first
 * (high-priority-unapplied before normal-unapplied, soonest deadline
 * first within each), applied items last, relative order among applied
 * items preserved (the original's comparator returned 0 for two applied
 * items, i.e. a stable no-op).
 */
function sortApps(apps) {
  return [...apps].sort((a, b) => {
    if (a.applied !== b.applied) return a.applied ? 1 : -1;
    if (!a.applied) {
      if (a.isHighPriority !== b.isHighPriority) return a.isHighPriority ? -1 : 1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return 0;
  });
}

/**
 * GET /api/monitoring/apply
 */
const listApplyTasks = asyncHandler(async (req, res) => {
  const docs = await ApplyTask.find({ userId: req.user.id });
  res.status(200).json({ success: true, apps: sortApps(docs.map(serialize)) });
});

/**
 * POST /api/monitoring/apply
 * Ported from saveApp()'s create branch.
 */
const createApplyTask = asyncHandler(async (req, res) => {
  const { name, deadline, link } = req.body;
  if (!name || !deadline || !link) {
    throw new ApiError(400, 'Please enter Name, Deadline, and Link');
  }

  const task = await ApplyTask.create({ userId: req.user.id, name, deadline, link, applied: false });
  res.status(201).json({ success: true, app: serialize(task) });
});

/**
 * PUT /api/monitoring/apply/:id
 * Ported from saveApp()'s edit branch (editApp() only ever populated
 * name/deadline/link - `applied` is untouched by an edit, matching the
 * original's `{...a, name, deadline, link}` spread).
 */
const updateApplyTask = asyncHandler(async (req, res) => {
  const { name, deadline, link } = req.body;
  if (!name || !deadline || !link) {
    throw new ApiError(400, 'Please enter Name, Deadline, and Link');
  }

  const task = await ApplyTask.findOne({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Application not found.');

  task.name = name;
  task.deadline = deadline;
  task.link = link;
  await task.save();

  res.status(200).json({ success: true, app: serialize(task) });
});

/**
 * PATCH /api/monitoring/apply/:id/mark-applied
 * Ported from markApplied(id).
 */
const markApplied = asyncHandler(async (req, res) => {
  const task = await ApplyTask.findOne({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Application not found.');

  task.applied = true;
  await task.save();

  res.status(200).json({ success: true, app: serialize(task) });
});

/**
 * DELETE /api/monitoring/apply/:id
 * Ported from deleteApp(id).
 */
const deleteApplyTask = asyncHandler(async (req, res) => {
  const task = await ApplyTask.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Application not found.');
  res.status(200).json({ success: true, message: 'Application deleted.' });
});

module.exports = {
  listApplyTasks,
  createApplyTask,
  updateApplyTask,
  markApplied,
  deleteApplyTask,
};
