const ScheduleTask = require('../models/ScheduleTask');
const ScheduleMeta = require('../models/ScheduleMeta');
const ScheduleHistory = require('../models/ScheduleHistory');
const PendingTask = require('../models/PendingTask');
const RememberTask = require('../models/RememberTask');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Ported 1:1 from schedule.html's `priorityOrder` map (same map used
// independently in monitoring/remember - see rememberController.js).
const PRIORITY_ORDER = { High: 4, Medium: 3, Low: 2, 'No Priority': 1 };

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Ported 1:1 from schedule.html's formatDateForDisplay() - used to build
// the "(Missed: MM/DD/YYYY)" suffix on migrated task names.
function formatDateForDisplay(dateString) {
  if (!dateString) return 'N/A';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${month}/${day}/${year}`;
}

function serializeTask(doc) {
  return {
    id: doc._id,
    task: doc.task,
    dueDate: doc.dueDate,
    time: doc.time,
    priority: doc.priority,
    completed: doc.completed,
  };
}

// Ported 1:1 from the task-form submit handler's sort: dueDate asc, then
// time asc ('N/A' sorts as end-of-day '23:59'), then priority desc.
function sortDailyTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const dateCompare = a.dueDate.localeCompare(b.dueDate);
    if (dateCompare !== 0) return dateCompare;

    const timeA = a.time === 'N/A' ? '23:59' : a.time;
    const timeB = b.time === 'N/A' ? '23:59' : b.time;
    const timeCompare = timeA.localeCompare(timeB);
    if (timeCompare !== 0) return timeCompare;

    return (PRIORITY_ORDER[b.priority] || 1) - (PRIORITY_ORDER[a.priority] || 1);
  });
}

/**
 * Ported 1:1 from checkAndMigrateTasks() - runs server-side on every fetch
 * of today's schedule (the original ran it once on page load, which is the
 * equivalent point in a server-rendered-per-request model). Moves any
 * ScheduleTask due before today into PendingTask (reusing the existing
 * Pending Tasks collection/module, per instruction #10), renaming it with
 * the same "(Missed: MM/DD/YYYY)" suffix, and updates ScheduleMeta's
 * lastVisitDate - all scoped to the current user.
 */
async function checkAndMigrateTasks(userId) {
  const todayDateString = getTodayDateString();
  let meta = await ScheduleMeta.findOne({ userId });
  if (!meta) {
    meta = await ScheduleMeta.create({ userId, lastVisitDate: null });
  }

  if (meta.lastVisitDate === todayDateString) {
    return; // already migrated today, nothing to do
  }

  const lastVisitDateObj = meta.lastVisitDate ? new Date(meta.lastVisitDate) : null;
  const todayObj = new Date(todayDateString);

  // Only migrate if we have a valid previous date and that date is before today.
  if (lastVisitDateObj && lastVisitDateObj < todayObj) {
    const dailyTasks = await ScheduleTask.find({ userId });
    const tasksToMigrate = dailyTasks.filter((t) => !(t.dueDate && t.dueDate >= todayDateString));

    if (tasksToMigrate.length > 0) {
      const pendingDocs = tasksToMigrate.map((t) => ({
        userId,
        task: `${t.task} (Missed: ${formatDateForDisplay(t.dueDate)})`,
        dueDate: t.dueDate,
        priority: t.priority,
        completed: false,
      }));
      await PendingTask.insertMany(pendingDocs);
      await ScheduleTask.deleteMany({ _id: { $in: tasksToMigrate.map((t) => t._id) } });
    }
  }

  meta.lastVisitDate = todayDateString;
  await meta.save();
}

/**
 * GET /api/schedule/tasks
 * Ported from the DOMContentLoaded handler's initial load: runs the
 * migration check, then returns today's (post-migration) task list, sorted.
 */
const listTasks = asyncHandler(async (req, res) => {
  await checkAndMigrateTasks(req.user.id);
  const docs = await ScheduleTask.find({ userId: req.user.id });
  res.status(200).json({ success: true, tasks: sortDailyTasks(docs.map(serializeTask)) });
});

/**
 * POST /api/schedule/tasks
 * Ported from the task-form submit handler.
 */
const createTask = asyncHandler(async (req, res) => {
  const { task, dueDate, time, priority } = req.body;
  const trimmedTask = typeof task === 'string' ? task.trim() : '';
  if (!trimmedTask || !dueDate) {
    throw new ApiError(400, 'Task description and due date are required.');
  }

  const doc = await ScheduleTask.create({
    userId: req.user.id,
    task: trimmedTask,
    dueDate,
    time: time || 'N/A',
    priority: priority || 'No Priority',
    completed: false,
  });

  const all = await ScheduleTask.find({ userId: req.user.id });
  res.status(201).json({ success: true, task: serializeTask(doc), tasks: sortDailyTasks(all.map(serializeTask)) });
});

/**
 * PATCH /api/schedule/tasks/:id/complete
 * Ported from the btn-complete branch of the global click handler -
 * removes the task and records it in the shared ScheduleHistory
 * collection (also used by pending-tasks.html - see ScheduleHistory.js).
 */
const completeTask = asyncHandler(async (req, res) => {
  const task = await ScheduleTask.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Task not found.');

  await ScheduleHistory.create({
    userId: req.user.id,
    task: task.task,
    dueDate: task.dueDate,
    priority: task.priority,
    completedAt: new Date(),
  });

  res.status(200).json({ success: true, message: 'Task completed and saved to History!' });
});

/**
 * PATCH /api/schedule/tasks/:id/remember
 * Ported from the btn-remember branch - creates an active Remember Block
 * entry (reusing the existing RememberTask collection/module) without
 * deleting the schedule task, with the exact same duplicate-guard the
 * original used (text + priority + dueDate match).
 */
const rememberTask = asyncHandler(async (req, res) => {
  const task = await ScheduleTask.findOne({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Task not found.');

  const exists = await RememberTask.findOne({
    userId: req.user.id,
    text: task.task,
    priority: task.priority,
    dueDate: task.dueDate || null,
  });

  if (!exists) {
    await RememberTask.create({
      userId: req.user.id,
      text: task.task,
      priority: task.priority || 'No Priority',
      dueDate: task.dueDate || null,
      status: 'active',
    });
  }

  res.status(200).json({ success: true, message: 'Task added to Active Reminders!' });
});

/**
 * DELETE /api/schedule/tasks/:id
 * Ported from the delete-task-btn branch of the global click handler.
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await ScheduleTask.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!task) throw new ApiError(404, 'Task not found.');
  res.status(200).json({ success: true, message: 'Task deleted.' });
});

/**
 * DELETE /api/schedule/tasks
 * Ported from the clear-all-tasks handler (the confirm() dialog is a
 * frontend concern).
 */
const clearAllTasks = asyncHandler(async (req, res) => {
  await ScheduleTask.deleteMany({ userId: req.user.id });
  res.status(200).json({ success: true, message: 'All tasks cleared.' });
});

module.exports = {
  listTasks,
  createTask,
  completeTask,
  rememberTask,
  deleteTask,
  clearAllTasks,
};
