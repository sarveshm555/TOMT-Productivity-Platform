const Course = require('../models/Course');
const CourseLog = require('../models/CourseLog');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function serializeWithProgress(doc) {
  const logCount = await CourseLog.countDocuments({ courseId: doc._id });
  return {
    id: doc._id,
    name: doc.name,
    source: doc.source,
    logCount,
  };
}

/**
 * GET /api/placement/education
 * Ported from renderCourses() - newest-first (matches loadCourses()'s
 * `sort((a, b) => b.id - a.id)`), progress computed server-side against
 * the real CourseLog collection instead of a second localStorage read.
 */
const listCourses = asyncHandler(async (req, res) => {
  const docs = await Course.find({ userId: req.user.id }).sort({ createdAt: -1 });
  const courses = await Promise.all(docs.map(serializeWithProgress));
  res.status(200).json({ success: true, courses });
});

/**
 * GET /api/placement/education/:id
 * Used by the Daily Learning Tracker page (matches reading `courseName`
 * for display purposes).
 */
const getCourse = asyncHandler(async (req, res) => {
  const doc = await Course.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Course not found.');
  res.status(200).json({ success: true, course: await serializeWithProgress(doc) });
});

/**
 * POST /api/placement/education
 * Ported from the course-form submit handler's create branch.
 */
const createCourse = asyncHandler(async (req, res) => {
  const { name, source } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedSource = typeof source === 'string' ? source.trim() : '';

  if (!trimmedName || !trimmedSource) {
    throw new ApiError(400, 'Learning Topic / Course Name and Source are required.');
  }

  const doc = await Course.create({ userId: req.user.id, name: trimmedName, source: trimmedSource });
  res.status(201).json({ success: true, course: await serializeWithProgress(doc) });
});

/**
 * PUT /api/placement/education/:id
 * Ported from the course-form submit handler's edit branch.
 */
const updateCourse = asyncHandler(async (req, res) => {
  const { name, source } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedSource = typeof source === 'string' ? source.trim() : '';

  if (!trimmedName || !trimmedSource) {
    throw new ApiError(400, 'Learning Topic / Course Name and Source are required.');
  }

  const doc = await Course.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Course not found.');

  doc.name = trimmedName;
  doc.source = trimmedSource;
  await doc.save();

  res.status(200).json({ success: true, course: await serializeWithProgress(doc) });
});

/**
 * DELETE /api/placement/education/:id
 * Ported from deleteCourse(id, name). Cascades to delete the course's
 * CourseLog entries - same reasoning as CodingProfile's delete (see
 * codingProfileController.js's deleteCodingProfile comment).
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const doc = await Course.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Course not found.');
  await CourseLog.deleteMany({ courseId: doc._id });
  res.status(200).json({ success: true, message: 'Course deleted.' });
});

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
};
