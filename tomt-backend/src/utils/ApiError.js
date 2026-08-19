/**
 * Lightweight error class used throughout the API so route handlers can
 * `throw new ApiError(400, 'message')` and have the central error handler
 * (src/middleware/errorHandler.js) turn it into a consistent JSON response.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
