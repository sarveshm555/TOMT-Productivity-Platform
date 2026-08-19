const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listQuestions,
  addQuestion,
  removeQuestion,
  listEntries,
  saveEntry,
  clearEntries,
} = require('../controllers/reflectionController');
const { listProblems, createProblem, deleteProblem, clearProblems } = require('../controllers/problemController');

const router = express.Router();

router.use(requireAuth);

// /api/reflections/questions - powerful_questions.html's question editor
router.get('/questions', listQuestions);
router.post('/questions', addQuestion);
router.delete('/questions/:index', removeQuestion);

// /api/reflections/entries - powerful_questions.html's diary entries
router.get('/entries', listEntries);
router.post('/entries', saveEntry);
router.delete('/entries', clearEntries);

// /api/reflections/problems - problem.html
router.get('/problems', listProblems);
router.post('/problems', createProblem);
router.delete('/problems/:id', deleteProblem);
router.delete('/problems', clearProblems);

module.exports = router;
