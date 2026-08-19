const PendingTask = require('../models/PendingTask');
const ScheduleTask = require('../models/ScheduleTask');
const ScheduleHistory = require('../models/ScheduleHistory');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function serialize(doc) {
  return {
    id: doc._id,
    task: doc.task,
    dueDate: doc.dueDate,
    priority: doc.priority,
    completed: doc.completed,
  };
}

/**
 * GET /api/pending-tasks
 */
const listPendingTasks = asyncHandler(async (req, res) => {
  const docs = await PendingTask.find({ userId: req.user.id });
  res.status(200).json({ success: true, tasks: docs.map(serialize) });
});

/**
 * POST /api/pending-tasks
 * Ported from the add-past-form submit handler.
 */
const createPendingTask = asyncHandler(async (req, res) => {
  const { task, dueDate, priority } = req.body;
  if (!task || typeof task !== 'string' || !task.trim()) {
    throw new ApiError(400, 'Task description is required.');
  }

  const doc = await PendingTask.create({
    userId: req.user.id,
    task: task.trim(),
    dueDate: dueDate || '',
    priority: priority || 'No Priority',
    completed: false,
  });

  res.status(201).json({ success: true, task: serialize(doc) });
});

/**
 * PATCH /api/pending-tasks/:id/complete
 * Ported from completeTask(id) - removes from pending, adds to schedule
 * history with a completion timestamp.
 */
const completePendingTask = asyncHandler(async (req, res) => {
  const task = await PendingTask.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Pending task not found.');

  await ScheduleHistory.create({
    userId: req.user.id,
    task: task.task,
    dueDate: task.dueDate,
    priority: task.priority,
    completedAt: new Date(),
  });

  res.status(200).json({ success: true, message: 'Task completed.' });
});

/**
 * DELETE /api/pending-tasks/:id
 * Ported from deleteTask(id) (the confirm() dialog is a frontend concern).
 */
const deletePendingTask = asyncHandler(async (req, res) => {
  const task = await PendingTask.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Pending task not found.');
  res.status(200).json({ success: true, message: 'Task deleted.' });
});

/**
 * POST /api/pending-tasks/move-all-to-schedule
 * Ported from moveAllPending() - moves every pending task into today's
 * schedule (dueDate set to today) and clears the pending list.
 */
const moveAllToSchedule = asyncHandler(async (req, res) => {
  const pending = await PendingTask.find({ userId: req.user.id });
  if (pending.length === 0) {
    throw new ApiError(400, 'Nothing to move!');
  }

  const today = new Date().toISOString().split('T')[0];
  const scheduleDocs = pending.map((t) => ({
    userId: req.user.id,
    task: t.task,
    dueDate: today,
    priority: t.priority,
    completed: false,
  }));

  await ScheduleTask.insertMany(scheduleDocs);
  await PendingTask.deleteMany({ userId: req.user.id });

  res.status(200).json({ success: true, message: "Moved to Today's Schedule!", movedCount: scheduleDocs.length });
});

/**
 * GET /api/pending-tasks/history
 * Ported from the toggle-history-btn handler's history render.
 */
const listHistory = asyncHandler(async (req, res) => {
  const docs = await ScheduleHistory.find({ userId: req.user.id }).sort({ completedAt: -1 });
  res.status(200).json({
    success: true,
    history: docs.map((doc) => ({
      id: doc._id,
      task: doc.task,
      dueDate: doc.dueDate,
      priority: doc.priority,
      completedAt: doc.completedAt,
    })),
  });
});

module.exports = {
  listPendingTasks,
  createPendingTask,
  completePendingTask,
  deletePendingTask,
  moveAllToSchedule,
  listHistory,
};
