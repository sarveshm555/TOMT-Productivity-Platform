const CourseLog = require('../models/CourseLog');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function serialize(doc) {
  return {
    id: doc._id,
    courseId: doc.courseId,
    link: doc.link,
    topic: doc.topic,
    date: doc.date,
    learnings: doc.learnings,
  };
}

async function assertCourseOwnership(courseId, userId) {
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) throw new ApiError(404, 'Course not found.');
  return course;
}

/**
 * GET /api/placement/education/:courseId/logs
 * Ported from loadLog() - newest-date-first (matches
 * `sort((a, b) => new Date(b.date) - new Date(a.date))`).
 */
const listCourseLogs = asyncHandler(async (req, res) => {
  await assertCourseOwnership(req.params.courseId, req.user.id);
  const docs = await CourseLog.find({ courseId: req.params.courseId, userId: req.user.id });
  const sorted = docs.map(serialize).sort((a, b) => new Date(b.date) - new Date(a.date));
  res.status(200).json({ success: true, logs: sorted });
});

/**
 * POST /api/placement/education/:courseId/logs
 * Ported from the daily-log-form submit handler's create branch.
 */
const createCourseLog = asyncHandler(async (req, res) => {
  await assertCourseOwnership(req.params.courseId, req.user.id);

  const { link, topic, date, learnings } = req.body;
  const trimmedTopic = typeof topic === 'string' ? topic.trim() : '';

  if (!trimmedTopic || !date || !learnings) {
    throw new ApiError(400, 'Topic Covered, Date Studied, and Key Takeaways are required.');
  }

  const doc = await CourseLog.create({
    userId: req.user.id,
    courseId: req.params.courseId,
    link: link || '',
    topic: trimmedTopic,
    date,
    learnings,
  });

  res.status(201).json({ success: true, log: serialize(doc) });
});

/**
 * PUT /api/placement/education/:courseId/logs/:logId
 * Ported from the daily-log-form submit handler's edit branch.
 */
const updateCourseLog = asyncHandler(async (req, res) => {
  await assertCourseOwnership(req.params.courseId, req.user.id);

  const { link, topic, date, learnings } = req.body;
  const trimmedTopic = typeof topic === 'string' ? topic.trim() : '';

  if (!trimmedTopic || !date || !learnings) {
    throw new ApiError(400, 'Topic Covered, Date Studied, and Key Takeaways are required.');
  }

  const doc = await CourseLog.findOne({ _id: req.params.logId, courseId: req.params.courseId, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Log entry not found.');

  doc.link = link || '';
  doc.topic = trimmedTopic;
  doc.date = date;
  doc.learnings = learnings;
  await doc.save();

  res.status(200).json({ success: true, log: serialize(doc) });
});

/**
 * DELETE /api/placement/education/:courseId/logs/:logId
 * Ported from deleteEntry(id) (the confirm() dialog is a frontend concern).
 */
const deleteCourseLog = asyncHandler(async (req, res) => {
  const doc = await CourseLog.findOneAndDelete({ _id: req.params.logId, courseId: req.params.courseId, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Log entry not found.');
  res.status(200).json({ success: true, message: 'Log entry deleted.' });
});

module.exports = {
  listCourseLogs,
  createCourseLog,
  updateCourseLog,
  deleteCourseLog,
};
