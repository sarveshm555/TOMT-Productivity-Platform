const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const {
  listSpaceNotes,
  getSpaceNoteImage,
  createSpaceNote,
  updateSpaceNote,
  deleteSpaceNote,
} = require('../controllers/spaceForYouController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/notes', listSpaceNotes);
router.get('/notes/:id/image', getSpaceNoteImage);
router.post('/notes', upload.single('image'), createSpaceNote);
router.put('/notes/:id', upload.single('image'), updateSpaceNote);
router.delete('/notes/:id', deleteSpaceNote);

module.exports = router;
