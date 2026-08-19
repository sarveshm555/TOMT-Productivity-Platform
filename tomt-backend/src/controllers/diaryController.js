const DiarySettings = require('../models/DiarySettings');
const DiaryEntry = require('../models/DiaryEntry');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, downloadToResponse, downloadToBuffer, deleteFile } = require('../utils/gridfs');

async function getOrCreateSettings(userId) {
  let doc = await DiarySettings.findOne({ userId });
  if (!doc) {
    doc = await DiarySettings.create({ userId });
  }
  return doc;
}

function serializeSettings(doc) {
  return {
    textColor: doc.textColor,
    fontFamily: doc.fontFamily,
    penStyle: doc.penStyle,
    // null -> frontend falls back to the bundled default asset
    // (/diary_front.jpeg, /diary_back.jpeg), matching the original's
    // DEFAULT_FRONT_COVER_PATH / DEFAULT_BACK_COVER_PATH.
    bgImageUrl: doc.bgImageFileId ? '/diary/settings/bg-image' : null,
    frontCoverUrl: doc.frontCoverFileId ? '/diary/settings/front-cover' : null,
    backCoverUrl: doc.backCoverFileId ? '/diary/settings/back-cover' : null,
  };
}

/**
 * GET /api/diary/settings
 * Ported from loadSettings().
 */
const getSettings = asyncHandler(async (req, res) => {
  const doc = await getOrCreateSettings(req.user.id);
  res.status(200).json({ success: true, settings: serializeSettings(doc) });
});

/**
 * PUT /api/diary/settings
 * Ported from saveSettings() + previewBackground()/uploadCover(). Expects
 * multipart/form-data. `resetFrontCover`/`resetBackCover`/`clearBgImage`
 * ("true") are a small, necessary addition: the original reset a cover to
 * its default when a file `<input>`'s change event fired with no file
 * (i.e. the user cleared a previous selection) - a browser quirk that
 * isn't reliably triggerable from a controlled React file input, so an
 * explicit "Reset to Default" affordance replaces it with the same net
 * capability.
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { textColor, fontFamily, penStyle, resetFrontCover, resetBackCover, clearBgImage } = req.body;
  const doc = await getOrCreateSettings(req.user.id);

  if (textColor) doc.textColor = textColor;
  if (fontFamily) doc.fontFamily = fontFamily;
  if (penStyle) doc.penStyle = penStyle;

  const files = req.files || {};

  if (files.bgImage && files.bgImage[0]) {
    if (doc.bgImageFileId) await deleteFile('media', doc.bgImageFileId).catch(() => {});
    doc.bgImageFileId = await uploadBuffer('media', files.bgImage[0].buffer, files.bgImage[0].originalname, files.bgImage[0].mimetype);
    doc.bgImageContentType = files.bgImage[0].mimetype;
  } else if (clearBgImage === 'true') {
    if (doc.bgImageFileId) await deleteFile('media', doc.bgImageFileId).catch(() => {});
    doc.bgImageFileId = null;
    doc.bgImageContentType = null;
  }

  if (files.frontCover && files.frontCover[0]) {
    if (doc.frontCoverFileId) await deleteFile('media', doc.frontCoverFileId).catch(() => {});
    doc.frontCoverFileId = await uploadBuffer('media', files.frontCover[0].buffer, files.frontCover[0].originalname, files.frontCover[0].mimetype);
    doc.frontCoverContentType = files.frontCover[0].mimetype;
  } else if (resetFrontCover === 'true') {
    if (doc.frontCoverFileId) await deleteFile('media', doc.frontCoverFileId).catch(() => {});
    doc.frontCoverFileId = null;
    doc.frontCoverContentType = null;
  }

  if (files.backCover && files.backCover[0]) {
    if (doc.backCoverFileId) await deleteFile('media', doc.backCoverFileId).catch(() => {});
    doc.backCoverFileId = await uploadBuffer('media', files.backCover[0].buffer, files.backCover[0].originalname, files.backCover[0].mimetype);
    doc.backCoverContentType = files.backCover[0].mimetype;
  } else if (resetBackCover === 'true') {
    if (doc.backCoverFileId) await deleteFile('media', doc.backCoverFileId).catch(() => {});
    doc.backCoverFileId = null;
    doc.backCoverContentType = null;
  }

  await doc.save();
  res.status(200).json({ success: true, settings: serializeSettings(doc) });
});

async function streamSettingsImage(req, res, field, contentTypeField) {
  const doc = await DiarySettings.findOne({ userId: req.user.id });
  if (!doc || !doc[field]) throw new ApiError(404, 'Image not found.');
  res.setHeader('Content-Type', doc[contentTypeField] || 'application/octet-stream');
  downloadToResponse('media', doc[field], res);
}

const getBgImage = asyncHandler((req, res) => streamSettingsImage(req, res, 'bgImageFileId', 'bgImageContentType'));
const getFrontCover = asyncHandler((req, res) => streamSettingsImage(req, res, 'frontCoverFileId', 'frontCoverContentType'));
const getBackCover = asyncHandler((req, res) => streamSettingsImage(req, res, 'backCoverFileId', 'backCoverContentType'));

function serializeEntry(doc) {
  return {
    id: doc._id,
    content: doc.content,
    dateTime: doc.dateTime,
    displayDateTime: doc.displayDateTime,
    theme: {
      textColor: doc.theme.textColor,
      fontFamily: doc.theme.fontFamily,
      bgImageUrl: doc.theme.bgImageFileId ? `/diary/entries/${doc._id}/bg-image` : null,
    },
  };
}

/**
 * GET /api/diary/entries
 * Ported from loadHistory()/loadAllHistory() - newest-first.
 */
