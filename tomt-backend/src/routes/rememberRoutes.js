const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listRememberTasks,
  createRememberTask,
  completeRememberTask,
  deleteRememberTask,
} = require('../controllers/rememberController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listRememberTasks);
router.post('/', createRememberTask);
router.patch('/:id/complete', completeRememberTask);
router.delete('/:id', deleteRememberTask);

module.exports = router;
