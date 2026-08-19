'use strict';

/**
 * The single source of truth for OLD localStorage key -> NEW MongoDB
 * model mapping. Used by BOTH import.js (to drive the actual migration)
 * and the migration report (so the report can never drift from what the
 * importer actually does - one table, not two).
 *
 * status: 'MAPPED' | 'UNMAPPED' | 'INTENTIONALLY_IGNORED'
 */
const MAPPING_TABLE = [
  {
    key: 'tompAppUsername',
    model: null,
    status: 'INTENTIONALLY_IGNORED',
    reason:
      'Auth was redesigned in Phase 3.1 (bcrypt-hashed passwords via /api/auth/setup). ' +
      'The old plaintext username/password pair is not migrated - re-registering via the ' +
      'app is required. Migrating a legacy plaintext credential into the new hashed scheme ' +
      'would also be a security downgrade path, not just a data-shape change.',
  },
  { key: 'tompAppPassword', model: null, status: 'INTENTIONALLY_IGNORED', reason: 'See tompAppUsername.' },

  {
    key: 'lifeManagerNotifications',
    model: 'Notification',
    status: 'MAPPED',
    reason:
      'Notifications are regenerated server-side on every GET /api/notifications (see ' +
      'notificationController.js), so old stored notifications are historical only. ' +
      'Imported as-is for completeness; the app will also regenerate fresh ones on next load.',
  },

  { key: 'dailyTasksData', model: 'ScheduleTask', status: 'MAPPED', reason: 'Direct field mapping; `time` defaults to "N/A" if absent in old records.' },
  { key: 'pastPendingTasksData', model: 'PendingTask', status: 'MAPPED', reason: 'Direct field mapping.' },
  {
    key: 'scheduleHistoryData',
    model: 'ScheduleHistory',
    status: 'MAPPED',
    reason:
      'Old records had two redundant fields (`completedDateString`, a pre-formatted string, ' +
      'and `completedTime`, a raw ms timestamp). Both collapse into a single real `completedAt` ' +
      'Date - the new schema formats for display per-view instead of storing a frozen string.',
  },
  { key: 'rememberActiveTasks', model: 'RememberTask', status: 'MAPPED', reason: 'status: "active".' },
  { key: 'rememberHistoryTasks', model: 'RememberTask', status: 'MAPPED', reason: 'status: "done"; completedAt required, defaults to the export timestamp if the old record never had one.' },
  { key: 'lastScheduleVisitDate', model: 'ScheduleMeta', status: 'MAPPED', reason: 'Direct string -> lastVisitDate field.' },

  { key: 'myWardrobeList', model: 'Wardrobe', status: 'MAPPED', reason: 'Direct {shirts, pants} mapping.' },
  { key: 'dayWiseOutfitRules', model: 'OutfitRule', status: 'MAPPED', reason: 'Direct object -> Mixed `rules` field.' },

  {
    key: 'reflectionEntriesData',
    model: 'ReflectionEntry',
    status: 'MAPPED',
    reason: 'Old object keyed by dateKey -> one ReflectionEntry document per dateKey (matches the schema already built for this in Phase 3.3).',
  },
  { key: 'reflectionQuestionsList', model: 'ReflectionQuestionList', status: 'MAPPED', reason: 'Direct array -> questions field.' },
  { key: 'userProblemData', model: 'Problem', status: 'MAPPED', reason: 'Old pre-formatted `time` string is parsed back into a real Date and written as createdAt where possible; falls back to the export timestamp if unparseable.' },

  { key: 'healthQueryConfig', model: 'RoutineConfig', status: 'MAPPED', reason: 'routineType: "health"; array items mapped 1:1 into the `queries` subdocument array.' },
  { key: 'healthLogHistory', model: 'RoutineHistory', status: 'MAPPED', reason: 'routineType: "health".' },
  { key: 'proRoutineQueryConfig', model: 'RoutineConfig', status: 'MAPPED', reason: 'routineType: "professional".' },
  { key: 'proRoutineLogHistory', model: 'RoutineHistory', status: 'MAPPED', reason: 'routineType: "professional".' },

  { key: 'futureGoalsTracker', model: 'Target', status: 'MAPPED', reason: 'Direct field mapping.' },

  {
    key: 'codingProfilesData',
    model: 'CodingProfile',
    status: 'MAPPED',
    reason:
      'Direct field mapping EXCEPT `logo` (a Base64 data URL in the old data): decoded and ' +
      'uploaded to the existing GridFS "media" bucket (same bucket Coding Profile logos already ' +
      'use in the running app), producing a real logoFileId - never stored as Base64 in MongoDB. ' +
      'A name -> new ObjectId map is recorded for codingLog_<name> resolution (see below).',
  },
  { key: 'currentCodingProfile', model: null, status: 'INTENTIONALLY_IGNORED', reason: 'Transient UI handoff variable (pre-React-Router artifact) - a real route param now, nothing to migrate.' },
  {
    key: 'codingLog_<profileName> (dynamic prefix)',
    model: 'CodingLog',
    status: 'MAPPED',
    reason:
      'The dynamic key suffix IS the profile name (the original had no numeric profile ID in ' +
      'this key). Resolved via the name -> new ObjectId map built while importing ' +
      'codingProfilesData. If a codingLog_<name> key exists with no matching profile in ' +
      'codingProfilesData, it is reported as a WARNING (orphaned log) and skipped, not silently dropped.',
  },

  {
    key: 'learningCoursesData',
    model: 'Course',
    status: 'MAPPED',
    reason: 'Direct field mapping. A name -> new ObjectId map is recorded for courseLog_<name> resolution.',
  },
  { key: 'currentLearningCourse', model: null, status: 'INTENTIONALLY_IGNORED', reason: 'Transient UI handoff variable - same as currentCodingProfile.' },
  {
    key: 'courseLog_<courseName> (dynamic prefix)',
    model: 'CourseLog',
    status: 'MAPPED',
    reason: 'Same name-based resolution strategy as codingLog_<profileName>. Orphaned logs (no matching course) are reported, not dropped silently.',
  },

  {
    key: 'internshipApplications',
    model: 'Internship',
    status: 'MAPPED',
    reason:
      'Direct field mapping. `status` is matched against the new enum ' +
      '[NeedToApply, Applied, Interview, Offer, Rejected]; an unrecognized old status value ' +
      'is reported as a WARNING and defaults to "NeedToApply" rather than failing the whole record.',
  },
  { key: 'editProfileId', model: null, status: 'INTENTIONALLY_IGNORED', reason: 'Transient UI handoff variable.' },

  {
    key: 'userImportantDocuments',
    model: 'DocumentMeta',
    status: 'MAPPED',
    reason:
      'Each record\'s Base64 `dataUrl` is decoded into a Buffer and uploaded to the EXISTING ' +
      'GridFS "documents" bucket via uploadBuffer() (src/utils/gridfs.js, reused unmodified). ' +
      'Only the resulting gridfsFileId + metadata (name, type, size, fileName, mimeType) is ' +
      'written to MongoDB - the Base64 content itself is never persisted.',
  },

  { key: 'importantProfileLinks', model: 'ProfileLink', status: 'MAPPED', reason: 'Direct field mapping.' },

  {
    key: 'inspirationNoteLog',
    model: 'Note',
    status: 'MAPPED',
    reason: 'Direct field mapping EXCEPT `image` (Base64) - decoded and uploaded to the GridFS "media" bucket, producing imageFileId, same as Documents above.',
  },

  {
    key: 'diarySettings',
    model: 'DiarySettings',
    status: 'MAPPED',
    reason:
      'Direct field mapping EXCEPT `bgImage`/`frontCoverImage`/`backCoverImage` (Base64) - each ' +
      'independently decoded and uploaded to the GridFS "media" bucket. A cover left at its ' +
      'default (no custom Base64 present) stays null, matching the app\'s existing ' +
      'default-to-bundled-asset behavior.',
  },
  {
    key: 'diaryHistory',
    model: 'DiaryEntry',
    status: 'MAPPED',
    reason:
      'Direct field mapping. Each entry\'s OWN `theme.bgImage` (Base64, a frozen per-entry ' +
      'snapshot in the original) is independently decoded and uploaded as its OWN GridFS file - ' +
      'never a shared reference to the settings image - preserving the original\'s "past entries ' +
      'never retroactively change" guarantee (same reasoning already documented in DiaryEntry.js).',
  },

  { key: 'applyTasks', model: 'ApplyTask', status: 'MAPPED', reason: 'Direct field mapping (needtoapply.html).' },
  { key: 'ongoingTasks', model: 'OngoingTask', status: 'MAPPED', reason: 'Direct field mapping (ongoing.html).' },

  {
    key: 'motivateTag',
    model: null,
    status: 'INTENTIONALLY_IGNORED',
    reason:
      'DashboardPage.jsx deliberately keeps this one small widget on browser localStorage ' +
      '(Phase 3.2 design decision - see that page\'s comments) since it is not one of the ' +
      'excluded/included business modules and needs no backend. Not part of this migration ' +
      'because the running app never reads it from MongoDB in the first place.',
  },

  {
    key: 'applied_items',
    model: null,
    status: 'INTENTIONALLY_IGNORED',
    reason: 'Belongs to applied.html - an experimental prototype file explicitly excluded from the production application (project owner\'s Phase 3.3 correction). Recorded if present in the export, never imported.',
  },
  {
    key: 'message_countdown_targets',
    model: null,
    status: 'INTENTIONALLY_IGNORED',
    reason: 'Belongs to display.html - same exclusion as applied_items.',
  },
];

module.exports = { MAPPING_TABLE };
