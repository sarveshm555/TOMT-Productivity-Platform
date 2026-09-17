const Internship = require('../models/Internship');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/gridfs');

function serialize(doc) {
  return {
    id: String(doc._id),
    company: doc.company,
    role: doc.role,
    dateApplied: doc.dateApplied,
    status: doc.status,
    mistakeMessage: doc.mistakeMessage || '',
    trackLinks: (doc.trackLinks || []).map((link) => ({
      id: link._id ? String(link._id) : undefined,
      label: link.label || '',
      url: link.url || '',
    })),
    messages: (doc.messages || []).map((msg) => ({
      id: msg._id ? String(msg._id) : undefined,
      text: msg.text,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    })),
    images: (doc.images || []).map((img) => ({
      id: img._id ? String(img._id) : undefined,
      fileName: img.fileName,
      mimeType: img.mimeType,
      size: img.size,
      bucket: img.bucket || 'media',
      url: img._id ? `/placement/internships/${doc._id}/images/${img._id}` : '',
      createdAt: img.createdAt,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeTrackLinks(rawLinks) {
  if (!rawLinks) return [];
  let arr = rawLinks;
  if (typeof rawLinks === 'string') {
    try {
      arr = JSON.parse(rawLinks);
    } catch (_) {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => item && typeof item.url === 'string' && item.url.trim().length > 0)
    .map((item) => ({
      label: typeof item.label === 'string' ? item.label.trim() : '',
      url: item.url.trim(),
    }));
}

function sanitizeMessages(rawMessages) {
  if (!rawMessages) return [];
  let arr = rawMessages;
  if (typeof rawMessages === 'string') {
    try {
      arr = JSON.parse(rawMessages);
    } catch (_) {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => item && typeof item.text === 'string' && item.text.trim().length > 0)
    .map((item) => {
      const entry = {
        text: item.text.trim(),
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      };
      if (item.id || item._id) {
        entry._id = item.id || item._id;
      }
      return entry;
    });
}

function validateImageFile(file) {
  const mime = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  const validExts = /\.(jpg|jpeg|png|webp|gif|svg)$/i;

  if (!validMimes.includes(mime) && !validExts.test(name)) {
    throw new ApiError(400, `Invalid file format for "${file.originalname}". Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed.`);
  }

  // 10MB limit per image
  if (file.size > 10 * 1024 * 1024) {
    throw new ApiError(400, `Image "${file.originalname}" exceeds maximum allowed file size of 10MB.`);
  }
}

/**
 * GET /api/placement/internships
 * Lists all internship applications for the authenticated user, newest first.
 */
const listInternships = asyncHandler(async (req, res) => {
  const docs = await Internship.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, internships: docs.map(serialize) });
});

/**
 * GET /api/placement/internships/:id
 * Fetches a single internship application for the authenticated user.
 */
const getInternship = asyncHandler(async (req, res) => {
  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');
  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * POST /api/placement/internships
 * Creates a new internship application with optional trackLinks, messages, and images.
 */
const createInternship = asyncHandler(async (req, res) => {
  const { company, role, dateApplied, status, trackLinks, messages } = req.body;
  const trimmedCompany = typeof company === 'string' ? company.trim() : '';
  const trimmedRole = typeof role === 'string' ? role.trim() : '';

  if (!trimmedCompany || !trimmedRole || !dateApplied) {
    throw new ApiError(400, 'Company, role, and date applied are required.');
  }

  const images = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    for (const file of req.files) {
      validateImageFile(file);
      const gridfsFileId = await uploadBuffer('media', file.buffer, file.originalname, file.mimetype);
      images.push({
        gridfsFileId,
        fileName: file.originalname,
        mimeType: file.mimetype || 'image/jpeg',
        size: file.size,
        bucket: 'media',
        createdAt: new Date(),
      });
    }
  }

  const doc = await Internship.create({
    userId: req.user.id,
    company: trimmedCompany,
    role: trimmedRole,
    dateApplied,
    status: status || 'NeedToApply',
    mistakeMessage: '',
    trackLinks: sanitizeTrackLinks(trackLinks),
    messages: sanitizeMessages(messages),
    images,
  });

  res.status(201).json({ success: true, internship: serialize(doc) });
});

/**
 * PUT /api/placement/internships/:id
 * Updates an internship application, supporting links, messages, retained images, and new image uploads.
 */
const updateInternship = asyncHandler(async (req, res) => {
  const { company, role, dateApplied, status, trackLinks, messages, keptImageIds } = req.body;
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

  if (messages !== undefined) {
    doc.messages = sanitizeMessages(messages);
  }

  // Handle keptImageIds if explicitly supplied
  if (keptImageIds !== undefined) {
    let keptSet = null;
    if (Array.isArray(keptImageIds)) {
      keptSet = new Set(keptImageIds.map(String));
    } else if (typeof keptImageIds === 'string') {
      try {
        const parsed = JSON.parse(keptImageIds);
        if (Array.isArray(parsed)) keptSet = new Set(parsed.map(String));
        else keptSet = new Set(keptImageIds.split(',').map((s) => s.trim()).filter(Boolean));
      } catch (_) {
        keptSet = new Set(keptImageIds.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }

    if (keptSet !== null) {
      const toKeep = [];
      for (const img of doc.images || []) {
        if (keptSet.has(img._id.toString())) {
          toKeep.push(img);
        } else {
          await deleteFile(img.bucket || 'media', img.gridfsFileId).catch(() => {});
        }
      }
      doc.images = toKeep;
    }
  }

  // Handle newly uploaded files
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    for (const file of req.files) {
      validateImageFile(file);
      const gridfsFileId = await uploadBuffer('media', file.buffer, file.originalname, file.mimetype);
      doc.images.push({
        gridfsFileId,
        fileName: file.originalname,
        mimeType: file.mimetype || 'image/jpeg',
        size: file.size,
        bucket: 'media',
        createdAt: new Date(),
      });
    }
  }

  await doc.save();
  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * PATCH /api/placement/internships/:id/status
 * Quick-action updates for application status (Offer, Rejected, etc.).
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
 * GET /api/placement/internships/:id/images/:imageId
 * Securely streams an image file from GridFS verifying user ownership.
 */
const getInternshipImage = asyncHandler(async (req, res) => {
  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  const image = (doc.images || []).find((img) => String(img._id) === String(req.params.imageId));
  if (!image || !image.gridfsFileId) throw new ApiError(404, 'Image not found.');

  res.setHeader('Content-Type', image.mimeType || 'image/jpeg');
  downloadToResponse(image.bucket || 'media', image.gridfsFileId, res);
});

/**
 * POST /api/placement/internships/:id/images
 * Uploads one or more images directly to an existing internship application.
 */
const uploadInternshipImages = asyncHandler(async (req, res) => {
  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new ApiError(400, 'No image files provided for upload.');
  }

  for (const file of req.files) {
    validateImageFile(file);
    const gridfsFileId = await uploadBuffer('media', file.buffer, file.originalname, file.mimetype);
    doc.images.push({
      gridfsFileId,
      fileName: file.originalname,
      mimeType: file.mimetype || 'image/jpeg',
      size: file.size,
      bucket: 'media',
      createdAt: new Date(),
    });
  }

  await doc.save();
  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * DELETE /api/placement/internships/:id/images/:imageId
 * Deletes a single image attachment from an internship application and removes the GridFS binary file.
 */
const deleteInternshipImage = asyncHandler(async (req, res) => {
  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  const imageIndex = (doc.images || []).findIndex((img) => String(img._id) === String(req.params.imageId));
  if (imageIndex === -1) throw new ApiError(404, 'Image not found.');

  const image = doc.images[imageIndex];
  if (image.gridfsFileId) {
    await deleteFile(image.bucket || 'media', image.gridfsFileId).catch(() => {});
  }

  doc.images.splice(imageIndex, 1);
  await doc.save();

  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * POST /api/placement/internships/:id/messages
 * Adds a new message to an internship application.
 */
const addMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) throw new ApiError(400, 'Message text is required.');

  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  const newMsg = {
    text: trimmed,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  doc.messages.push(newMsg);
  await doc.save();

  res.status(201).json({ success: true, internship: serialize(doc) });
});

/**
 * PUT /api/placement/internships/:id/messages/:messageId
 * Edits an existing message in an internship application.
 */
const updateMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) throw new ApiError(400, 'Message text is required.');

  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  const msg = (doc.messages || []).find((m) => m._id.toString() === req.params.messageId);
  if (!msg) throw new ApiError(404, 'Message not found.');

  msg.text = trimmed;
  msg.updatedAt = new Date();
  await doc.save();

  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * DELETE /api/placement/internships/:id/messages/:messageId
 * Deletes a message from an internship application.
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const doc = await Internship.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  const initialLength = doc.messages.length;
  doc.messages = (doc.messages || []).filter((m) => m._id.toString() !== req.params.messageId);

  if (doc.messages.length === initialLength) {
    throw new ApiError(404, 'Message not found.');
  }

  await doc.save();
  res.status(200).json({ success: true, internship: serialize(doc) });
});

/**
 * DELETE /api/placement/internships/:id
 * Permanently deletes the internship application AND all its GridFS image files.
 */
const deleteInternship = asyncHandler(async (req, res) => {
  const doc = await Internship.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Application not found.');

  if (doc.images && doc.images.length > 0) {
    for (const img of doc.images) {
      if (img.gridfsFileId) {
        await deleteFile(img.bucket || 'media', img.gridfsFileId).catch(() => {});
      }
    }
  }

  res.status(200).json({ success: true, message: 'Application deleted.' });
});

module.exports = {
  listInternships,
  getInternship,
  createInternship,
  updateInternship,
  updateStatus,
  getInternshipImage,
  uploadInternshipImages,
  deleteInternshipImage,
  addMessage,
  updateMessage,
  deleteMessage,
  deleteInternship,
};
