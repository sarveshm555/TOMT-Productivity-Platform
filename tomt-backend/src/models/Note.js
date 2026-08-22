const mongoose = require('mongoose');

// Ported from importantnote.html's `inspirationNoteLog` localStorage array.
// The original stored the optional image as a Base64 data URL inline -
// here it's streamed into GridFS's "media" bucket instead (the same
// bucket/mechanism already used for Coding Profile logos - see
// CodingProfile.js and src/utils/gridfs.js - not a new storage system).
const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ['placement', 'space_for_you'],
      default: 'space_for_you',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name / Title is required.'],
      trim: true,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Inspiration / Message is required.'],
    },
    imageFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    imageContentType: {
      type: String,
      default: null,
    },
    // Ported 1:1 from importantnote.html's `date: new Date().toLocaleDateString()`.
    // Preserves the original save-time date string for historical notes
    // and captures current date for newly created notes.
    date: {
      type: String,
      trim: true,
      default: () => new Date().toLocaleDateString(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
