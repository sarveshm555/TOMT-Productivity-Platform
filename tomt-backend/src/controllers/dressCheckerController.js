const Wardrobe = require('../models/Wardrobe');
const OutfitRule = require('../models/OutfitRule');
const { DAYS, defaultRules } = require('../models/OutfitRule');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function getOrCreateWardrobe(userId) {
  let wardrobe = await Wardrobe.findOne({ userId });
  if (!wardrobe) {
    wardrobe = await Wardrobe.create({ userId, shirts: [], pants: [] });
  }
  return wardrobe;
}

async function getOrCreateRules(userId) {
  let doc = await OutfitRule.findOne({ userId });
  if (!doc) {
    doc = await OutfitRule.create({ userId, rules: defaultRules() });
  }
  return doc;
}

/**
 * GET /api/dress-checker/wardrobe
 * Ported from safeGetWardrobe().
 */
const getWardrobe = asyncHandler(async (req, res) => {
  const wardrobe = await getOrCreateWardrobe(req.user.id);
  res.status(200).json({ success: true, wardrobe: { shirts: wardrobe.shirts, pants: wardrobe.pants } });
});

/**
 * POST /api/dress-checker/wardrobe/items
 * Ported from the add-item-form submit handler - no-op if the item
 * already exists in that category (matches the original's `if
 * (!w[type].includes(name))` guard).
 */
const addWardrobeItem = asyncHandler(async (req, res) => {
  const { type, name } = req.body;
  if (type !== 'shirt' && type !== 'pant') {
    throw new ApiError(400, 'Item type must be "shirt" or "pant".');
  }
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    throw new ApiError(400, 'Item name is required.');
  }

  const field = type === 'pant' ? 'pants' : 'shirts';
  const wardrobe = await getOrCreateWardrobe(req.user.id);
  if (!wardrobe[field].includes(trimmedName)) {
    wardrobe[field].push(trimmedName);
    await wardrobe.save();
  }

  res.status(200).json({ success: true, wardrobe: { shirts: wardrobe.shirts, pants: wardrobe.pants } });
});

/**
 * DELETE /api/dress-checker/wardrobe/items
 * Ported from deleteItem(type, name) (the confirm() dialog itself is a
 * frontend concern).
 */
const deleteWardrobeItem = asyncHandler(async (req, res) => {
  const { type, name } = req.body;
  if (type !== 'shirt' && type !== 'pant') {
    throw new ApiError(400, 'Item type must be "shirt" or "pant".');
  }

  const field = type === 'pant' ? 'pants' : 'shirts';
  const wardrobe = await getOrCreateWardrobe(req.user.id);
  wardrobe[field] = wardrobe[field].filter((item) => item !== name);
  await wardrobe.save();

  res.status(200).json({ success: true, wardrobe: { shirts: wardrobe.shirts, pants: wardrobe.pants } });
});

/**
 * GET /api/dress-checker/rules
 * Ported from getDayRules().
 */
const getRules = asyncHandler(async (req, res) => {
  const doc = await getOrCreateRules(req.user.id);
  res.status(200).json({ success: true, rules: doc.rules });
});

/**
 * PUT /api/dress-checker/rules
 * Ported from the save-day-rules-btn handler - saves the whole week's
 * selections at once, exactly like the original.
 */
const saveRules = asyncHandler(async (req, res) => {
  const { rules } = req.body;
  if (!rules || typeof rules !== 'object') {
    throw new ApiError(400, 'Rules payload is required.');
  }

  const doc = await getOrCreateRules(req.user.id);
  doc.rules = rules;
  doc.markModified('rules');
  await doc.save();

  res.status(200).json({ success: true, rules: doc.rules });
});

/**
 * DELETE /api/dress-checker/rules
 * Ported from clear-rules-btn - resets to the default empty shape rather
 * than deleting the document (matches the original's `localStorage.removeItem`
 * + `getDayRules()`'s fallback default on next read).
 */
const resetRules = asyncHandler(async (req, res) => {
  const doc = await getOrCreateRules(req.user.id);
  doc.rules = defaultRules();
  doc.markModified('rules');
  await doc.save();
  res.status(200).json({ success: true, rules: doc.rules });
});

/**
 * Ported 1:1 from dress-checker.html's generateOutfit(dt). `dt` here is a
 * plain ISO date string (YYYY-MM-DD) from the query param, parsed the same
 * way the original parsed a JS Date's getDay().
 */
function generateOutfit(dateStr, wardrobe, rules) {
  const dt = new Date(`${dateStr}T00:00:00`);
  const idx = dt.getDay();
  if (idx === 0) return { status: 'off', text: 'Sunday: Enjoy your day off!' };

  const dayKey = DAYS[idx - 1];
  const dayRule = rules[dayKey] || { shirts: [], pants: [] };

  const availableShirts = dayRule.shirts.filter((s) => wardrobe.shirts.includes(s));
  const availablePants = dayRule.pants.filter((p) => wardrobe.pants.includes(p));

  let finalShirt;
  let finalPant;

  if (availableShirts.length && availablePants.length) {
    finalShirt = availableShirts[Math.floor(Math.random() * availableShirts.length)];
    finalPant = availablePants[Math.floor(Math.random() * availablePants.length)];
  } else if (wardrobe.shirts.length && wardrobe.pants.length) {
    finalShirt = wardrobe.shirts[Math.floor(Math.random() * wardrobe.shirts.length)];
    finalPant = wardrobe.pants[Math.floor(Math.random() * wardrobe.pants.length)];
  } else {
    return { status: 'error', text: 'Wardrobe is empty. Please add items!' };
  }

  return { status: 'ok', shirt: finalShirt, pant: finalPant };
}

/**
 * GET /api/dress-checker/suggest?date=YYYY-MM-DD
 * Ported from display(dt) - moves the random-pick logic server-side so it
 * has access to the persisted wardrobe/rules; the frontend just renders
 * whatever comes back, same shape as before (status/shirt/pant or
 * status/text).
 */
const suggestOutfit = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    throw new ApiError(400, 'A date query parameter (YYYY-MM-DD) is required.');
  }

  const [wardrobe, rulesDoc] = await Promise.all([getOrCreateWardrobe(req.user.id), getOrCreateRules(req.user.id)]);
  const result = generateOutfit(date, wardrobe, rulesDoc.rules);

  res.status(200).json({ success: true, result });
});

module.exports = {
  getWardrobe,
  addWardrobeItem,
  deleteWardrobeItem,
  getRules,
  saveRules,
  resetRules,
  suggestOutfit,
};
