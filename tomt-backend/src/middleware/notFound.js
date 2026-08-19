const ApiError = require('../utils/ApiError');

/**
 * Catches any request that didn't match a defined route and forwards a
 * consistent 404 ApiError into the central error handler.
 */
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
