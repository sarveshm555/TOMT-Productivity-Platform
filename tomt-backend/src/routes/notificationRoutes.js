const express = require('express');
const requireAuth = require('../middleware/auth');
const { listNotifications, clearAllNotifications } = require('../controllers/notificationController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listNotifications);
router.delete('/', clearAllNotifications);

module.exports = router;
