const OngoingTask = require('../models/OngoingTask');
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
    msg: doc.msg,
    completed: doc.completed,
    isHighPriority: !doc.completed && isHighPriority(deadline),
  };
}

/**
 * Ported 1:1 from ongoing.html's render() sort - identical shape to
 * needtoapply.html's (see applyTaskController.js), just completed/not
 * instead of applied/not.
 */
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.completed) {
      if (a.isHighPriority !== b.isHighPriority) return a.isHighPriority ? -1 : 1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return 0;
  });
}

/**
 * GET /api/monitoring/ongoing
 */
const listOngoingTasks = asyncHandler(async (req, res) => {
  const docs = await OngoingTask.find({ userId: req.user.id });
  res.status(200).json({ success: true, tasks: sortTasks(docs.map(serialize)) });
});

/**
 * POST /api/monitoring/ongoing
 * Ported from saveTask()'s create branch.
 */
const createOngoingTask = asyncHandler(async (req, res) => {
  const { name, deadline, link, msg } = req.body;
  if (!name || !deadline) {
    throw new ApiError(400, 'Please enter Name and Deadline');
  }

  const task = await OngoingTask.create({
    userId: req.user.id,
    name,
    deadline,
    link: link || '',
    msg: msg || '',
    completed: false,
  });

  res.status(201).json({ success: true, task: serialize(task) });
});

/**
 * PUT /api/monitoring/ongoing/:id
 * Ported from saveTask()'s edit branch.
 */
const updateOngoingTask = asyncHandler(async (req, res) => {
  const { name, deadline, link, msg } = req.body;
  if (!name || !deadline) {
    throw new ApiError(400, 'Please enter Name and Deadline');
  }

  const task = await OngoingTask.findOne({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Process not found.');

  task.name = name;
  task.deadline = deadline;
  task.link = link || '';
  task.msg = msg || '';
  await task.save();

  res.status(200).json({ success: true, task: serialize(task) });
});

/**
 * PATCH /api/monitoring/ongoing/:id/mark-done
 * Ported from markDone(id).
 */
const markDone = asyncHandler(async (req, res) => {
  const task = await OngoingTask.findOne({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Process not found.');

  task.completed = true;
  await task.save();

  res.status(200).json({ success: true, task: serialize(task) });
});

/**
 * DELETE /api/monitoring/ongoing/:id
 * Ported from deleteTask(id).
 */
const deleteOngoingTask = asyncHandler(async (req, res) => {
  const task = await OngoingTask.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Process not found.');
  res.status(200).json({ success: true, message: 'Process deleted.' });
});

module.exports = {
  listOngoingTasks,
  createOngoingTask,
  updateOngoingTask,
  markDone,
  deleteOngoingTask,
};
