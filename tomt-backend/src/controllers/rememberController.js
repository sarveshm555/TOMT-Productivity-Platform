const RememberTask = require('../models/RememberTask');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Ported 1:1 from remember_block.html's `priorityOrder` map, used for the
// exact same sort: High > Medium > Low > No Priority, then soonest due
// date first (tasks with no due date sort last, matching the original's
// `Infinity` fallback).
const PRIORITY_ORDER = { High: 4, Medium: 3, Low: 2, 'No Priority': 1 };

function sortActiveTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const pCompare = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (pCompare !== 0) return pCompare;
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aTime - bTime;
  });
}

function serialize(doc) {
  return {
    id: doc._id,
    text: doc.text,
    priority: doc.priority,
    dueDate: doc.dueDate,
    status: doc.status,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
  };
}

/**
 * GET /api/remember
 * Ported from loadData()/sortAndRenderTasks(): active tasks sorted by
 * priority then due date; history tasks newest-completed-first (the
 * original used `historyTasks.unshift(task)` on complete, so the most
 * recently completed task was always first).
 */
const listRememberTasks = asyncHandler(async (req, res) => {
  const [activeDocs, historyDocs] = await Promise.all([
    RememberTask.find({ userId: req.user.id, status: 'active' }),
    RememberTask.find({ userId: req.user.id, status: 'done' }).sort({ completedAt: -1 }),
  ]);

  res.status(200).json({
    success: true,
    active: sortActiveTasks(activeDocs.map(serialize)),
    history: historyDocs.map(serialize),
  });
});

/**
 * POST /api/remember
 * Ported from addTask().
 */
const createRememberTask = asyncHandler(async (req, res) => {
  const { text, priority, dueDate } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new ApiError(400, 'Enter task text');
  }

  const task = await RememberTask.create({
    userId: req.user.id,
    text: text.trim(),
    priority: priority || 'No Priority',
    dueDate: dueDate || null,
  });

  res.status(201).json({ success: true, task: serialize(task) });
});

/**
 * PATCH /api/remember/:id/complete
 * Ported from confirmComplete(id) - moves a task from active to history
 * (here: status 'active' -> 'done', completedAt stamped) rather than
 * splicing between two arrays.
 */
const completeRememberTask = asyncHandler(async (req, res) => {
  const task = await RememberTask.findOne({ _id: req.params.id, userId: req.user.id, status: 'active' });
  if (!task) {
    throw new ApiError(404, 'Reminder not found.');
  }

  task.status = 'done';
  task.completedAt = new Date();
  await task.save();

  res.status(200).json({ success: true, task: serialize(task) });
});

/**
 * DELETE /api/remember/:id
 * Ported from deleteTask(id) - only ever deleted ACTIVE reminders in the
 * original (there was no delete action on history items).
 */
const deleteRememberTask = asyncHandler(async (req, res) => {
  const task = await RememberTask.findOneAndDelete({ _id: req.params.id, userId: req.user.id, status: 'active' });
  if (!task) {
    throw new ApiError(404, 'Reminder not found.');
  }
  res.status(200).json({ success: true, message: 'Reminder deleted.' });
});

module.exports = {
  listRememberTasks,
  createRememberTask,
  completeRememberTask,
  deleteRememberTask,
};
