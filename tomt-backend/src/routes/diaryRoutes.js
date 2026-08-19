const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const {
  getSettings,
  updateSettings,
  getBgImage,
  getFrontCover,
  getBackCover,
  listEntries,
  getEntry,
  getEntryBgImage,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/diaryController');

const router = express.Router();

// Same in-memory storage strategy as placementRoutes.js's `upload` -
// files are streamed straight into GridFS, never written to disk or kept
// as Base64. A separate multer instance is needed only because this
// route accepts three independently-optional named file fields
// (bgImage/frontCover/backCover) via `.fields()`, not a single `.single()`
// file - same underlying mechanism, not a second file-storage system.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadSettingsImages = upload.fields([
  { name: 'bgImage', maxCount: 1 },
  { name: 'frontCover', maxCount: 1 },
  { name: 'backCover', maxCount: 1 },
]);

router.use(requireAuth);

router.get('/settings', getSettings);
router.put('/settings', uploadSettingsImages, updateSettings);
router.get('/settings/bg-image', getBgImage);
router.get('/settings/front-cover', getFrontCover);
router.get('/settings/back-cover', getBackCover);

router.get('/entries', listEntries);
router.get('/entries/:id', getEntry);
router.get('/entries/:id/bg-image', getEntryBgImage);
router.post('/entries', createEntry);
router.put('/entries/:id', updateEntry);
router.delete('/entries/:id', deleteEntry);

module.exports = router;
