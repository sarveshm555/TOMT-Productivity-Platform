const mongoose = require('mongoose');

// Ported from documents.html's `userImportantDocuments` localStorage array.
// The original stored the file itself as a Base64 `dataUrl` directly on
// this object - here only metadata is stored on the document; the actual
// bytes live in GridFS's "documents" bucket (see src/utils/gridfs.js,
// already built in Phase 3.1 and reused - not a new storage mechanism -
// by both this module and Coding Profiles' logo upload).
const documentMetaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Document Name is required.'],
      trim: true,
    },
    // Ported 1:1 from the original's `file.type.includes('pdf') ? 'PDF' : 'Image'`.
    type: {
      type: String,
      enum: ['PDF', 'Image'],
      required: true,
    },
    size: {
      type: Number, // bytes, matches the original's `file.size`
      required: true,
    },
    fileName: {
      type: String, // original filename, used for the download's `a.download` attribute
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    gridfsFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocumentMeta', documentMetaSchema);
