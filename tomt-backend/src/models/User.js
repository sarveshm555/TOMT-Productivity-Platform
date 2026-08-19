const mongoose = require('mongoose');

// This application is single-user by product decision (see Phase 2, Section 4),
// but the User collection is a real, first-class collection rather than a
// hardcoded config value specifically so multi-user support can be added
// later without a schema rewrite - just remove the single-user lock in
// authController's `setup` handler.
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters.'],
      maxlength: [64, 'Username must be 64 characters or fewer.'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false,
    },
    // SHA-256 hash of the current valid refresh token (never the raw token).
    // Cleared on logout, password reset, or detected token reuse.
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
