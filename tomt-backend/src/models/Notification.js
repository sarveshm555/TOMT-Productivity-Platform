const mongoose = require('mongoose');

// Ported from notifications.html's `lifeManagerNotifications` localStorage
// array. The original persists generated notifications across visits
// (deduped by header+type, only removed by the Clear button or the
// pending-summary's own refresh-in-place logic) - this is a real
// persisted collection, not a purely recomputed-on-read view.
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    header: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
