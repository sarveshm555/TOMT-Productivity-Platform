const Internship = require('../models/Internship');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function serialize(doc) {
  return {
    id: doc._id,
    company: doc.company,
    role: doc.role,
    dateApplied: doc.dateApplied,
    status: doc.status,
    mistakeMessage: doc.mistakeMessage,
    trackLinks: (doc.trackLinks || []).map((link) => ({
      id: link._id ? String(link._id) : undefined,
      label: link.label || '',
      url: link.url || '',
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeTrackLinks(rawLinks) {
  if (!Array.isArray(rawLinks)) return [];
  return rawLinks
    .filter((item) => item && typeof item.url === 'string' && item.url.trim().length > 0)
    .map((item) => ({
      label: typeof item.label === 'string' ? item.label.trim() : '',
      url: item.url.trim(),
    }));
}

/**
 * GET /api/placement/internships
 * Ported from render() - newest-first (the original's add() used
 * `[appObj, ...data]`, i.e. unshift).
 */
const listInternships = asyncHandler(async (req, res) => {
  const docs = await Internship.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, internships: docs.map(serialize) });
});

/**
 * POST /api/placement/internships
 * Ported from add-internship.html's submit handler's create branch.
 */
const createInternship = asyncHandler(async (req, res) => {
  const { company, role, dateApplied, status, trackLinks } = req.body;
  const trimmedCompany = typeof company === 'string' ? company.trim() : '';
  const trimmedRole = typeof role === 'string' ? role.trim() : '';

  if (!trimmedCompany || !trimmedRole || !dateApplied) {
    throw new ApiError(400, 'Company, role, and date applied are required.');
  }

  const doc = await Internship.create({
    userId: req.user.id,
    company: trimmedCompany,
    role: trimmedRole,
    dateApplied,
    status: status || 'NeedToApply',
    mistakeMessage: '',
    trackLinks: sanitizeTrackLinks(trackLinks),
  });

  res.status(201).json({ success: true, internship: serialize(doc) });
});

/**
 * PUT /api/placement/internships/:id
 * Ported from add-internship.html's submit handler's edit branch.
 */
const updateInternship = asyncHandler(async (req, res) => {
  const { company, role, dateApplied, status, trackLinks } = req.body;
  const trimmedCompany = typeof company === 'string' ? company.trim() : '';
  const trimmedRole = typeof role === 'string' ? role.trim() : '';

  if (!trimmedCompany || !trimmedRole || !dateApplied) {
    throw new ApiError(400, 'Company, role, and date applied are required.');
  }

  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  doc.company = trimmedCompany;
  doc.role = trimmedRole;
  doc.dateApplied = dateApplied;
  doc.status = status || doc.status;
  if (trackLinks !== undefined) {
    doc.trackLinks = sanitizeTrackLinks(trackLinks);
  }
  await doc.save();

  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * PATCH /api/placement/internships/:id/status
 * Ported from updateStatus(id, status, msg) - used by both the
 * Success/Failed quick-action buttons and confirmReject().
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status, mistakeMessage } = req.body;
  if (!['NeedToApply', 'Applied', 'Interview', 'Offer', 'Rejected'].includes(status)) {
    throw new ApiError(400, 'Invalid status.');
  }

  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  doc.status = status;
  doc.mistakeMessage = mistakeMessage || '';
  await doc.save();

  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * DELETE /api/placement/internships/:id
 * Ported from deleteApp(id) (the confirm() dialog is a frontend concern).
 */
const deleteInternship = asyncHandler(async (req, res) => {
  const doc = await Internship.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');
  res.status(200).json({ success: true, message: 'Application deleted.' });
});

module.exports = {
  listInternships,
  createInternship,
  updateInternship,
  updateStatus,
  deleteInternship,
};
