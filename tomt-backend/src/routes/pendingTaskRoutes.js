const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listPendingTasks,
  createPendingTask,
  completePendingTask,
  deletePendingTask,
  moveAllToSchedule,
  listHistory,
} = require('../controllers/pendingTaskController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listPendingTasks);
router.post('/', createPendingTask);
router.patch('/:id/complete', completePendingTask);
router.delete('/:id', deletePendingTask);
router.post('/move-all-to-schedule', moveAllToSchedule);
router.get('/history', listHistory);

module.exports = router;
