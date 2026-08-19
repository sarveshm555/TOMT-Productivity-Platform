const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Protects a route by requiring a valid "Authorization: Bearer <token>" header.
 * On success, attaches { id, username } to req.user for downstream handlers.
 *
 * Every business-module query in later phases scopes its MongoDB filter with
 * req.user.id (e.g. { userId: req.user.id }) - even though there is only one
 * user today, this is the exact mechanism that makes multi-user support later
 * a matter of removing the single-user lock, not rewriting every query.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(
      new ApiError(401, 'Authentication required. Missing or malformed Authorization header.')
    );
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired.'));
    }
    return next(new ApiError(401, 'Invalid access token.'));
  }
}

module.exports = requireAuth;
