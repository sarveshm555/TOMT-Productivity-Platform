const RoutineConfig = require('../models/RoutineConfig');
const RoutineHistory = require('../models/RoutineHistory');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function resolveType(req) {
  const type = req.params.type;
  if (type !== 'health' && type !== 'professional') {
    throw new ApiError(400, 'Routine type must be "health" or "professional".');
  }
  return type;
}

async function getOrCreateConfig(userId, routineType) {
  let doc = await RoutineConfig.findOne({ userId, routineType });
  if (!doc) {
    doc = await RoutineConfig.create({ userId, routineType, queries: [] });
  }
  return doc;
}

/**
 * GET /api/routines/:type/config
 * Ported from loadConfig().
 */
const getConfig = asyncHandler(async (req, res) => {
  const routineType = resolveType(req);
  const doc = await getOrCreateConfig(req.user.id, routineType);
  res.status(200).json({ success: true, queries: doc.queries });
});

/**
 * POST /api/routines/:type/config
 * Ported from the add-query-form submit handler.
 */
const addConfigQuery = asyncHandler(async (req, res) => {
  const routineType = resolveType(req);
  const { name, type, unit, elements, hasText, textPlaceholder, mainPlaceholder } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'Query name is required.');
  }
  if (!['number', 'yn', 'select', 'text'].includes(type)) {
    throw new ApiError(400, 'Invalid query type.');
  }

  const key = name.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '');

  const doc = await getOrCreateConfig(req.user.id, routineType);
  doc.queries.push({
    queryId: Date.now(),
    name: name.trim(),
    key,
    type,
    unit: unit || '',
    elements: typeof elements === 'string' ? elements.split(',').map((s) => s.trim()) : Array.isArray(elements) ? elements : [],
    hasText: Boolean(hasText),
    textPlaceholder: textPlaceholder || '',
    mainPlaceholder: mainPlaceholder || '',
  });
  await doc.save();

  res.status(201).json({ success: true, queries: doc.queries });
});

/**
 * DELETE /api/routines/:type/config/:queryId
 * Ported from deleteQuery(id) (the confirm() dialog is a frontend concern).
 */
const deleteConfigQuery = asyncHandler(async (req, res) => {
  const routineType = resolveType(req);
  const queryId = Number(req.params.queryId);

  const doc = await getOrCreateConfig(req.user.id, routineType);
  doc.queries = doc.queries.filter((q) => q.queryId !== queryId);
  await doc.save();

  res.status(200).json({ success: true, queries: doc.queries });
});

function serializeHistoryEntry(doc) {
  return {
    id: doc._id,
    date: doc.date,
    data: doc.data,
  };
}

/**
 * GET /api/routines/:type/history
 * Ported from getHistory() - newest first, matching the original's
 * `history.unshift(...)` insert-at-front behavior.
 */
const listHistory = asyncHandler(async (req, res) => {
  const routineType = resolveType(req);
  const docs = await RoutineHistory.find({ userId: req.user.id, routineType }).sort({ date: -1 });
  res.status(200).json({ success: true, history: docs.map(serializeHistoryEntry) });
});

/**
 * POST /api/routines/:type/history
 * Ported from the daily-log-form submit handler.
 */
const createHistoryEntry = asyncHandler(async (req, res) => {
  const routineType = resolveType(req);
  const { data } = req.body;

  if (!data || typeof data !== 'object') {
    throw new ApiError(400, 'Entry data is required.');
  }

  const doc = await RoutineHistory.create({
    userId: req.user.id,
    routineType,
    date: new Date(),
    data,
  });

  res.status(201).json({ success: true, entry: serializeHistoryEntry(doc) });
});

/**
 * DELETE /api/routines/:type/history/:id
 * Ported from deleteEntry(index)/deleteHistoryItem(index) - id-based here
 * instead of array-index-based, which is the correct normalization for a
 * real database (index-based deletion is racy once storage isn't a single
 * client-side array).
 */
const deleteHistoryEntry = asyncHandler(async (req, res) => {
  resolveType(req);
  const doc = await RoutineHistory.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'History entry not found.');
  res.status(200).json({ success: true, message: 'Entry deleted.' });
});

module.exports = {
  getConfig,
  addConfigQuery,
  deleteConfigQuery,
  listHistory,
  createHistoryEntry,
  deleteHistoryEntry,
};
