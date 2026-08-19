const express = require('express');
const requireAuth = require('../middleware/auth');
const { listTasks, createTask, completeTask, rememberTask, deleteTask, clearAllTasks } = require('../controllers/scheduleController');

const router = express.Router();

router.use(requireAuth);

router.get('/tasks', listTasks);
router.post('/tasks', createTask);
router.patch('/tasks/:id/complete', completeTask);
router.patch('/tasks/:id/remember', rememberTask);
router.delete('/tasks/:id', deleteTask);
router.delete('/tasks', clearAllTasks);

module.exports = router;
