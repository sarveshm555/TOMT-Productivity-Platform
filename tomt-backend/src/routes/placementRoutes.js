const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const {
  listInternships,
  createInternship,
  updateInternship,
  updateStatus,
  deleteInternship,
} = require('../controllers/internshipController');
const {
  listCodingProfiles,
  getCodingProfile,
  getProfileLogo,
  createCodingProfile,
  updateCodingProfile,
  deleteCodingProfile,
} = require('../controllers/codingProfileController');
const { listLogs, createLog, updateLog, deleteLog } = require('../controllers/codingLogController');
const { listCourses, getCourse, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { listCourseLogs, createCourseLog, updateCourseLog, deleteCourseLog } = require('../controllers/courseLogController');
const { listDocuments, uploadDocument, getDocumentFile, deleteDocument } = require('../controllers/documentController');
const { listProfileLinks, createProfileLink, deleteProfileLink } = require('../controllers/profileLinkController');
const { listNotes, getNoteImage, createNote, updateNote, deleteNote } = require('../controllers/noteController');

const router = express.Router();

// In-memory storage: files are streamed straight into GridFS (see
// src/utils/gridfs.js), never written to local disk or kept as Base64.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

// /api/placement/internships - internship-tracker.html + add-internship.html
router.get('/internships', listInternships);
router.post('/internships', createInternship);
router.put('/internships/:id', updateInternship);
router.patch('/internships/:id/status', updateStatus);
router.delete('/internships/:id', deleteInternship);

// /api/placement/coding-profiles - coding-profiles.html + add-coding-profile.html
router.get('/coding-profiles', listCodingProfiles);
router.get('/coding-profiles/:id', getCodingProfile);
router.get('/coding-profiles/:id/logo', getProfileLogo);
router.post('/coding-profiles', upload.single('logo'), createCodingProfile);
router.put('/coding-profiles/:id', upload.single('logo'), updateCodingProfile);
router.delete('/coding-profiles/:id', deleteCodingProfile);

// /api/placement/coding-profiles/:profileId/logs - daily-coding-log.html
router.get('/coding-profiles/:profileId/logs', listLogs);
router.post('/coding-profiles/:profileId/logs', createLog);
router.put('/coding-profiles/:profileId/logs/:logId', updateLog);
router.delete('/coding-profiles/:profileId/logs/:logId', deleteLog);

// /api/placement/education - education-notes.html
router.get('/education', listCourses);
router.get('/education/:id', getCourse);
router.post('/education', createCourse);
router.put('/education/:id', updateCourse);
router.delete('/education/:id', deleteCourse);

// /api/placement/education/:courseId/logs - daily-learning-tracker.html
router.get('/education/:courseId/logs', listCourseLogs);
router.post('/education/:courseId/logs', createCourseLog);
router.put('/education/:courseId/logs/:logId', updateCourseLog);
router.delete('/education/:courseId/logs/:logId', deleteCourseLog);

// /api/placement/documents - documents.html
// Reuses the SAME `upload` multer instance (memoryStorage, streamed to
// GridFS) declared above for coding-profile logos - not a second
// file-storage mechanism.
router.get('/documents', listDocuments);
router.post('/documents', upload.single('file'), uploadDocument);
router.get('/documents/:id/file', getDocumentFile);
router.delete('/documents/:id', deleteDocument);

// /api/placement/links - infocopy.html
router.get('/links', listProfileLinks);
router.post('/links', createProfileLink);
router.delete('/links/:id', deleteProfileLink);

// /api/placement/notes - importantnote.html
// Reuses the SAME `upload` multer instance declared above - not a second
// file-storage mechanism.
router.get('/notes', listNotes);
router.get('/notes/:id/image', getNoteImage);
router.post('/notes', upload.single('image'), createNote);
router.put('/notes/:id', upload.single('image'), updateNote);
router.delete('/notes/:id', deleteNote);

// ---------------------------------------------------------------------
// Placement Progress is now fully migrated (internships, coding profiles
// + logs, education + logs, documents, links, notes). Personal Diary is
// a separate top-level module, mounted in routes/index.js.
// ---------------------------------------------------------------------

module.exports = router;
