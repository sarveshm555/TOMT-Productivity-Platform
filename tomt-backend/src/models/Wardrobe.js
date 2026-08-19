const mongoose = require('mongoose');

// Ported from dress-checker.html/wardrobe.html's `myWardrobeList`
// localStorage object ({shirts: [], pants: []}). One document per user,
// matching the original's single-object-per-browser storage exactly.
const wardrobeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    shirts: {
      type: [String],
      default: [],
    },
    pants: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wardrobe', wardrobeSchema);
