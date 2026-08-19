const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refreshToken';
// Scoping the cookie path to /api/auth means the browser only ever sends it
// on auth endpoints (login/refresh/logout), not on every single API call.
const REFRESH_COOKIE_PATH = '/api/auth';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

// The raw refresh token is never stored - only its SHA-256 hash, so a
// database read alone can never leak a usable session token.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issues a fresh access + refresh token pair for a user, persists the
 * refresh token's hash on the user document, and sets the refresh token
 * as an httpOnly cookie on the response. Returns the access token so the
 * caller can include it in the JSON body.
 */
async function issueTokenPair(res, user) {
  const payload = { sub: user._id.toString(), username: user.username };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  return accessToken;
}

/**
 * GET /api/auth/status
 * Read-only, unauthenticated check for whether the single account has been
 * created yet. Added in Phase 3.2 to support the frontend: the original
 * password_page.html decided synchronously (via localStorage) whether to
 * show the "SET ACCESS CREDENTIALS" screen or the "LOGIN" screen. Now that
 * credentials live server-side, the frontend needs an equivalent read-only
 * check to reproduce that exact behavior. Deliberately reveals nothing
 * beyond a boolean - no username, no count details.
 */
const status = asyncHandler(async (req, res) => {
  const existingUserCount = await User.countDocuments();
  res.status(200).json({
    success: true,
    setupComplete: existingUserCount > 0,
    multiUser: true,
  });
});

/**
 * POST /api/auth/register (and /api/auth/setup)
 * Multi-user registration. Validates uniqueness of username, hashes password,
 * creates user, and issues initial access + refresh token pair.
 */
const register = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    throw new ApiError(400, 'Access name must be 3 or more characters.');
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    throw new ApiError(400, 'Password must be 4 or more characters.');
  }

  const trimmedUsername = username.trim();
  const existingUser = await User.findOne({ username: trimmedUsername });
  if (existingUser) {
    throw new ApiError(409, 'An account with this Access Name already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await User.create({ username: trimmedUsername, passwordHash });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'An account with this Access Name already exists.');
    }
    throw err;
  }

  const accessToken = await issueTokenPair(res, user);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    accessToken,
    user: { id: user._id, username: user.username },
  });
});

/**
 * POST /api/auth/login
 * Multi-user login: verifies both username and password.
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || typeof username !== 'string') {
    throw new ApiError(400, 'Access name is required.');
  }
  if (!password || typeof password !== 'string') {
    throw new ApiError(400, 'Password is required.');
  }

  const user = await User.findOne({ username: username.trim() }).select('+passwordHash');

  if (!user) {
    throw new ApiError(401, 'Incorrect Access Name or Password.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Incorrect Access Name or Password.');
  }

  const accessToken = await issueTokenPair(res, user);

  res.status(200).json({
    success: true,
    message: 'Access granted.',
    accessToken,
    user: { id: user._id, username: user.username },
  });
});

/**
 * POST /api/auth/refresh
 * Reads the httpOnly refresh cookie, validates + rotates it, and issues a
 * new access/refresh token pair. Detects refresh-token reuse (a token that
 * doesn't match the currently stored hash) and invalidates the session as
 * a precaution if that ever happens.
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;

  if (!token) {
    throw new ApiError(401, 'Refresh token missing.');
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    throw new ApiError(401, 'Refresh token invalid or expired.');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    throw new ApiError(401, 'Session no longer valid. Please log in again.');
  }

  if (user.refreshTokenHash !== hashToken(token)) {
    user.refreshTokenHash = null;
    await user.save();
    throw new ApiError(401, 'Session invalid. Please log in again.');
  }

  const accessToken = await issueTokenPair(res, user);

  res.status(200).json({
    success: true,
    accessToken,
  });
});

/**
 * POST /api/auth/logout
 * Clears the server-side refresh token hash and the client's cookie.
 * Safe to call even if the cookie is already missing/expired.
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.sub).select('+refreshTokenHash');
      if (user) {
        user.refreshTokenHash = null;
        await user.save();
      }
    } catch (err) {
      // Token already invalid/expired - nothing left to clean up server-side.
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  res.status(200).json({ success: true, message: 'Logged out.' });
});

/**
 * POST /api/auth/reset-password
 * Finds user by username, verifies identity, then sets new password.
 * All existing sessions are invalidated.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { username, newPassword, confirmPassword } = req.body;

  if (!username || typeof username !== 'string') {
    throw new ApiError(400, 'Access name confirmation is required.');
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
    throw new ApiError(400, 'New password must be 4 or more characters.');
  }
  if (typeof confirmPassword === 'string' && confirmPassword !== newPassword) {
    throw new ApiError(400, 'Passwords do not match.');
  }

  const user = await User.findOne({ username: username.trim() }).select('+passwordHash +refreshTokenHash');
  if (!user) {
    throw new ApiError(401, 'Access name verification failed.');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.refreshTokenHash = null; // force re-login everywhere after a reset
  await user.save();

  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.',
  });
});

/**
 * GET /api/auth/me
 * Convenience endpoint so the frontend can verify an access token / restore
 * a session on page load, without hitting a business-data endpoint.
 */
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }
  res.status(200).json({
    success: true,
    user: { id: user._id, username: user.username, createdAt: user.createdAt },
  });
});

module.exports = {
  status,
  setup: register,
  register,
  login,
  refresh,
  logout,
  resetPassword,
  me,
};
