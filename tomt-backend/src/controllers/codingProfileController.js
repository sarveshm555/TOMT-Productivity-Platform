const CodingProfile = require('../models/CodingProfile');
const CodingLog = require('../models/CodingLog');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/gridfs');

async function serializeWithTotals(doc) {
  const logCount = await CodingLog.countDocuments({ profileId: doc._id });
  return {
    id: doc._id,
    name: doc.name,
    link: doc.link,
    password: doc.password,
    totalProblems: doc.totalProblems,
    totalSolved: (doc.totalProblems || 0) + logCount,
    hasLogo: Boolean(doc.logoFileId),
    // Frontend requests the actual image bytes from this endpoint (see
    // getProfileLogo below) instead of embedding a Base64 string. Path is
    // relative to the API base (no leading /api - apiClient's baseURL
    // already includes that prefix, see axiosClient.js).
    logoUrl: doc.logoFileId ? `/placement/coding-profiles/${doc._id}/logo` : null,
  };
}

/**
 * GET /api/placement/coding-profiles
 * Ported from loadProfiles() - totalSolved computed the same way
 * (initial totalProblems + log count), just server-side against real
 * collections instead of a second localStorage read per profile.
 */
const listCodingProfiles = asyncHandler(async (req, res) => {
  const docs = await CodingProfile.find({ userId: req.user.id }).sort({ createdAt: 1 });
  const profiles = await Promise.all(docs.map(serializeWithTotals));
  res.status(200).json({ success: true, profiles });
});

/**
 * GET /api/placement/coding-profiles/:id
 * Used by the Daily Coding Log page to fetch a single profile's details
 * (matches getProfileDetails()).
 */
const getCodingProfile = asyncHandler(async (req, res) => {
  const doc = await CodingProfile.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Profile not found.');
  res.status(200).json({ success: true, profile: await serializeWithTotals(doc) });
});

/**
 * GET /api/placement/coding-profiles/:id/logo
 * Streams the logo image from GridFS - replaces the original's inline
 * Base64 `<img src="data:...">`.
 */
const getProfileLogo = asyncHandler(async (req, res) => {
  const doc = await CodingProfile.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc || !doc.logoFileId) throw new ApiError(404, 'Logo not found.');

  res.setHeader('Content-Type', doc.logoContentType || 'application/octet-stream');
  downloadToResponse('media', doc.logoFileId, res);
});

/**
 * POST /api/placement/coding-profiles
 * Ported from add-coding-profile.html's submit handler's create branch.
 * Expects multipart/form-data (logo file is optional, via multer).
 */
const createCodingProfile = asyncHandler(async (req, res) => {
  const { name, link, password, totalProblems } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedLink = typeof link === 'string' ? link.trim() : '';

  if (!trimmedName || !trimmedLink) {
    throw new ApiError(400, 'Profile Name and Profile URL are required.');
  }

  let logoFileId = null;
  let logoContentType = null;
  if (req.file) {
    logoFileId = await uploadBuffer('media', req.file.buffer, req.file.originalname, req.file.mimetype);
    logoContentType = req.file.mimetype;
  }

  const doc = await CodingProfile.create({
    userId: req.user.id,
    name: trimmedName,
    link: trimmedLink,
    password: typeof password === 'string' ? password.trim() : '',
    totalProblems: parseInt(totalProblems, 10) || 0,
    logoFileId,
    logoContentType,
  });

  res.status(201).json({ success: true, profile: await serializeWithTotals(doc) });
});

/**
 * PUT /api/placement/coding-profiles/:id
 * Ported from add-coding-profile.html's submit handler's edit branch - a
 * new logo replaces the old one (old GridFS file is deleted); omitting a
 * new file keeps the existing logo, matching the original's
 * `logo: currentLogoDataUrl || profiles[index].logo` fallback.
 */
const updateCodingProfile = asyncHandler(async (req, res) => {
  const { name, link, password, totalProblems } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedLink = typeof link === 'string' ? link.trim() : '';

  if (!trimmedName || !trimmedLink) {
    throw new ApiError(400, 'Profile Name and Profile URL are required.');
  }

  const doc = await CodingProfile.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Profile not found.');

  doc.name = trimmedName;
  doc.link = trimmedLink;
  doc.password = typeof password === 'string' ? password.trim() : '';
  doc.totalProblems = parseInt(totalProblems, 10) || 0;

  if (req.file) {
    if (doc.logoFileId) {
      await deleteFile('media', doc.logoFileId).catch(() => {});
    }
    doc.logoFileId = await uploadBuffer('media', req.file.buffer, req.file.originalname, req.file.mimetype);
    doc.logoContentType = req.file.mimetype;
  }

  await doc.save();
  res.status(200).json({ success: true, profile: await serializeWithTotals(doc) });
});

/**
 * DELETE /api/placement/coding-profiles/:id
 * Ported from deleteProfile(id, name). Also removes the GridFS logo file
 * and cascades to delete the profile's CodingLog entries - unlike the
 * original's name-keyed logs, which were merely orphaned (and could
 * silently reappear if a profile with the same name was re-added later,
 * an edge case that was really a side effect of the localStorage key
 * scheme, not an intended feature). Deleting them outright is cleaner and
 * has no visible behavior difference for actual use.
 */
const deleteCodingProfile = asyncHandler(async (req, res) => {
  const doc = await CodingProfile.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Profile not found.');

  if (doc.logoFileId) {
    await deleteFile('media', doc.logoFileId).catch(() => {});
  }
  await CodingLog.deleteMany({ profileId: doc._id });

  res.status(200).json({ success: true, message: 'Profile deleted.' });
});

module.exports = {
  listCodingProfiles,
  getCodingProfile,
  getProfileLogo,
  createCodingProfile,
  updateCodingProfile,
  deleteCodingProfile,
};
