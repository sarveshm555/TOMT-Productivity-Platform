const mongoose = require('mongoose');

// Ported from personal-diary.html's `diarySettings` localStorage object.
// The original stored the writing-background image and both book covers
// as Base64 data URLs inline - here each is a reference into GridFS's
// "media" bucket instead (the same bucket already used for Coding
// Profile logos and Important Note images - not a new storage system).
// Front/back cover default to the static bundled images
// (diary_front.jpeg / diary_back.jpeg, ported as real frontend public
// assets) when no fileId is set, matching the original's
// DEFAULT_FRONT_COVER_PATH / DEFAULT_BACK_COVER_PATH fallback.
const diarySettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    textColor: {
      type: String,
      default: '#ffffff',
    },
    fontFamily: {
      type: String,
      default: 'Georgia, serif',
    },
    penStyle: {
      type: String,
      enum: ['default', 'pen-caret-thick'],
      default: 'default',
    },
    bgImageFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    bgImageContentType: {
      type: String,
      default: null,
    },
    frontCoverFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    frontCoverContentType: {
      type: String,
      default: null,
    },
    backCoverFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    backCoverContentType: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiarySettings', diarySettingsSchema);