const listEntries = asyncHandler(async (req, res) => {
  const docs = await DiaryEntry.find({ userId: req.user.id }).sort({ dateTime: -1 });
  res.status(200).json({ success: true, entries: docs.map(serializeEntry) });
});

/**
 * GET /api/diary/entries/:id/bg-image
 * Streams a single entry's OWN frozen background-image snapshot.
 */
const getEntryBgImage = asyncHandler(async (req, res) => {
  const doc = await DiaryEntry.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc || !doc.theme.bgImageFileId) throw new ApiError(404, 'Image not found.');
  res.setHeader('Content-Type', doc.theme.bgImageContentType || 'application/octet-stream');
  downloadToResponse('media', doc.theme.bgImageFileId, res);
});

/**
 * POST /api/diary/entries
 * Ported from saveEntry() - `dateTime`/`displayDateTime` are computed
 * server-side at the moment of saving (equivalent point to the original's
 * client-side `new Date()` call). The current settings' textColor/
 * fontFamily/bgImage are snapshotted into the entry's own `theme` -
 * bgImage is duplicated into a NEW GridFS file (see DiaryEntry.js comment
 * for why a shared reference would be wrong).
 */
const createEntry = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  if (!trimmedContent) {
    throw new ApiError(400, 'The diary entry cannot be empty.');
  }

  const settings = await getOrCreateSettings(req.user.id);

  const now = new Date();
  const displayDateTime = `${now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

  let bgImageFileId = null;
  let bgImageContentType = null;
  if (settings.bgImageFileId) {
    const buffer = await downloadToBuffer('media', settings.bgImageFileId);
    bgImageFileId = await uploadBuffer('media', buffer, 'diary-bg-snapshot', settings.bgImageContentType);
    bgImageContentType = settings.bgImageContentType;
  }

  const doc = await DiaryEntry.create({
    userId: req.user.id,
    content: trimmedContent,
    dateTime: now,
    displayDateTime,
    theme: {
      textColor: settings.textColor,
      fontFamily: settings.fontFamily,
      bgImageFileId,
      bgImageContentType,
    },
  });

  res.status(201).json({ success: true, entry: serializeEntry(doc) });
});

/**
 * DELETE /api/diary/entries/:id
 * Ported from deleteEntry(id) (the confirm() dialog is a frontend concern).
 * Also removes the entry's own bg-image snapshot from GridFS, if any.
 */
const deleteEntry = asyncHandler(async (req, res) => {
  const doc = await DiaryEntry.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Entry not found.');

  if (doc.theme.bgImageFileId) {
    await deleteFile('media', doc.theme.bgImageFileId).catch(() => {});
  }

  res.status(200).json({ success: true, message: 'Entry deleted.' });
});

/**
 * GET /api/diary/entries/:id
 * Fetches a single entry by ID for editing or reading.
 */
const getEntry = asyncHandler(async (req, res) => {
  const doc = await DiaryEntry.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Entry not found.');
  res.status(200).json({ success: true, entry: serializeEntry(doc) });
});

/**
 * PUT /api/diary/entries/:id
 * Updates an existing diary entry's content and optionally theme,
 * strictly PRESERVING its original dateTime and displayDateTime.
 */
const updateEntry = asyncHandler(async (req, res) => {
  const { content, theme } = req.body;
  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  if (!trimmedContent) {
    throw new ApiError(400, 'The diary entry cannot be empty.');
  }

  const doc = await DiaryEntry.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) throw new ApiError(404, 'Entry not found.');

  doc.content = trimmedContent;
  if (theme && typeof theme === 'object') {
    if (theme.textColor) doc.theme.textColor = theme.textColor;
    if (theme.fontFamily) doc.theme.fontFamily = theme.fontFamily;
  }

  await doc.save();
  res.status(200).json({ success: true, entry: serializeEntry(doc) });
});

module.exports = {
  getSettings,
  updateSettings,
  getBgImage,
  getFrontCover,
  getBackCover,
  listEntries,
  getEntry,
  getEntryBgImage,
  createEntry,
  updateEntry,
  deleteEntry,
};
