const express = require('express');
const requireAuth = require('../middleware/auth');
const { listTargets, createTarget, updateTarget, deleteTarget } = require('../controllers/targetController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listTargets);
router.post('/', createTarget);
router.put('/:id', updateTarget);
router.delete('/:id', deleteTarget);

module.exports = router;
