/**
 * Wraps an async Express handler so any thrown error / rejected promise is
 * forwarded to next(err) automatically, instead of needing a try/catch in
 * every single controller function.
 *
 * Usage:
 *   const getThing = asyncHandler(async (req, res) => { ... });
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
