const mongoose = require('mongoose');

// Ported from coding-profiles.html/add-coding-profile.html's
// `codingProfilesData` localStorage array. The original stored the logo
// image as a Base64 data URL directly in the profile object - here it's
// streamed into GridFS's "media" bucket instead (see src/utils/gridfs.js),
// with only the file reference kept on the document, consistent with the
// architecture's general no-Base64-in-MongoDB principle (Phase 2, Section
// 2) rather than being a documents.html-only rule.
const codingProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Profile Name is required.'],
      trim: true,
    },
    link: {
      type: String,
      required: [true, 'Profile URL is required.'],
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    totalProblems: {
      type: Number,
      default: 0,
    },
    logoFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    logoContentType: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodingProfile', codingProfileSchema);
