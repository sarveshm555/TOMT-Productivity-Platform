const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Internship', internshipSchema);

