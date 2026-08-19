const DocumentMeta = require('../models/DocumentMeta');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/gridfs');

function serialize(doc) {
  return {
    id: doc._id,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    fileName: doc.fileName,
  };
}

/**
 * GET /api/placement/documents
 * Ported from the initial `renderDocs()` call - newest-first (matches the
 * original's `documents.unshift(newDoc)` insert order).
 */
const listDocuments = asyncHandler(async (req, res) => {
  const docs = await DocumentMeta.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, documents: docs.map(serialize) });
});

/**
 * POST /api/placement/documents
 * Ported from the document-form submit handler. The original converted the
 * file to a Base64 data URL via FileReader and stored it inline; here the
 * raw bytes are streamed straight into GridFS's "documents" bucket (see
 * src/utils/gridfs.js) and only the reference + metadata are persisted -
 * no Base64 anywhere in MongoDB.
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    throw new ApiError(400, 'Document Name is required.');
  }
  if (!req.file) {
    throw new ApiError(400, 'A file is required.');
  }

  const gridfsFileId = await uploadBuffer('documents', req.file.buffer, req.file.originalname, req.file.mimetype);

  const doc = await DocumentMeta.create({
    userId: req.user.id,
    name: trimmedName,
    type: req.file.mimetype.includes('pdf') ? 'PDF' : 'Image',
    size: req.file.size,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    gridfsFileId,
  });

  res.status(201).json({ success: true, document: serialize(doc) });
});

/**
 * GET /api/placement/documents/:id/file
 * Streams the actual file bytes from GridFS - replaces the original's
 * inline Base64 `dataUrl` used for both the view modal and download link.
 * `?download=true` sets Content-Disposition to attachment (matches the
 * original's separate downloadDoc() behavior); omitting it serves inline,
 * for the view modal's `<img>`/`<iframe>`.
 *
 * This endpoint requires the same JWT auth as every other API route - a
 * plain `<a href>` or `<img src>` can't attach that header, so the
 * frontend fetches this through the authenticated axios client and builds
 * a blob URL client-side, the same technique already established for
 * Coding Profile logos (AuthenticatedImage.jsx) - reused, not
 * reinvented, for both viewing and downloading here.
 */
const getDocumentFile = asyncHandler(async (req, res) => {
  const doc = await DocumentMeta.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Document not found.');

  res.setHeader('Content-Type', doc.mimeType);
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName.replace(/"/g, '')}"`);
  }
  downloadToResponse('documents', doc.gridfsFileId, res);
});

/**
 * DELETE /api/placement/documents/:id
 * Ported from deleteDoc(id) (the confirm() dialog is a frontend concern).
 * Removes both the metadata document and the underlying GridFS file.
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await DocumentMeta.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Document not found.');

  await deleteFile('documents', doc.gridfsFileId).catch(() => {});

  res.status(200).json({ success: true, message: 'Document deleted.' });
});

module.exports = {
  listDocuments,
  uploadDocument,
  getDocumentFile,
  deleteDocument,
};
