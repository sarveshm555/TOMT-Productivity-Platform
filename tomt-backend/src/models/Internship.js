const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Message text is required.'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const imageSchema = new mongoose.Schema(
  {
    gridfsFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    bucket: {
      type: String,
      enum: ['media', 'documents'],
      default: 'media',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Ported from internship-tracker.html/add-internship.html's
// `internshipApplications` localStorage array.
const internshipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company Name is required.'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role Applied For is required.'],
      trim: true,
    },
    dateApplied: {
      type: String, // "YYYY-MM-DD", matches the original's plain date string
      required: true,
    },
    status: {
      type: String,
      enum: ['NeedToApply', 'Applied', 'Interview', 'Offer', 'Rejected'],
      default: 'NeedToApply',
    },
    mistakeMessage: {
      type: String,
      default: '',
    },
    trackLinks: [
      {
        label: {
          type: String,
          default: '',
          trim: true,
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    messages: {
      type: [messageSchema],
      default: [],
    },
    images: {
      type: [imageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Internship', internshipSchema);

