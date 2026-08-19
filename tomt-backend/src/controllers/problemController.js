const Problem = require('../models/Problem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function serialize(doc) {
  return {
    id: doc._id,
    problem: doc.problem,
    solution: doc.solution,
    createdAt: doc.createdAt,
  };
}

/**
 * GET /api/reflections/problems
 * Ported from renderProblems()'s `.slice().reverse()` - newest first.
 */
const listProblems = asyncHandler(async (req, res) => {
  const docs = await Problem.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, problems: docs.map(serialize) });
});

/**
 * POST /api/reflections/problems
 * Ported from saveBtn's handler.
 */
const createProblem = asyncHandler(async (req, res) => {
  const { problem, solution } = req.body;
  const trimmedProblem = typeof problem === 'string' ? problem.trim() : '';
  if (!trimmedProblem) {
    throw new ApiError(400, 'Please describe the problem.');
  }

  const doc = await Problem.create({
    userId: req.user.id,
    problem: trimmedProblem,
    solution: typeof solution === 'string' ? solution.trim() : '',
  });

  res.status(201).json({ success: true, problem: serialize(doc) });
});

/**
 * DELETE /api/reflections/problems/:id
 * Ported from deleteProblem(id) (the "Now Solved" button).
 */
const deleteProblem = asyncHandler(async (req, res) => {
  const doc = await Problem.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Problem not found.');
  res.status(200).json({ success: true, message: 'Problem marked solved.' });
});

/**
 * DELETE /api/reflections/problems
 * Ported from clearBtn's handler (the confirm() dialog is a frontend concern).
 */
const clearProblems = asyncHandler(async (req, res) => {
  await Problem.deleteMany({ userId: req.user.id });
  res.status(200).json({ success: true, message: 'All problems cleared.' });
});

module.exports = {
  listProblems,
  createProblem,
  deleteProblem,
  clearProblems,
};
