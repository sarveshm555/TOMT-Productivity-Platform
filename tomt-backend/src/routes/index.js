const express = require('express');
const authRoutes = require('./authRoutes');
const targetRoutes = require('./targetRoutes');
const rememberRoutes = require('./rememberRoutes');
const monitoringRoutes = require('./monitoringRoutes');
const dressCheckerRoutes = require('./dressCheckerRoutes');
const reflectionRoutes = require('./reflectionRoutes');
const routineRoutes = require('./routineRoutes');
const pendingTaskRoutes = require('./pendingTaskRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const notificationRoutes = require('./notificationRoutes');
const placementRoutes = require('./placementRoutes');
const diaryRoutes = require('./diaryRoutes');

const router = express.Router();

// Simple liveness check - useful for Render health checks and manual smoke testing.
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'TOMT backend is running' });
});

router.use('/auth', authRoutes);
router.use('/targets', targetRoutes);
router.use('/remember', rememberRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/dress-checker', dressCheckerRoutes);
router.use('/reflections', reflectionRoutes);
router.use('/routines', routineRoutes);
router.use('/pending-tasks', pendingTaskRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/notifications', notificationRoutes);
router.use('/placement', placementRoutes);
router.use('/diary', diaryRoutes);

// ---------------------------------------------------------------------
// Every business module from the approved architecture is now mounted.
// ---------------------------------------------------------------------

module.exports = router;
