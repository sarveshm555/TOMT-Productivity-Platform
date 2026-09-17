const CourseLog = require('../models/CourseLog');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/gridfs');

function isValidHttpUrl(string) {
  if (!string) return true;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function serialize(doc) {
  return {
    id: doc._id,
    courseId: doc.courseId,
    link: doc.link || '',
    topic: doc.topic,
    date: doc.date,
    learnings: doc.learnings || '',
    attachments: (doc.attachments || []).map((att) => ({
      id: att._id,
      fileName: att.fileName,
      fileType: att.fileType,
      mimeType: att.mimeType,
      size: att.size,
    })),
  };
}

async function assertCourseOwnership(courseId, userId) {
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) throw new ApiError(404, 'Course not found.');
  return course;
}

function classifyAndValidateFile(file) {
  const mime = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();

  const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
  const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name);

  if (!isPdf && !isImage) {
    throw new ApiError(400, `Unsupported file format for "${file.originalname}". Only image and PDF files are supported.`);
  }

  return {
    fileType: isPdf ? 'pdf' : 'image',
    bucket: isPdf ? 'documents' : 'media',
    mimeType: file.mimetype || (isPdf ? 'application/pdf' : 'image/jpeg'),
  };
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
 * Handles creating a course log with optional link, optional key takeaways,
 * and optional multiple photo/PDF attachments stored in GridFS.
 */
const createCourseLog = asyncHandler(async (req, res) => {
  await assertCourseOwnership(req.params.courseId, req.user.id);

  const { link, topic, date, learnings } = req.body;
  const trimmedTopic = typeof topic === 'string' ? topic.trim() : '';
  const trimmedLink = typeof link === 'string' ? link.trim() : '';

  if (!trimmedTopic || !date) {
    throw new ApiError(400, 'Topic Covered and Date Studied are required.');
  }

  if (trimmedLink && !isValidHttpUrl(trimmedLink)) {
    throw new ApiError(400, 'Topic Link must be a valid HTTP or HTTPS URL.');
  }

  const attachments = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    for (const file of req.files) {
      const meta = classifyAndValidateFile(file);
      const gridfsFileId = await uploadBuffer(meta.bucket, file.buffer, file.originalname, meta.mimeType);
      attachments.push({
        gridfsFileId,
        fileName: file.originalname,
        fileType: meta.fileType,
        mimeType: meta.mimeType,
        size: file.size,
        bucket: meta.bucket,
      });
    }
  }

  const doc = await CourseLog.create({
    userId: req.user.id,
    courseId: req.params.courseId,
    link: trimmedLink,
    topic: trimmedTopic,
    date,
    learnings: typeof learnings === 'string' ? learnings : '',
    attachments,
  });

  res.status(201).json({ success: true, log: serialize(doc) });
});

/**
 * PUT /api/placement/education/:courseId/logs/:logId
 * Handles updating a course log entry, retaining/removing existing attachments
 * and uploading new photo/PDF attachments streamed to GridFS.
 */
const updateCourseLog = asyncHandler(async (req, res) => {
  await assertCourseOwnership(req.params.courseId, req.user.id);

  const { link, topic, date, learnings, keptAttachmentIds } = req.body;
  const trimmedTopic = typeof topic === 'string' ? topic.trim() : '';
  const trimmedLink = typeof link === 'string' ? link.trim() : '';

  if (!trimmedTopic || !date) {
    throw new ApiError(400, 'Topic Covered and Date Studied are required.');
  }

  if (trimmedLink && !isValidHttpUrl(trimmedLink)) {
    throw new ApiError(400, 'Topic Link must be a valid HTTP or HTTPS URL.');
  }

  const doc = await CourseLog.findOne({ _id: req.params.logId, courseId: req.params.courseId, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Log entry not found.');

  // Parse keptAttachmentIds if provided
  let keptIds = null;
  if (keptAttachmentIds !== undefined) {
    if (Array.isArray(keptAttachmentIds)) {
      keptIds = new Set(keptAttachmentIds.map(String));
    } else if (typeof keptAttachmentIds === 'string') {
      try {
        const parsed = JSON.parse(keptAttachmentIds);
        if (Array.isArray(parsed)) {
          keptIds = new Set(parsed.map(String));
        } else {
          keptIds = new Set(keptAttachmentIds.split(',').map((s) => s.trim()).filter(Boolean));
        }
      } catch (_) {
        keptIds = new Set(keptAttachmentIds.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }
  }

  let updatedAttachments = doc.attachments || [];
  if (keptIds !== null) {
    const toKeep = [];
    for (const att of updatedAttachments) {
      if (keptIds.has(att._id.toString())) {
        toKeep.push(att);
      } else {
        const bucket = att.bucket || (att.fileType === 'pdf' ? 'documents' : 'media');
        await deleteFile(bucket, att.gridfsFileId).catch(() => {});
      }
    }
    updatedAttachments = toKeep;
  }

  // Upload new files if provided
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    for (const file of req.files) {
      const meta = classifyAndValidateFile(file);
      const gridfsFileId = await uploadBuffer(meta.bucket, file.buffer, file.originalname, meta.mimeType);
      updatedAttachments.push({
        gridfsFileId,
        fileName: file.originalname,
        fileType: meta.fileType,
        mimeType: meta.mimeType,
        size: file.size,
        bucket: meta.bucket,
      });
    }
  }

  doc.link = trimmedLink;
  doc.topic = trimmedTopic;
  doc.date = date;
  doc.learnings = typeof learnings === 'string' ? learnings : '';
  doc.attachments = updatedAttachments;
  await doc.save();

  res.status(200).json({ success: true, log: serialize(doc) });
});

/**
 * DELETE /api/placement/education/:courseId/logs/:logId
 * Deletes the course log and all associated GridFS attachment files.
 */
const deleteCourseLog = asyncHandler(async (req, res) => {
  const doc = await CourseLog.findOne({ _id: req.params.logId, courseId: req.params.courseId, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Log entry not found.');

  if (doc.attachments && doc.attachments.length > 0) {
    for (const att of doc.attachments) {
      const bucket = att.bucket || (att.fileType === 'pdf' ? 'documents' : 'media');
      await deleteFile(bucket, att.gridfsFileId).catch(() => {});
    }
  }

  await doc.deleteOne();
  res.status(200).json({ success: true, message: 'Log entry deleted.' });
});

/**
 * GET /api/placement/education/:courseId/logs/:logId/attachments/:attachmentId
 * Securely streams an attachment file from GridFS with authentication and ownership validation.
 */
const getCourseLogAttachment = asyncHandler(async (req, res) => {
  const { courseId, logId, attachmentId } = req.params;
  const log = await CourseLog.findOne({ _id: logId, courseId, userId: req.user.id });
  if (!log) throw new ApiError(404, 'Log entry not found.');

  const attachment = (log.attachments || []).find((a) => a._id.toString() === attachmentId);
  if (!attachment) throw new ApiError(404, 'Attachment not found.');

  const bucket = attachment.bucket || (attachment.fileType === 'pdf' ? 'documents' : 'media');
  res.setHeader('Content-Type', attachment.mimeType);
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName.replace(/"/g, '')}"`);
  }
  downloadToResponse(bucket, attachment.gridfsFileId, res);
});

module.exports = {
  listCourseLogs,
  createCourseLog,
  updateCourseLog,
  deleteCourseLog,
  getCourseLogAttachment,
};
