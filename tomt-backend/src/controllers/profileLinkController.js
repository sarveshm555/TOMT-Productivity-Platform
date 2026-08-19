const ProfileLink = require('../models/ProfileLink');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function serialize(doc) {
  return {
    id: doc._id,
    name: doc.name,
    link: doc.link,
    password: doc.password,
  };
}

/**
 * GET /api/placement/links
 * Ported from renderLinks() - the search filter itself stays client-side
 * (same as the original, which re-filtered the full in-memory `profiles`
 * array on every keystroke); this just returns the full list.
 */
const listProfileLinks = asyncHandler(async (req, res) => {
  const docs = await ProfileLink.find({ userId: req.user.id });
  res.status(200).json({ success: true, links: docs.map(serialize) });
});

/**
 * POST /api/placement/links
 * Ported from the link-form submit handler.
 */
const createProfileLink = asyncHandler(async (req, res) => {
  const { name, link, password } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedLink = typeof link === 'string' ? link.trim() : '';

  if (!trimmedName || !trimmedLink) {
    throw new ApiError(400, 'Profile Name and Link are required.');
  }

  const doc = await ProfileLink.create({
    userId: req.user.id,
    name: trimmedName,
    link: trimmedLink,
    password: typeof password === 'string' ? password : '',
  });

  res.status(201).json({ success: true, link: serialize(doc) });
});

/**
 * DELETE /api/placement/links/:id
 * Ported from deleteProfile(id) (the confirm() dialog is a frontend concern).
 */
const deleteProfileLink = asyncHandler(async (req, res) => {
  const doc = await ProfileLink.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Profile link not found.');
  res.status(200).json({ success: true, message: 'Profile link deleted.' });
});

module.exports = {
  listProfileLinks,
  createProfileLink,
  deleteProfileLink,
};
