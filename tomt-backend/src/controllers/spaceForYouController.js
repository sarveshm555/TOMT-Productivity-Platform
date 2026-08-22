const Note = require('../models/Note');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/gridfs');

function serialize(doc) {
  return {
    id: doc._id,
    name: doc.name,
    link: doc.link,
    message: doc.message,
    date: doc.date || (doc.createdAt ? doc.createdAt.toLocaleDateString() : new Date().toLocaleDateString()),
    imageUrl: doc.imageFileId ? `/space-for-you/notes/${doc._id}/image` : null,
  };
}

/**
 * GET /api/space-for-you/notes
 * Fetches all space notes for current user, newest first.
 */
const listSpaceNotes = asyncHandler(async (req, res) => {
  const docs = await Note.find({ userId: req.user.id, scope: 'space_for_you' }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, notes: docs.map(serialize) });
});

/**
 * GET /api/space-for-you/notes/:id/image
 * Streams the note's attachment image from GridFS media bucket.
 */
const getSpaceNoteImage = asyncHandler(async (req, res) => {
  const doc = await Note.findOne({ _id: req.params.id, userId: req.user.id, scope: 'space_for_you' });
  if (!doc || !doc.imageFileId) throw new ApiError(404, 'Image not found.');

  res.setHeader('Content-Type', doc.imageContentType || 'application/octet-stream');
  downloadToResponse('media', doc.imageFileId, res);
});

/**
 * POST /api/space-for-you/notes
 * Creates a new Space for You note (expects multipart/form-data, image optional).
 */
const createSpaceNote = asyncHandler(async (req, res) => {
  const { name, link, message } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedName || !trimmedMessage) {
    throw new ApiError(400, 'Title and Message content are required.');
  }

  let imageFileId = null;
  let imageContentType = null;
  if (req.file) {
    imageFileId = await uploadBuffer('media', req.file.buffer, req.file.originalname, req.file.mimetype);
    imageContentType = req.file.mimetype;
  }

  const doc = await Note.create({
    userId: req.user.id,
    scope: 'space_for_you',
    name: trimmedName,
    link: typeof link === 'string' ? link.trim() : '',
    message: trimmedMessage,
    date: new Date().toLocaleDateString(),
    imageFileId,
    imageContentType,
  });

  res.status(201).json({ success: true, note: serialize(doc) });
});

/**
 * PUT /api/space-for-you/notes/:id
 * Updates an existing Space for You note.
 */
const updateSpaceNote = asyncHandler(async (req, res) => {
  const { name, link, message } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedName || !trimmedMessage) {
    throw new ApiError(400, 'Title and Message content are required.');
  }

  const doc = await Note.findOne({ _id: req.params.id, userId: req.user.id, scope: 'space_for_you' });
  if (!doc) throw new ApiError(404, 'Note not found.');

  doc.name = trimmedName;
  doc.link = typeof link === 'string' ? link.trim() : '';
  doc.message = trimmedMessage;

  if (req.file) {
    if (doc.imageFileId) {
      await deleteFile('media', doc.imageFileId).catch(() => {});
    }
    doc.imageFileId = await uploadBuffer('media', req.file.buffer, req.file.originalname, req.file.mimetype);
    doc.imageContentType = req.file.mimetype;
  }

  await doc.save();
  res.status(200).json({ success: true, note: serialize(doc) });
});

/**
 * DELETE /api/space-for-you/notes/:id
 * Deletes a Space for You note and cleans up GridFS media if present.
 */
const deleteSpaceNote = asyncHandler(async (req, res) => {
  const doc = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id, scope: 'space_for_you' });
  if (!doc) throw new ApiError(404, 'Note not found.');

  if (doc.imageFileId) {
    await deleteFile('media', doc.imageFileId).catch(() => {});
  }

  res.status(200).json({ success: true, message: 'Note deleted.' });
});

module.exports = {
  listSpaceNotes,
  getSpaceNoteImage,
  createSpaceNote,
  updateSpaceNote,
  deleteSpaceNote,
};
