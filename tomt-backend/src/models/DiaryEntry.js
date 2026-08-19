const mongoose = require('mongoose');

// Ported from personal-diary.html/view.html's `diaryHistory` localStorage
// array. Each entry carries its OWN theme snapshot (textColor, fontFamily,
// background image) captured at save time - the original achieved this by
// copying the current settings' Base64 bgImage directly into the entry
// object, so a later settings change could never retroactively alter an
// already-saved entry's appearance. Here that same independence is
// preserved by duplicating the GridFS file itself into a new file per
// entry (see diaryController.js's use of gridfs.js's downloadToBuffer +
// uploadBuffer) rather than sharing a reference to the settings' file.
const diaryEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'The diary entry cannot be empty.'],
    },
    dateTime: {
      type: Date,
      required: true,
    },
    // Ported 1:1 from the original's `displayDateTime` - frozen at save
    // time (`en-GB` date + `en-US` 12-hour time), NOT recomputed from
    // `dateTime` on every view. Recomputing on read would use the
    // viewer's current locale/timezone instead of the save-time one,
    // which is a real (if subtle) behavior difference from the original.
    displayDateTime: {
      type: String,
      required: true,
    },
    theme: {
      textColor: { type: String, default: '#ffffff' },
      fontFamily: { type: String, default: 'Georgia, serif' },
      bgImageFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
      bgImageContentType: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiaryEntry', diaryEntrySchema);
