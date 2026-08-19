'use strict';

/**
 * TOMT LocalStorage -> MongoDB/GridFS migration importer.
 *
 * Usage:
 *   node import-tool/import.js --file=./tomt-localstorage-backup.json --dry-run
 *   node import-tool/import.js --file=./tomt-localstorage-backup.json
 *
 * Reuses the REAL backend directly - no duplicated schemas, no second
 * database connection helper, no second GridFS mechanism:
 *   - Models required straight from tomp-backend/src/models/*.js
 *   - DB connection via tomp-backend/src/config/db.js's connectDB()
 *   - File storage via tomp-backend/src/utils/gridfs.js's uploadBuffer()
 *
 * Safety: with --dry-run (the default - see parseArgs), this script makes
 * ZERO writes to MongoDB and ZERO uploads to GridFS. It only computes and
 * reports what WOULD happen. Real writes require explicitly passing
 * --commit.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, '..', '..', 'tomp-backend', 'src');

const { connectDB, disconnectDB } = require(path.join(BACKEND_SRC, 'config', 'db.js'));
const { uploadBuffer } = require(path.join(BACKEND_SRC, 'utils', 'gridfs.js'));

const User = require(path.join(BACKEND_SRC, 'models', 'User.js'));
const Notification = require(path.join(BACKEND_SRC, 'models', 'Notification.js'));
const ScheduleTask = require(path.join(BACKEND_SRC, 'models', 'ScheduleTask.js'));
const ScheduleHistory = require(path.join(BACKEND_SRC, 'models', 'ScheduleHistory.js'));
const ScheduleMeta = require(path.join(BACKEND_SRC, 'models', 'ScheduleMeta.js'));
const PendingTask = require(path.join(BACKEND_SRC, 'models', 'PendingTask.js'));
const RememberTask = require(path.join(BACKEND_SRC, 'models', 'RememberTask.js'));
const Wardrobe = require(path.join(BACKEND_SRC, 'models', 'Wardrobe.js'));
const OutfitRule = require(path.join(BACKEND_SRC, 'models', 'OutfitRule.js'));
const ReflectionEntry = require(path.join(BACKEND_SRC, 'models', 'ReflectionEntry.js'));
const ReflectionQuestionList = require(path.join(BACKEND_SRC, 'models', 'ReflectionQuestionList.js'));
const Problem = require(path.join(BACKEND_SRC, 'models', 'Problem.js'));
const RoutineConfig = require(path.join(BACKEND_SRC, 'models', 'RoutineConfig.js'));
const RoutineHistory = require(path.join(BACKEND_SRC, 'models', 'RoutineHistory.js'));
const Target = require(path.join(BACKEND_SRC, 'models', 'Target.js'));
const CodingProfile = require(path.join(BACKEND_SRC, 'models', 'CodingProfile.js'));
const CodingLog = require(path.join(BACKEND_SRC, 'models', 'CodingLog.js'));
const Course = require(path.join(BACKEND_SRC, 'models', 'Course.js'));
const CourseLog = require(path.join(BACKEND_SRC, 'models', 'CourseLog.js'));
const Internship = require(path.join(BACKEND_SRC, 'models', 'Internship.js'));
const DocumentMeta = require(path.join(BACKEND_SRC, 'models', 'DocumentMeta.js'));
const ProfileLink = require(path.join(BACKEND_SRC, 'models', 'ProfileLink.js'));
const Note = require(path.join(BACKEND_SRC, 'models', 'Note.js'));
const DiarySettings = require(path.join(BACKEND_SRC, 'models', 'DiarySettings.js'));
const DiaryEntry = require(path.join(BACKEND_SRC, 'models', 'DiaryEntry.js'));
const ApplyTask = require(path.join(BACKEND_SRC, 'models', 'ApplyTask.js'));
const OngoingTask = require(path.join(BACKEND_SRC, 'models', 'OngoingTask.js'));

const { loadLedger, saveLedger, fingerprint, isAlreadyImported, markImported } = require('./dedup.js');
const { MAPPING_TABLE } = require('./mappingTable.js');

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='));
  return {
    file: fileArg ? fileArg.split('=').slice(1).join('=') : path.join(__dirname, '..', 'tomt-localstorage-backup.json'),
    commit: args.includes('--commit'),
  };
}

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function normalizeBackupData(raw) {
  if (raw && raw.exportMeta && (raw.static || raw.dynamic)) {
    return raw;
  }
  // Otherwise, raw is a direct key-value object of localStorage items
  const normalized = {
    exportMeta: {
      exportedAt: '2026-08-19T00:00:00.000Z',
      source: 'tomt-localstorage-backup.json',
      totalKeys: Object.keys(raw).length,
    },
    auth: {
      hasUsername: Boolean(raw.tompAppUsername),
      hasPassword: Boolean(raw.tompAppPassword),
    },
    static: {},
    dynamic: {
      codingLogs: {},
      courseLogs: {},
    },
  };

  for (const [k, v] of Object.entries(raw)) {
    let parsed = v;
    if (typeof v === 'string') {
      try {
        parsed = JSON.parse(v);
      } catch (_) {
        parsed = v;
      }
    }
    if (k.startsWith('codingLog_')) {
      normalized.dynamic.codingLogs[k] = parsed;
    } else if (k.startsWith('courseLog_')) {
      normalized.dynamic.courseLogs[k] = parsed;
    } else {
      normalized.static[k] = parsed;
    }
  }
  return normalized;
}

/**
 * Validates the top-level shape produced by export-tool/export.html.
 * Throws with a clear message rather than importing a malformed file.
 */
