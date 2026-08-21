const express = require('express');
const requireAuth = require('../middleware/auth');
const { status, setup, register, login, refresh, logout, resetPassword, me, updateMotivation } = require('../controllers/authController');

const router = express.Router();

router.get('/status', status);
router.post('/register', register);
router.post('/setup', setup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, me);
router.put('/motivation', requireAuth, updateMotivation);

module.exports = router;

