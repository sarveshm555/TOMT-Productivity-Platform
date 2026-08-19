/**
 * Central error-handling middleware. Every thrown ApiError, Mongoose error,
 * or unexpected exception passed to next(err) anywhere in the app ends up
 * here and is turned into one consistent JSON shape:
 *   { success: false, message, details? }
 *
 * Must be registered LAST, after all routes and after notFound.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose schema validation errors (e.g. missing required field)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((fieldError) => fieldError.message)
      .join(' ');
  }

  // Mongoose duplicate key error (e.g. duplicate unique username)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyValue || {})[0];
    message = duplicateField ? `${duplicateField} already exists.` : 'Duplicate value.';
  }

  // Malformed MongoDB ObjectId in a route param/body
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field "${err.path}".`;
  }

  // Malformed JSON in the request body
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body.';
  }

  if (process.env.NODE_ENV !== 'production') {
    // Full stack trace in dev/test to speed up debugging.
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = errorHandler;