function validateExportShape(data) {
  const errors = [];
  if (!data || typeof data !== 'object') errors.push('Root of export file is not an object.');
  if (!data.exportMeta) errors.push('Missing "exportMeta".');
  if (!data.static || typeof data.static !== 'object') errors.push('Missing or invalid "static" section.');
  if (!data.dynamic || typeof data.dynamic !== 'object') errors.push('Missing or invalid "dynamic" section.');
  if (data.dynamic && (!data.dynamic.codingLogs || !data.dynamic.courseLogs)) {
    errors.push('Missing "dynamic.codingLogs" or "dynamic.courseLogs".');
  }
  if (errors.length > 0) {
    throw new Error('Invalid export file structure:\n  - ' + errors.join('\n  - '));
  }
}

async function run() {
  const { file, commit } = parseArgs();
  const dryRun = !commit;

  const report = {
    startedAt: new Date().toISOString(),
    mode: dryRun ? 'DRY-RUN (no writes)' : 'COMMIT (real writes)',
    sourceFile: file,
    perKey: {},
    warnings: [],
    errors: [],
    gridfsUploads: { wouldUpload: 0, uploaded: 0 },
    totals: { toCreate: 0, created: 0, skippedDuplicate: 0, failed: 0 },
  };

  function logWarn(msg) {
    report.warnings.push(msg);
  }
  function logErr(msg) {
    report.errors.push(msg);
  }
  function keyReport(key) {
    if (!report.perKey[key]) {
      report.perKey[key] = { found: 0, toCreate: 0, created: 0, skippedDuplicate: 0, failed: 0, orphaned: 0 };
    }
    return report.perKey[key];
  }

  if (!fs.existsSync(file)) {
    console.error('Export file not found: ' + file);
    console.error('Run export-tool/export.html in the old app\'s browser first, then pass --file=<path>.');
    process.exit(1);
  }

  let exportData;
  try {
    const rawFileContent = JSON.parse(fs.readFileSync(file, 'utf8'));
    exportData = normalizeBackupData(rawFileContent);
    validateExportShape(exportData);
  } catch (err) {
    console.error('Failed to parse/validate export file: ' + err.message);
    process.exit(1);
  }

  const targetUsername = process.env.MIGRATION_TARGET_USERNAME;
  if (!targetUsername) {
    console.error('MIGRATION_TARGET_USERNAME is not set. Copy .env.example to .env and set it.');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ username: targetUsername });
  if (!user) {
    console.error('No user found with username "' + targetUsername + '". Run tomp-backend\'s /api/auth/setup first.');
    await disconnectDB();
    process.exit(1);
  }
  const userId = user._id;

  const ledger = loadLedger();

  // ---- helpers -----------------------------------------------------

  async function createIfNew(Model, key, discriminator, doc, extra) {
    const kr = keyReport(key);
    kr.found++;
    const fp = fingerprint(Model.modelName, key, discriminator, doc);

    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate++;
      report.totals.skippedDuplicate++;
      return { skipped: true };
    }

    kr.toCreate++;
    report.totals.toCreate++;

    if (dryRun) return { wouldCreate: true, fp };

    try {
      const created = await Model.create(doc);
      markImported(ledger, fp, { model: Model.modelName, key, discriminator });
      kr.created++;
      report.totals.created++;
      return { created, fp };
    } catch (err) {
      kr.failed++;
      report.totals.failed++;
      logErr(key + ' [' + discriminator + ']: ' + err.message);
      return { failed: true };
    }
    // eslint-disable-next-line no-unused-vars
    void extra;
  }

  async function migrateFile(dataUrlOrFile, bucketName, label) {
    const decoded = decodeDataUrl(dataUrlOrFile);
    if (!decoded) return { fileId: null, contentType: null };

    report.gridfsUploads.wouldUpload++;
    if (dryRun) return { fileId: null, contentType: decoded.contentType, wouldUpload: true };

    try {
      const fileId = await uploadBuffer(bucketName, decoded.buffer, label, decoded.contentType);
      report.gridfsUploads.uploaded++;
      return { fileId, contentType: decoded.contentType };
    } catch (err) {
      logErr('GridFS upload failed for ' + label + ': ' + err.message);
      return { fileId: null, contentType: null };
    }
  }

  const staticData = exportData.static || {};
  const dynamicData = exportData.dynamic || {};

  // ---- simple, no-FK, no-file keys ----------------------------------

  for (const t of staticData.dailyTasksData || []) {
    await createIfNew(ScheduleTask, 'dailyTasksData', t.id || t.task + t.dueDate, {
      userId,
      task: t.task,
      dueDate: t.dueDate,
      time: t.time || 'N/A',
      priority: t.priority || 'No Priority',
      completed: Boolean(t.completed),
    });
  }

  for (const t of staticData.pastPendingTasksData || []) {
    await createIfNew(PendingTask, 'pastPendingTasksData', t.id || t.task + t.dueDate, {
      userId,
      task: t.task,
      dueDate: t.dueDate || '',
      priority: t.priority || 'No Priority',
      completed: Boolean(t.completed),
    });
  }

  for (const h of staticData.scheduleHistoryData || []) {
    const completedAt = h.completedTime ? new Date(h.completedTime) : h.completedDateString ? new Date(h.completedDateString) : new Date(exportData.exportMeta.exportedAt);
    await createIfNew(ScheduleHistory, 'scheduleHistoryData', h.id || h.task + String(h.completedTime || h.completedDateString), {
      userId,
      task: h.task,
      dueDate: h.dueDate || '',
      priority: h.priority || 'No Priority',
      completedAt,
    });
  }

  for (const t of staticData.rememberActiveTasks || []) {
    await createIfNew(RememberTask, 'rememberActiveTasks', t.id || t.text, {
      userId,
      text: t.text,
      priority: t.priority || 'No Priority',
      dueDate: t.dueDate || null,
      status: 'active',
    });
  }
  for (const t of staticData.rememberHistoryTasks || []) {
    await createIfNew(RememberTask, 'rememberHistoryTasks', t.id || t.text, {
      userId,
      text: t.text,
      priority: t.priority || 'No Priority',
      dueDate: t.dueDate || null,
      status: 'done',
      completedAt: t.completedAt ? new Date(t.completedAt) : new Date(exportData.exportMeta.exportedAt),
    });
  }

  if (staticData.lastScheduleVisitDate) {
    const kr = keyReport('lastScheduleVisitDate');
    kr.found = 1;
    kr.toCreate = 1;
    if (!dryRun) {
      await ScheduleMeta.findOneAndUpdate({ userId }, { userId, lastVisitDate: staticData.lastScheduleVisitDate }, { upsert: true });
      kr.created = 1;
    }
  }

  if (staticData.myWardrobeList) {
    const kr = keyReport('myWardrobeList');
    kr.found = 1;
    kr.toCreate = 1;
    if (!dryRun) {
      await Wardrobe.findOneAndUpdate(
        { userId },
        { userId, shirts: staticData.myWardrobeList.shirts || [], pants: staticData.myWardrobeList.pants || [] },
        { upsert: true }
      );
      kr.created = 1;
    }
  }

  if (staticData.dayWiseOutfitRules) {
    const kr = keyReport('dayWiseOutfitRules');
    kr.found = 1;
    kr.toCreate = 1;
    if (!dryRun) {
      await OutfitRule.findOneAndUpdate({ userId }, { userId, rules: staticData.dayWiseOutfitRules }, { upsert: true });
      kr.created = 1;
    }
  }

  if (staticData.reflectionQuestionsList) {
    const kr = keyReport('reflectionQuestionsList');
    kr.found = 1;
    kr.toCreate = 1;
    if (!dryRun) {
      await ReflectionQuestionList.findOneAndUpdate({ userId }, { userId, questions: staticData.reflectionQuestionsList }, { upsert: true });
      kr.created = 1;
    }
  }

  for (const dateKey of Object.keys(staticData.reflectionEntriesData || {})) {
    const entry = staticData.reflectionEntriesData[dateKey];
    await createIfNew(ReflectionEntry, 'reflectionEntriesData', dateKey, {
      userId,
      dateKey,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(exportData.exportMeta.exportedAt),
      answers: entry.answers || [],
    });
  }

  for (const p of staticData.userProblemData || []) {
    let createdAt;
    const parsedTime = p.time ? new Date(p.time) : null;
    createdAt = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime : new Date(exportData.exportMeta.exportedAt);
    const doc = { userId, problem: p.problem, solution: p.solution || '', createdAt };
    const kr = keyReport('userProblemData');
    kr.found++;
    const fp = fingerprint('Problem', 'userProblemData', p.id || p.problem, doc);
    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate++;
      report.totals.skippedDuplicate++;
    } else {
      kr.toCreate++;
      report.totals.toCreate++;
      if (!dryRun) {
        try {
          const created = new Problem(doc);
          created.createdAt = createdAt; // explicit, since Mongoose timestamps would otherwise stamp "now"
          await created.save();
          markImported(ledger, fp, { model: 'Problem', key: 'userProblemData' });
          kr.created++;
          report.totals.created++;
        } catch (err) {
          kr.failed++;
          report.totals.failed++;
          logErr('userProblemData: ' + err.message);
        }
      }
    }
  }

  async function migrateRoutine(configKey, historyKey, routineType) {
    const config = staticData[configKey];
    if (config) {
      const kr = keyReport(configKey);
      kr.found = 1;
      kr.toCreate = 1;
      if (!dryRun) {
        await RoutineConfig.findOneAndUpdate(
          { userId, routineType },
          { userId, routineType, queries: Array.isArray(config) ? config : [] },
          { upsert: true }
        );
        kr.created = 1;
      }
    }
    for (const entry of staticData[historyKey] || []) {
      await createIfNew(RoutineHistory, historyKey, entry.date + JSON.stringify(entry.data), {
        userId,
        routineType,
        date: entry.date ? new Date(entry.date) : new Date(exportData.exportMeta.exportedAt),
        data: entry.data || {},
      });
    }
  }
  await migrateRoutine('healthQueryConfig', 'healthLogHistory', 'health');
  await migrateRoutine('proRoutineQueryConfig', 'proRoutineLogHistory', 'professional');

  for (const g of staticData.futureGoalsTracker || []) {
    await createIfNew(Target, 'futureGoalsTracker', g.id || g.name + g.targetDate, {
      userId,
      name: g.name,
      targetDate: g.targetDate,
      progressNote: g.progressNote || '',
    });
  }

  for (const app of staticData.internshipApplications || []) {
    const validStatuses = ['NeedToApply', 'Applied', 'Interview', 'Offer', 'Rejected'];
    let status = app.status;
    if (!validStatuses.includes(status)) {
      logWarn('internshipApplications: unrecognized status "' + status + '" for "' + app.company + '" - defaulting to NeedToApply.');
      status = 'NeedToApply';
    }
    await createIfNew(Internship, 'internshipApplications', app.id || app.company + app.role, {
      userId,
      company: app.company,
      role: app.role,
      dateApplied: app.dateApplied,
      status,
      mistakeMessage: app.mistakeMessage || '',
    });
  }

  for (const l of staticData.importantProfileLinks || []) {
    await createIfNew(ProfileLink, 'importantProfileLinks', l.id || l.name, {
      userId,
      name: l.name,
      link: l.link,
      password: l.password || '',
    });
  }

  for (const t of staticData.applyTasks || []) {
    await createIfNew(ApplyTask, 'applyTasks', t.id || t.name + t.deadline, {
      userId,
      name: t.name,
      deadline: t.deadline,
      link: t.link,
      applied: Boolean(t.applied),
    });
  }
  for (const t of staticData.ongoingTasks || []) {
    await createIfNew(OngoingTask, 'ongoingTasks', t.id || t.name + t.deadline, {
      userId,
      name: t.name,
      deadline: t.deadline,
      link: t.link || '',
      msg: t.msg || '',
      completed: Boolean(t.completed),
    });
  }

  for (const n of staticData.lifeManagerNotifications || []) {
    await createIfNew(Notification, 'lifeManagerNotifications', n.id || n.header + n.type, {
      userId,
      type: n.type,
      header: n.header,
      body: n.body,
      timestamp: n.timestamp ? new Date(n.timestamp) : new Date(exportData.exportMeta.exportedAt),
    });
  }

  // ---- keys requiring GridFS -----------------------------------------

  const codingProfileNameToId = {};
  for (const p of staticData.codingProfilesData || []) {
    const kr = keyReport('codingProfilesData');
    kr.found++;
    const fp = fingerprint('CodingProfile', 'codingProfilesData', p.id || p.name, { name: p.name, link: p.link });
    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate++;
      report.totals.skippedDuplicate++;
      // Even on a skip, we still need the id for FK resolution on a
      // second run - look it up by name instead of re-creating it.
      if (!dryRun) {
        const existing = await CodingProfile.findOne({ userId, name: p.name });
        if (existing) codingProfileNameToId[p.name] = existing._id;
      }
      continue;
    }
    kr.toCreate++;
    report.totals.toCreate++;
    const logo = await migrateFile(p.logo, 'media', 'coding-profile-logo-' + p.name);
    if (dryRun) {
      codingProfileNameToId[p.name] = 'dry-run-profile-id';
      continue;
    }

    try {
      const created = await CodingProfile.create({
        userId,
        name: p.name,
        link: p.link,
        password: p.password || '',
        totalProblems: p.totalProblems || 0,
        logoFileId: logo.fileId,
        logoContentType: logo.contentType,
      });
      codingProfileNameToId[p.name] = created._id;
      markImported(ledger, fp, { model: 'CodingProfile', key: 'codingProfilesData' });
      kr.created++;
      report.totals.created++;
    } catch (err) {
      kr.failed++;
      report.totals.failed++;
      logErr('codingProfilesData "' + p.name + '": ' + err.message);
    }
  }

  for (const dynKey of Object.keys(dynamicData.codingLogs || {})) {
    const profileName = dynKey.replace(/^codingLog_/, '');
    const profileId = codingProfileNameToId[profileName];
    const entries = dynamicData.codingLogs[dynKey] || [];

    if (!profileId && !dryRun) {
      logWarn('codingLog_' + profileName + ': no matching profile "' + profileName + '" in codingProfilesData - ' + entries.length + ' log entr(y/ies) skipped (orphaned).');
      const kr = keyReport('codingLog_<profileName>');
      kr.orphaned += entries.length;
      continue;
    }

    for (const e of entries) {
      await createIfNew(CodingLog, 'codingLog_<profileName>', profileName + (e.id || e.question), {
        userId,
        profileId: profileId || null,
        question: e.question,
        language: e.language || 'Python',
        date: e.date,
        learnings: e.learnings,
      });
    }
  }

  const courseNameToId = {};
  for (const c of staticData.learningCoursesData || []) {
    const kr = keyReport('learningCoursesData');
    kr.found++;
    const fp = fingerprint('Course', 'learningCoursesData', c.id || c.name, { name: c.name, source: c.source });
    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate++;
      report.totals.skippedDuplicate++;
      if (!dryRun) {
        const existing = await Course.findOne({ userId, name: c.name });
        if (existing) courseNameToId[c.name] = existing._id;
      } else {
        courseNameToId[c.name] = 'dry-run-course-id';
      }
      continue;
    }
    kr.toCreate++;
    report.totals.toCreate++;
    if (dryRun) {
      courseNameToId[c.name] = 'dry-run-course-id';
      continue;
    }
    try {
      const created = await Course.create({ userId, name: c.name, source: c.source });
      courseNameToId[c.name] = created._id;
      markImported(ledger, fp, { model: 'Course', key: 'learningCoursesData' });
      kr.created++;
      report.totals.created++;
    } catch (err) {
      kr.failed++;
      report.totals.failed++;
      logErr('learningCoursesData "' + c.name + '": ' + err.message);
    }
  }

  for (const dynKey of Object.keys(dynamicData.courseLogs || {})) {
    const courseName = dynKey.replace(/^courseLog_/, '');
    const courseId = courseNameToId[courseName];
    const entries = dynamicData.courseLogs[dynKey] || [];

    if (!courseId && !dryRun) {
      logWarn('courseLog_' + courseName + ': no matching course "' + courseName + '" in learningCoursesData - ' + entries.length + ' log entr(y/ies) skipped (orphaned).');
      const kr = keyReport('courseLog_<courseName>');
      kr.orphaned += entries.length;
      continue;
    }

    for (const e of entries) {
      await createIfNew(CourseLog, 'courseLog_<courseName>', courseName + (e.id || e.topic), {
        userId,
        courseId: courseId || null,
        link: e.link || '',
        topic: e.topic,
        date: e.date,
        learnings: e.learnings,
      });
    }
  }

  for (const d of staticData.userImportantDocuments || []) {
    const kr = keyReport('userImportantDocuments');
    kr.found++;
    const fp = fingerprint('DocumentMeta', 'userImportantDocuments', d.id || d.name, { name: d.name, size: d.size });
    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate++;
      report.totals.skippedDuplicate++;
      continue;
    }
    kr.toCreate++;
    report.totals.toCreate++;

    const decoded = decodeDataUrl(d.dataUrl);
    if (!decoded) {
      kr.failed++;
      report.totals.failed++;
      logErr('userImportantDocuments "' + d.name + '": no valid Base64 dataUrl found - skipped, NOT silently dropped from the report.');
      continue;
    }
    const file = await migrateFile(d.dataUrl, 'documents', d.name);
    if (dryRun) continue;
    try {
      await DocumentMeta.create({
        userId,
        name: d.name,
        type: (d.type || decoded.contentType || '').includes('pdf') ? 'PDF' : 'Image',
        size: d.size || decoded.buffer.length,
        fileName: d.fileName || d.name,
        mimeType: decoded.contentType,
        gridfsFileId: file.fileId,
      });
      markImported(ledger, fp, { model: 'DocumentMeta', key: 'userImportantDocuments' });
      kr.created++;
      report.totals.created++;
    } catch (err) {
      kr.failed++;
      report.totals.failed++;
      logErr('userImportantDocuments "' + d.name + '": ' + err.message);
    }
  }

  for (const n of staticData.inspirationNoteLog || []) {
    const kr = keyReport('inspirationNoteLog');
    kr.found++;
    const fp = fingerprint('Note', 'inspirationNoteLog', n.id || n.name, { name: n.name, message: n.message });
    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate++;
      report.totals.skippedDuplicate++;
      continue;
    }
    kr.toCreate++;
    report.totals.toCreate++;

    const image = await migrateFile(n.image, 'media', 'note-image-' + n.name);
    if (dryRun) continue;
    try {
      let noteCreatedAt = new Date();
      if (typeof n.id === 'number' && n.id > 1500000000000) {
        noteCreatedAt = new Date(n.id);
      } else if (n.date && typeof n.date === 'string') {
        const parts = n.date.split('/').map(Number);
        if (parts.length === 3) {
          noteCreatedAt = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0], 12, 0, 0));
        }
      }

      await Note.create({
        userId,
        name: n.name,
        link: n.link || '',
        message: n.message,
        date: n.date || new Date().toLocaleDateString(),
        createdAt: noteCreatedAt,
        imageFileId: image.fileId,
        imageContentType: image.contentType,
      });
      markImported(ledger, fp, { model: 'Note', key: 'inspirationNoteLog' });
      kr.created++;
      report.totals.created++;
    } catch (err) {
      kr.failed++;
      report.totals.failed++;
      logErr('inspirationNoteLog "' + n.name + '": ' + err.message);
    }
  }

  if (staticData.diarySettings) {
    const s = staticData.diarySettings;
    const kr = keyReport('diarySettings');
    kr.found = 1;
    // Fingerprinted like every other file-bearing record (NOT a bare
    // upsert-every-run) specifically so a second run does not re-upload
    // the same three images to GridFS, leaking orphaned files each time.
    const fp = fingerprint('DiarySettings', 'diarySettings', 'singleton', {
      textColor: s.textColor,
      fontFamily: s.fontFamily,
      penStyle: s.penStyle,
      bgImage: s.bgImage,
      frontCover: s.frontCoverImage || s.frontCover,
      backCover: s.backCoverImage || s.backCover,
    });
    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate = 1;
      report.totals.skippedDuplicate++;
    } else {
      kr.toCreate = 1;
      report.totals.toCreate++;
      const bg = await migrateFile(s.bgImage, 'media', 'diary-bg-image');
      const front = await migrateFile(s.frontCoverImage || s.frontCover, 'media', 'diary-front-cover');
      const back = await migrateFile(s.backCoverImage || s.backCover, 'media', 'diary-back-cover');
      if (!dryRun) {
        await DiarySettings.findOneAndUpdate(
          { userId },
          {
            userId,
            textColor: s.textColor || '#ffffff',
            fontFamily: s.fontFamily || 'Georgia, serif',
            penStyle: s.penStyle || 'default',
            bgImageFileId: bg.fileId,
            bgImageContentType: bg.contentType,
            frontCoverFileId: front.fileId,
            frontCoverContentType: front.contentType,
            backCoverFileId: back.fileId,
            backCoverContentType: back.contentType,
          },
          { upsert: true }
        );
        markImported(ledger, fp, { model: 'DiarySettings', key: 'diarySettings' });
        kr.created = 1;
        report.totals.created++;
      }
    }
  }

  for (const e of staticData.diaryHistory || []) {
    const kr = keyReport('diaryHistory');
    kr.found++;
    const fp = fingerprint('DiaryEntry', 'diaryHistory', e.id || e.dateTime, { content: e.content, dateTime: e.dateTime });
    if (isAlreadyImported(ledger, fp)) {
      kr.skippedDuplicate++;
      report.totals.skippedDuplicate++;
      continue;
    }
    kr.toCreate++;
    report.totals.toCreate++;
    const theme = e.theme || {};
    const bg = await migrateFile(theme.bgImage, 'media', 'diary-entry-bg-' + (e.id || e.dateTime));
    if (dryRun) continue;
    try {
      await DiaryEntry.create({
        userId,
        content: e.content,
        dateTime: e.dateTime ? new Date(e.dateTime) : new Date(exportData.exportMeta.exportedAt),
        displayDateTime: e.displayDateTime || new Date(e.dateTime || exportData.exportMeta.exportedAt).toLocaleString(),
        theme: {
          textColor: theme.textColor || '#ffffff',
          fontFamily: theme.fontFamily || 'Georgia, serif',
          bgImageFileId: bg.fileId,
          bgImageContentType: bg.contentType,
        },
      });
      markImported(ledger, fp, { model: 'DiaryEntry', key: 'diaryHistory' });
      kr.created++;
      report.totals.created++;
    } catch (err) {
      kr.failed++;
      report.totals.failed++;
      logErr('diaryHistory entry: ' + err.message);
    }
  }

  // ---- unmapped-key detection (anything present in the export that
  // MAPPING_TABLE doesn't account for at all) --------------------------

  const mappedStaticKeys = new Set(
    MAPPING_TABLE.filter((m) => m.status !== 'UNMAPPED' && !m.key.includes('<')).map((m) => m.key)
  );
  const unmappedFound = [];
  for (const k of Object.keys(staticData)) {
    if (!mappedStaticKeys.has(k)) unmappedFound.push(k);
  }
  if (unmappedFound.length > 0) {
    logWarn('Keys present in the export with NO entry in mappingTable.js (please review): ' + unmappedFound.join(', '));
  }

  // ---- finish ---------------------------------------------------------

  if (!dryRun) saveLedger(ledger);
  await disconnectDB();

  report.finishedAt = new Date().toISOString();

  const reportPath = path.join(__dirname, '..', 'state', dryRun ? 'last-dry-run-report.json' : 'last-import-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n========== MIGRATION REPORT (' + report.mode + ') ==========');
  console.log('Source file:', file);
  console.log('Target user:', targetUsername, '(' + userId + ')');
  console.log('');
  console.log('Per-key results:');
  for (const key of Object.keys(report.perKey)) {
    const r = report.perKey[key];
    console.log(
      '  ' + key.padEnd(32) + ' found=' + r.found + ' toCreate=' + r.toCreate + ' created=' + r.created + ' skippedDup=' + r.skippedDuplicate + ' orphaned=' + r.orphaned + ' failed=' + r.failed
    );
  }
  console.log('');
  console.log('GridFS uploads: wouldUpload=' + report.gridfsUploads.wouldUpload + ' uploaded=' + report.gridfsUploads.uploaded);
  console.log('Totals: toCreate=' + report.totals.toCreate + ' created=' + report.totals.created + ' skippedDuplicate=' + report.totals.skippedDuplicate + ' failed=' + report.totals.failed);
  if (report.warnings.length) {
    console.log('\nWarnings:');
    report.warnings.forEach((w) => console.log('  ⚠ ' + w));
  }
  if (report.errors.length) {
    console.log('\nErrors:');
    report.errors.forEach((e) => console.log('  ✖ ' + e));
  }
  console.log('\nFull JSON report written to: ' + reportPath);
  if (dryRun) {
    console.log('\nThis was a DRY RUN. No data was written to MongoDB or GridFS.');
    console.log('Review the report above, then re-run with --commit to perform the real import.');
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
