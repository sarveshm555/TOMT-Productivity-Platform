const Notification = require('../models/Notification');
const ScheduleTask = require('../models/ScheduleTask');
const PendingTask = require('../models/PendingTask');
const RoutineHistory = require('../models/RoutineHistory');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Ported 1:1 from getMinutesFromTime().
function getMinutesFromTime(time) {
  if (!time || time === 'N/A') return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Ported 1:1 from addNotification() - dedup by header+type, insert at front.
async function addNotification(userId, type, header, body) {
  const isDuplicate = await Notification.findOne({ userId, type, header });
  if (isDuplicate) return;

  await Notification.create({ userId, type, header, body, timestamp: new Date() });
}

/**
 * Ported 1:1 from generateScheduleNotifications() - now reads the
 * already-migrated ScheduleTask collection (Phase 3.3 Schedule module)
 * instead of the `dailyTasksData` localStorage key.
 */
async function generateScheduleNotifications(userId, userName) {
  const todayDate = getTodayDateString();
  const scheduleTasks = await ScheduleTask.find({ userId, dueDate: todayDate });
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const task of scheduleTasks) {
    if (task.time && task.time !== 'N/A') {
      const taskMinutes = getMinutesFromTime(task.time);
      if (taskMinutes !== null) {
        const timeDifference = taskMinutes - nowMinutes;
        if (timeDifference > 0 && timeDifference <= 10) {
          const header = '⏰ Schedule Alert: Task Due Soon!';
          const body = `Hey ${userName}, you need to complete **${task.task}** immediately (due at ${task.time}). <a href="/schedule">View Schedule Page</a>.`;
          // eslint-disable-next-line no-await-in-loop
          await addNotification(userId, 'schedule', header, body);
        }
      }
    }
  }
}

/**
 * Ported 1:1 from generateDailyRoutineReminder() - now reads the
 * already-migrated RoutineHistory collection (Daily Activity module),
 * filtered by routineType instead of two separate localStorage keys.
 */
async function generateDailyRoutineReminder(userId, userName) {
  const now = new Date();
  if (now.getHours() === 21 && now.getMinutes() === 0) {
    const today = getTodayDateString();

    const [proHistory, healthHistory] = await Promise.all([
      RoutineHistory.find({ userId, routineType: 'professional' }),
      RoutineHistory.find({ userId, routineType: 'health' }),
    ]);

    const proLogged = proHistory.some((entry) => new Date(entry.date).toISOString().slice(0, 10) === today);
    const healthLogged = healthHistory.some((entry) => new Date(entry.date).toISOString().slice(0, 10) === today);

    const missingLogs = [];
    if (!proLogged) missingLogs.push('Professional Routine');
    if (!healthLogged) missingLogs.push('Health Routine');

    if (missingLogs.length > 0) {
      const header = '📝 Daily Reminder: Log Your Progress';
      const logsMissing = missingLogs.join(' and ');
      const body = `Hey ${userName}, you need to fill the **${logsMissing}** progress. Please log your data for today before midnight.`;
      await addNotification(userId, 'daily-routine', header, body);
    }
  }
}

/**
 * Ported 1:1 from generatePendingTasksNotification() - now reads the
 * already-migrated PendingTask collection (Pending Tasks module). Removes
 * any existing pending-summary notification first so it's always
 * refreshed with the current count, exactly like the original.
 */
async function generatePendingTasksNotification(userId, userName) {
  const pendingIncomplete = await PendingTask.find({ userId, completed: false });
  const pendingType = 'pending-task-summary';

  await Notification.deleteMany({ userId, type: pendingType });

  if (pendingIncomplete.length > 0) {
    const header = `⚠️ Attention: ${pendingIncomplete.length} Pending Works!`;

    let pendingListHtml = '<ul id="pending-works-list">';
    pendingIncomplete.slice(0, 5).forEach((task) => {
      const dateDisplay = task.dueDate ? ` (Due: ${task.dueDate})` : '';
      pendingListHtml += `<li>- ${task.task}${dateDisplay}</li>`;
    });
    if (pendingIncomplete.length > 5) {
      pendingListHtml += `<li>...plus ${pendingIncomplete.length - 5} more.</li>`;
    }
    pendingListHtml += '</ul>';

    const body = `Hey ${userName}, here are your pending works that need action:<br>${pendingListHtml} <a href="/pending-tasks">Go to Pending Tasks</a>.`;
    await addNotification(userId, pendingType, header, body);
  }
}

function serialize(doc) {
  return {
    id: doc._id,
    type: doc.type,
    header: doc.header,
    body: doc.body,
    // Ported 1:1 from the original's `new Date().toLocaleTimeString()` -
    // computed at generation time and stored, matching the original's
    // exact (locale-dependent, not just HH:MM) display string.
    timestamp: doc.timestamp.toLocaleTimeString(),
  };
}

/**
 * GET /api/notifications
 * Ported from renderNotifications() - runs all three generators, then
 * returns the current full list (newest first, matching the original's
 * `unshift`).
 */
const listNotifications = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const userName = (user && user.username) || 'Life Manager User';

  await generateScheduleNotifications(req.user.id, userName);
  await generateDailyRoutineReminder(req.user.id, userName);
  await generatePendingTasksNotification(req.user.id, userName);

  const docs = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, userName, notifications: docs.map(serialize) });
});

/**
 * DELETE /api/notifications
 * Ported from clearAllNotifications() (the confirm() dialog is a frontend
 * concern).
 */
const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });
  res.status(200).json({ success: true, message: 'All notifications cleared.' });
});

module.exports = {
  listNotifications,
  clearAllNotifications,
};
