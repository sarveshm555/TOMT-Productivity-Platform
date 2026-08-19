const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listApplyTasks,
  createApplyTask,
  updateApplyTask,
  markApplied,
  deleteApplyTask,
} = require('../controllers/applyTaskController');
const {
  listOngoingTasks,
  createOngoingTask,
  updateOngoingTask,
  markDone,
  deleteOngoingTask,
} = require('../controllers/ongoingTaskController');

const router = express.Router();

router.use(requireAuth);

// /api/monitoring/apply - needtoapply.html
router.get('/apply', listApplyTasks);
router.post('/apply', createApplyTask);
router.put('/apply/:id', updateApplyTask);
router.patch('/apply/:id/mark-applied', markApplied);
router.delete('/apply/:id', deleteApplyTask);

// /api/monitoring/ongoing - ongoing.html
router.get('/ongoing', listOngoingTasks);
router.post('/ongoing', createOngoingTask);
router.put('/ongoing/:id', updateOngoingTask);
router.patch('/ongoing/:id/mark-done', markDone);
router.delete('/ongoing/:id', deleteOngoingTask);

module.exports = router;
