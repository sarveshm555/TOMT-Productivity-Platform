const mongoose = require('mongoose');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function defaultRules() {
  const rules = {};
  DAYS.forEach((d) => {
    rules[d] = { shirts: [], pants: [] };
  });
  return rules;
}

// Ported from wardrobe.html's `dayWiseOutfitRules` localStorage object -
// one document per user, `rules` mirrors the original's exact shape:
// { monday: {shirts:[], pants:[]}, tuesday: {...}, ... saturday: {...} }
// (no Sunday key - the original treats Sunday as always off, see
// dress-checker.html's generateOutfit()).
const outfitRuleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    rules: {
      type: mongoose.Schema.Types.Mixed,
      default: defaultRules,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OutfitRule', outfitRuleSchema);
module.exports.DAYS = DAYS;
module.exports.defaultRules = defaultRules;
