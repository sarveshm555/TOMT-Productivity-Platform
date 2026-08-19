const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  getWardrobe,
  addWardrobeItem,
  deleteWardrobeItem,
  getRules,
  saveRules,
  resetRules,
  suggestOutfit,
} = require('../controllers/dressCheckerController');

const router = express.Router();

router.use(requireAuth);

router.get('/wardrobe', getWardrobe);
router.post('/wardrobe/items', addWardrobeItem);
router.delete('/wardrobe/items', deleteWardrobeItem);

router.get('/rules', getRules);
router.put('/rules', saveRules);
router.delete('/rules', resetRules);

router.get('/suggest', suggestOutfit);

module.exports = router;
