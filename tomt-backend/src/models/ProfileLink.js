const mongoose = require('mongoose');

// Ported from infocopy.html's `importantProfileLinks` localStorage array.
const profileLinkSchema = new mongoose.Schema(
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
      required: [true, 'Link is required.'],
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProfileLink', profileLinkSchema);
