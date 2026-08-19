const { Readable } = require('stream');
const { ObjectId } = require('mongodb');
const { getDocumentsBucket, getMediaBucket } = require('../config/db');

/**
 * Foundation-level GridFS helpers. Not wired to any route yet -
 * Phase 3.1 is backend foundation only (no business modules such as
 * documents.html or wardrobe.html are being migrated in this phase).
 * These are ready for Phase 3.2+ to import and use directly.
 */

function resolveBucket(bucketName) {
  if (bucketName === 'media') return getMediaBucket();
  if (bucketName === 'documents') return getDocumentsBucket();
  throw new Error(`[gridfs] Unknown bucket name "${bucketName}". Use "documents" or "media".`);
}

/**
 * Streams a Buffer into the requested GridFS bucket.
 * Resolves with the newly created file's ObjectId.
 *
 * @param {'documents'|'media'} bucketName
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} [contentType]
 * @returns {Promise<ObjectId>}
 */
function uploadBuffer(bucketName, buffer, filename, contentType) {
  return new Promise((resolve, reject) => {
    const bucket = resolveBucket(bucketName);
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: contentType || 'application/octet-stream',
    });

    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
}

/**
 * Pipes a GridFS file directly to an HTTP response stream.
 * Caller is responsible for setting res headers (content-type, etc.)
 * before invoking this, if desired.
 *
 * @param {'documents'|'media'} bucketName
 * @param {string|ObjectId} fileId
 * @param {import('express').Response} res
 */
function downloadToResponse(bucketName, fileId, res) {
  const bucket = resolveBucket(bucketName);
  const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
  const downloadStream = bucket.openDownloadStream(objectId);

  downloadStream.on('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, message: 'File not found.' });
    }
  });

  downloadStream.pipe(res);
}

/**
 * Permanently deletes a file (and its chunks) from GridFS.
 *
 * @param {'documents'|'media'} bucketName
 * @param {string|ObjectId} fileId
 */
async function deleteFile(bucketName, fileId) {
  const bucket = resolveBucket(bucketName);
  const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
  await bucket.delete(objectId);
}

/**
 * Reads an entire GridFS file into a Buffer. Used when a file's bytes
 * need to be duplicated into a NEW GridFS file (e.g. Personal Diary
 * snapshotting the current writing-background image into each saved
 * entry, so a later settings change can never retroactively alter what
 * an already-saved entry displays - the original achieved the same
 * "frozen copy" independence by storing a full Base64 copy per entry).
 *
 * @param {'documents'|'media'} bucketName
 * @param {string|ObjectId} fileId
 * @returns {Promise<Buffer>}
 */
function downloadToBuffer(bucketName, fileId) {
  return new Promise((resolve, reject) => {
    const bucket = resolveBucket(bucketName);
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  uploadBuffer,
  downloadToResponse,
  downloadToBuffer,
  deleteFile,
};
