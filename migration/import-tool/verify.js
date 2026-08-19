'use strict';

/**
 * Compares the OLD exported localStorage JSON against the CURRENT
 * MongoDB/GridFS state and reports matched/missing/mismatched counts.
 * Read-only: makes no writes anywhere.
 *
 * Usage:
 *   node import-tool/verify.js --file=./tomt-localstorage-backup.json
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, '..', '..', 'tomp-backend', 'src');
const { connectDB, disconnectDB } = require(path.join(BACKEND_SRC, 'config', 'db.js'));

const User = require(path.join(BACKEND_SRC, 'models', 'User.js'));
const ScheduleTask = require(path.join(BACKEND_SRC, 'models', 'ScheduleTask.js'));
const ScheduleHistory = require(path.join(BACKEND_SRC, 'models', 'ScheduleHistory.js'));
const PendingTask = require(path.join(BACKEND_SRC, 'models', 'PendingTask.js'));
const RememberTask = require(path.join(BACKEND_SRC, 'models', 'RememberTask.js'));
const ReflectionEntry = require(path.join(BACKEND_SRC, 'models', 'ReflectionEntry.js'));
const Problem = require(path.join(BACKEND_SRC, 'models', 'Problem.js'));
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
const DiaryEntry = require(path.join(BACKEND_SRC, 'models', 'DiaryEntry.js'));
const ApplyTask = require(path.join(BACKEND_SRC, 'models', 'ApplyTask.js'));
const OngoingTask = require(path.join(BACKEND_SRC, 'models', 'OngoingTask.js'));

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='));
  return { file: fileArg ? fileArg.split('=').slice(1).join('=') : path.join(__dirname, '..', 'tomt-localstorage-backup.json') };
}

async function countFor(Model, userId) {
  return Model.countDocuments({ userId });
}

function normalizeBackupData(raw) {
  if (raw && raw.exportMeta && (raw.static || raw.dynamic)) {
    return raw;
  }
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

async function run() {
  const { file } = parseArgs();
  if (!fs.existsSync(file)) {
    console.error('Export file not found: ' + file);
    process.exit(1);
  }
  const rawFile = JSON.parse(fs.readFileSync(file, 'utf8'));
  const exportData = normalizeBackupData(rawFile);
  const staticData = exportData.static || {};
  const dynamicData = exportData.dynamic || {};

  const targetUsername = process.env.MIGRATION_TARGET_USERNAME;
  if (!targetUsername) {
    console.error('MIGRATION_TARGET_USERNAME is not set.');
    process.exit(1);
  }

  await connectDB();
  const user = await User.findOne({ username: targetUsername });
  if (!user) {
    console.error('No user found with username "' + targetUsername + '".');
    await disconnectDB();
    process.exit(1);
  }
  const userId = user._id;

  const expectedCodingLogCount = Object.values(dynamicData.codingLogs || {}).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);
  const expectedCourseLogCount = Object.values(dynamicData.courseLogs || {}).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);

  const rows = [
    ['dailyTasksData', (staticData.dailyTasksData || []).length, await countFor(ScheduleTask, userId)],
    ['pastPendingTasksData', (staticData.pastPendingTasksData || []).length, await countFor(PendingTask, userId)],
    ['scheduleHistoryData', (staticData.scheduleHistoryData || []).length, await countFor(ScheduleHistory, userId)],
    [
      'rememberActiveTasks + rememberHistoryTasks',
      (staticData.rememberActiveTasks || []).length + (staticData.rememberHistoryTasks || []).length,
      await countFor(RememberTask, userId),
    ],
    ['reflectionEntriesData (dateKeys)', Object.keys(staticData.reflectionEntriesData || {}).length, await countFor(ReflectionEntry, userId)],
    ['userProblemData', (staticData.userProblemData || []).length, await countFor(Problem, userId)],
    [
      'healthLogHistory + proRoutineLogHistory',
      (staticData.healthLogHistory || []).length + (staticData.proRoutineLogHistory || []).length,
      await countFor(RoutineHistory, userId),
    ],
    ['futureGoalsTracker', (staticData.futureGoalsTracker || []).length, await countFor(Target, userId)],
    ['codingProfilesData', (staticData.codingProfilesData || []).length, await countFor(CodingProfile, userId)],
    ['codingLog_<profileName> (all entries)', expectedCodingLogCount, await countFor(CodingLog, userId)],
    ['learningCoursesData', (staticData.learningCoursesData || []).length, await countFor(Course, userId)],
    ['courseLog_<courseName> (all entries)', expectedCourseLogCount, await countFor(CourseLog, userId)],
    ['internshipApplications', (staticData.internshipApplications || []).length, await countFor(Internship, userId)],
    ['userImportantDocuments', (staticData.userImportantDocuments || []).length, await countFor(DocumentMeta, userId)],
    ['importantProfileLinks', (staticData.importantProfileLinks || []).length, await countFor(ProfileLink, userId)],
    ['inspirationNoteLog', (staticData.inspirationNoteLog || []).length, await countFor(Note, userId)],
    ['diaryHistory', (staticData.diaryHistory || []).length, await countFor(DiaryEntry, userId)],
    ['applyTasks', (staticData.applyTasks || []).length, await countFor(ApplyTask, userId)],
    ['ongoingTasks', (staticData.ongoingTasks || []).length, await countFor(OngoingTask, userId)],
  ];

  console.log('\n========== MIGRATION VERIFICATION ==========');
  console.log('Export file:', file);
  console.log('Target user:', targetUsername, '(' + userId + ')');
  console.log('');
  console.log('Key'.padEnd(42) + 'Expected'.padEnd(10) + 'InMongoDB'.padEnd(12) + 'Status');
  console.log('-'.repeat(80));

  let mismatches = 0;
  for (const [label, expected, actual] of rows) {
    let status;
    if (expected === 0 && actual === 0) status = 'OK (none expected)';
    else if (actual >= expected) status = actual === expected ? 'OK (exact match)' : 'OK (>= expected, likely prior runs/manual entries)';
    else {
      status = 'MISMATCH - missing ' + (expected - actual);
      mismatches++;
    }
    console.log(label.padEnd(42) + String(expected).padEnd(10) + String(actual).padEnd(12) + status);
  }

  // Documents / GridFS: compare metadata (size, filename) rather than
  // trying to reconstruct and compare Base64 content, per requirement #10.
  console.log('\n--- Document metadata spot-check (size/filename, not content) ---');
  const oldDocs = staticData.userImportantDocuments || [];
  const newDocs = await DocumentMeta.find({ userId });
  for (const oldDoc of oldDocs) {
    const trimmedOldName = (oldDoc.name || '').trim();
    const match = newDocs.find((d) => d.name === trimmedOldName && (d.fileName === (oldDoc.fileName || oldDoc.name) || d.fileName === trimmedOldName));
    if (!match) {
      console.log('  MISSING in MongoDB: "' + oldDoc.name + '"');
      mismatches++;
    } else if (oldDoc.size && match.size !== oldDoc.size) {
      console.log('  SIZE MISMATCH: "' + oldDoc.name + '" old=' + oldDoc.size + ' new=' + match.size);
      mismatches++;
    } else {
      console.log('  OK: "' + oldDoc.name + '" (' + match.size + ' bytes, gridfsFileId=' + match.gridfsFileId + ')');
    }
  }

  console.log('\n' + (mismatches === 0 ? '✔ No mismatches found.' : '⚠ ' + mismatches + ' mismatch(es) found - see above.'));

  await disconnectDB();
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
