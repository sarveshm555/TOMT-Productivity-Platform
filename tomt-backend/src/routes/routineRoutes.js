const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  getConfig,
  addConfigQuery,
  deleteConfigQuery,
  listHistory,
  createHistoryEntry,
  deleteHistoryEntry,
} = require('../controllers/routineController');

const router = express.Router();

router.use(requireAuth);

// :type is "health" or "professional" - see routineController.js's resolveType()
router.get('/:type/config', getConfig);
router.post('/:type/config', addConfigQuery);
router.delete('/:type/config/:queryId', deleteConfigQuery);

router.get('/:type/history', listHistory);
router.post('/:type/history', createHistoryEntry);
router.delete('/:type/history/:id', deleteHistoryEntry);

module.exports = router;
