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
    // Ported 1:1 from the original's `date: new Date().toLocaleDateString()`,
    // computed at creation time and never updated on edit (matches the
    // original, which also never refreshed `date` in editNote()).
    date: doc.date || (doc.createdAt ? doc.createdAt.toLocaleDateString() : new Date().toLocaleDateString()),
    imageUrl: doc.imageFileId ? `/placement/notes/${doc._id}/image` : null,
  };
}

/**
 * GET /api/placement/notes
 * Ported from loadNotes() - newest-first (matches the original's
 * `notes.unshift(newNote)` insert order for new notes).
 */
const listNotes = asyncHandler(async (req, res) => {
  const docs = await Note.find({ userId: req.user.id, scope: { $in: ['placement', 'space_for_you'] } }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, notes: docs.map(serialize) });
});

/**
 * GET /api/placement/notes/:id/image
 * Streams the note's image from GridFS - replaces the original's inline
 * Base64 background-image/img src.
 */
const getNoteImage = asyncHandler(async (req, res) => {
  const doc = await Note.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc || !doc.imageFileId) throw new ApiError(404, 'Image not found.');

  res.setHeader('Content-Type', doc.imageContentType || 'application/octet-stream');
  downloadToResponse('media', doc.imageFileId, res);
});

/**
 * POST /api/placement/notes
 * Ported from the note-form submit handler's create branch (no
 * `note-id-hidden` value). Expects multipart/form-data (image optional).
 */
const createNote = asyncHandler(async (req, res) => {
  const { name, link, message } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedName || !trimmedMessage) {
    throw new ApiError(400, 'Name / Title and Inspiration / Message are required.');
  }

  let imageFileId = null;
  let imageContentType = null;
  if (req.file) {
    imageFileId = await uploadBuffer('media', req.file.buffer, req.file.originalname, req.file.mimetype);
    imageContentType = req.file.mimetype;
  }

  const doc = await Note.create({
    userId: req.user.id,
    scope: 'placement',
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
 * PUT /api/placement/notes/:id
 * Ported from the note-form submit handler's edit branch. A new image
 * replaces the old one (old GridFS file deleted); omitting a new file
 * keeps the existing image, matching the original's
 * `image: currentImageData` fallback.
 */
const updateNote = asyncHandler(async (req, res) => {
  const { name, link, message } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedName || !trimmedMessage) {
    throw new ApiError(400, 'Name / Title and Inspiration / Message are required.');
  }

  const doc = await Note.findOne({ _id: req.params.id, userId: req.user.id });
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
 * DELETE /api/placement/notes/:id
 * Ported from deleteNote(id) (the confirm() dialog is a frontend concern).
 * Also removes the GridFS image file, if any.
 */
const deleteNote = asyncHandler(async (req, res) => {
  const doc = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Note not found.');

  if (doc.imageFileId) {
    await deleteFile('media', doc.imageFileId).catch(() => {});
  }

  res.status(200).json({ success: true, message: 'Note deleted.' });
});

module.exports = {
  listNotes,
  getNoteImage,
  createNote,
  updateNote,
  deleteNote,
};
