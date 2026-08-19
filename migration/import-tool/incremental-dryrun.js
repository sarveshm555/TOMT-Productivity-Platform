'use strict';

/**
 * INCREMENTAL DRY RUN SCRIPT
 * Compares the NEW August 19 localStorage backup against the CURRENT MongoDB state for user sarvesh.
 *
 * READ-ONLY: 0 writes, 0 updates, 0 deletions, 0 GridFS uploads.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, '..', '..', 'tomp-backend', 'src');
const { connectDB, disconnectDB } = require(path.join(BACKEND_SRC, 'config', 'db.js'));

const User = require(path.join(BACKEND_SRC, 'models', 'User.js'));
const ApplyTask = require(path.join(BACKEND_SRC, 'models', 'ApplyTask.js'));
const CodingLog = require(path.join(BACKEND_SRC, 'models', 'CodingLog.js'));
const CodingProfile = require(path.join(BACKEND_SRC, 'models', 'CodingProfile.js'));
const Course = require(path.join(BACKEND_SRC, 'models', 'Course.js'));
const CourseLog = require(path.join(BACKEND_SRC, 'models', 'CourseLog.js'));
const DiaryEntry = require(path.join(BACKEND_SRC, 'models', 'DiaryEntry.js'));
const DiarySettings = require(path.join(BACKEND_SRC, 'models', 'DiarySettings.js'));
const DocumentMeta = require(path.join(BACKEND_SRC, 'models', 'DocumentMeta.js'));
const Internship = require(path.join(BACKEND_SRC, 'models', 'Internship.js'));
const Note = require(path.join(BACKEND_SRC, 'models', 'Note.js'));
const Notification = require(path.join(BACKEND_SRC, 'models', 'Notification.js'));
const OngoingTask = require(path.join(BACKEND_SRC, 'models', 'OngoingTask.js'));
const OutfitRule = require(path.join(BACKEND_SRC, 'models', 'OutfitRule.js'));
const PendingTask = require(path.join(BACKEND_SRC, 'models', 'PendingTask.js'));
const Problem = require(path.join(BACKEND_SRC, 'models', 'Problem.js'));
const ProfileLink = require(path.join(BACKEND_SRC, 'models', 'ProfileLink.js'));
const ReflectionEntry = require(path.join(BACKEND_SRC, 'models', 'ReflectionEntry.js'));
const ReflectionQuestionList = require(path.join(BACKEND_SRC, 'models', 'ReflectionQuestionList.js'));
const RememberTask = require(path.join(BACKEND_SRC, 'models', 'RememberTask.js'));
const RoutineConfig = require(path.join(BACKEND_SRC, 'models', 'RoutineConfig.js'));
const RoutineHistory = require(path.join(BACKEND_SRC, 'models', 'RoutineHistory.js'));
const ScheduleHistory = require(path.join(BACKEND_SRC, 'models', 'ScheduleHistory.js'));
const ScheduleMeta = require(path.join(BACKEND_SRC, 'models', 'ScheduleMeta.js'));
const ScheduleTask = require(path.join(BACKEND_SRC, 'models', 'ScheduleTask.js'));
const Target = require(path.join(BACKEND_SRC, 'models', 'Target.js'));
const Wardrobe = require(path.join(BACKEND_SRC, 'models', 'Wardrobe.js'));

function parseField(raw, k) {
  let v = raw[k];
  if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
    try { return JSON.parse(v); } catch(e) { return v; }
  }
  return v;
}

async function run() {
  await connectDB();

  const user = await User.findOne({ username: 'sarvesh' });
  if (!user) throw new Error('User sarvesh not found');
  const userId = user._id;

  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'backup', 'tomt-localstorage-backup.json'), 'utf8'));

  const report = {
    summary: {
      totalExamined: 0,
      alreadyExisting: 0,
      newRecords: 0,
      modifiedRecords: 0,
      duplicates: 0,
      conflicts: 0,
      unmapped: 0,
      newGridFSFiles: 0,
    },
    newItemsDetailed: [],
    modifiedItemsDetailed: [],
    unchangedCounts: {},
    gridfsAnalysis: {
      existingFilesSkipped: [],
      newFilesRequired: [],
    },
  };

  // 1. NOTES (inspirationNoteLog)
  const notes = parseField(raw, 'inspirationNoteLog') || [];
  const mongoNotes = await Note.find({ userId });
  report.unchangedCounts['inspirationNoteLog (Note)'] = 0;
  for (const n of notes) {
    report.summary.totalExamined++;
    const trimmedName = (n.name || '').trim();
    const match = mongoNotes.find(m => m.name === trimmedName && m.message === n.message);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['inspirationNoteLog (Note)']++;
    } else {
      const partialMatch = mongoNotes.find(m => m.name === trimmedName);
      if (partialMatch) {
        report.summary.modifiedRecords++;
        report.modifiedItemsDetailed.push({
          module: 'inspirationNoteLog',
          title: n.name,
          date: n.date,
          mongoId: partialMatch._id,
          reason: 'Note title exists but message/link differs',
        });
      } else {
        report.summary.newRecords++;
        const hasImg = !!(n.image && n.image.length > 50);
        if (hasImg) report.summary.newGridFSFiles++;
        report.newItemsDetailed.push({
          key: 'inspirationNoteLog',
          collection: 'Note',
          id: n.id,
          title: n.name,
          date: n.date,
          derivedTimestamp: (typeof n.id === 'number' && n.id > 1500000000000) ? new Date(n.id).toISOString() : n.date,
          hasImage: hasImg,
          snippet: (n.message || '').substring(0, 70),
        });
        if (hasImg) {
          report.gridfsAnalysis.newFilesRequired.push({
            module: 'inspirationNoteLog',
            name: n.name,
            fileType: 'Note inline image',
          });
        }
      }
    }
  }

  // 2. DIARY ENTRIES (diaryHistory)
  const diary = parseField(raw, 'diaryHistory') || [];
  const mongoDiary = await DiaryEntry.find({ userId });
  report.unchangedCounts['diaryHistory (DiaryEntry)'] = 0;
  for (const d of diary) {
    report.summary.totalExamined++;
    const bDisplay = d.displayDateTime || d.dateTime;
    const match = mongoDiary.find(m => m.displayDateTime === bDisplay && m.content === d.content);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['diaryHistory (DiaryEntry)']++;
    } else {
      const partialMatch = mongoDiary.find(m => m.displayDateTime === bDisplay);
      if (partialMatch) {
        report.summary.modifiedRecords++;
        report.modifiedItemsDetailed.push({
          module: 'diaryHistory',
          identifier: bDisplay,
          mongoId: partialMatch._id,
          reason: 'Entry exists for same displayDateTime but content differs',
        });
      } else {
        report.summary.newRecords++;
        const hasBg = !!(d.theme && d.theme.bgImage && d.theme.bgImage.length > 50);
        if (hasBg) report.summary.newGridFSFiles++;
        report.newItemsDetailed.push({
          key: 'diaryHistory',
          collection: 'DiaryEntry',
          id: d.id,
          date: d.dateTime,
          displayDateTime: d.displayDateTime,
          hasBgImage: hasBg,
          snippet: (d.content || '').substring(0, 70),
        });
        if (hasBg) {
          report.gridfsAnalysis.newFilesRequired.push({
            module: 'diaryHistory',
            name: 'Diary BG ' + d.displayDateTime,
            fileType: 'Diary custom background image',
          });
        }
      }
    }
  }

  // 3. INTERNSHIPS (internshipApplications)
  const internships = parseField(raw, 'internshipApplications') || [];
  const mongoInternships = await Internship.find({ userId });
  report.unchangedCounts['internshipApplications (Internship)'] = 0;
  for (const item of internships) {
    report.summary.totalExamined++;
    const tComp = (item.company || '').trim();
    const tRole = (item.role || '').trim();
    const match = mongoInternships.find(m => m.company === tComp && m.role === tRole);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['internshipApplications (Internship)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({
        key: 'internshipApplications',
        collection: 'Internship',
        id: item.id,
        company: item.company,
        role: item.role,
        status: item.status,
        dateApplied: item.dateApplied,
      });
    }
  }

  // 4. ROUTINE LOG HISTORY (healthLogHistory & proRoutineLogHistory)
  const healthLogs = parseField(raw, 'healthLogHistory') || [];
  const mongoHealth = await RoutineHistory.find({ userId, routineType: 'health' });
  report.unchangedCounts['healthLogHistory (RoutineHistory:health)'] = 0;
  for (const h of healthLogs) {
    report.summary.totalExamined++;
    const match = mongoHealth.find(m => m.date && m.date.toISOString().slice(0, 10) === (h.date || '').slice(0, 10));
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['healthLogHistory (RoutineHistory:health)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({
        key: 'healthLogHistory',
        collection: 'RoutineHistory (health)',
        date: h.date,
      });
    }
  }

  const proLogs = parseField(raw, 'proRoutineLogHistory') || [];
  const mongoPro = await RoutineHistory.find({ userId, routineType: 'professional' });
  report.unchangedCounts['proRoutineLogHistory (RoutineHistory:professional)'] = 0;
  for (const p of proLogs) {
    report.summary.totalExamined++;
    const match = mongoPro.find(m => m.date && m.date.toISOString().slice(0, 10) === (p.date || '').slice(0, 10));
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['proRoutineLogHistory (RoutineHistory:professional)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({
        key: 'proRoutineLogHistory',
        collection: 'RoutineHistory (professional)',
        date: p.date,
      });
    }
  }

  // 5. REFLECTIONS (reflectionEntriesData)
  const reflections = parseField(raw, 'reflectionEntriesData') || {};
  const mongoReflections = await ReflectionEntry.find({ userId });
  report.unchangedCounts['reflectionEntriesData (ReflectionEntry)'] = 0;
  for (const dateKey of Object.keys(reflections)) {
    report.summary.totalExamined++;
    const match = mongoReflections.find(m => m.dateKey === dateKey);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['reflectionEntriesData (ReflectionEntry)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({
        key: 'reflectionEntriesData',
        collection: 'ReflectionEntry',
        dateKey: dateKey,
        answersCount: (reflections[dateKey] && reflections[dateKey].answers ? reflections[dateKey].answers : reflections[dateKey] || []).length,
      });
    }
  }

  // 6. REMEMBER TASKS (rememberActiveTasks & rememberHistoryTasks)
  const activeRemember = parseField(raw, 'rememberActiveTasks') || [];
  const historyRemember = parseField(raw, 'rememberHistoryTasks') || [];
  const mongoRemember = await RememberTask.find({ userId });
  report.unchangedCounts['rememberActiveTasks (RememberTask)'] = 0;
  report.unchangedCounts['rememberHistoryTasks (RememberTask)'] = 0;

  for (const item of activeRemember) {
    report.summary.totalExamined++;
    const tText = (item.text || '').trim();
    const match = mongoRemember.find(m => m.text === tText && m.status === 'active');
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['rememberActiveTasks (RememberTask)']++;
    } else {
      const anyMatch = mongoRemember.find(m => m.text === tText);
      if (anyMatch) {
        report.summary.modifiedRecords++;
        report.modifiedItemsDetailed.push({
          module: 'rememberActiveTasks',
          text: item.text,
          mongoStatus: anyMatch.status,
          backupStatus: 'active',
          reason: 'Task status changed between active/done',
        });
      } else {
        report.summary.newRecords++;
        report.newItemsDetailed.push({
          key: 'rememberActiveTasks',
          collection: 'RememberTask',
          id: item.id,
          text: item.text,
          status: 'active',
        });
      }
    }
  }

  for (const item of historyRemember) {
    report.summary.totalExamined++;
    const tText = (item.text || '').trim();
    const match = mongoRemember.find(m => m.text === tText && m.status === 'done');
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['rememberHistoryTasks (RememberTask)']++;
    } else {
      const anyMatch = mongoRemember.find(m => m.text === tText);
      if (anyMatch) {
        report.summary.modifiedRecords++;
        report.modifiedItemsDetailed.push({
          module: 'rememberHistoryTasks',
          text: item.text,
          mongoStatus: anyMatch.status,
          backupStatus: 'done',
          reason: 'Task status changed between active/done',
        });
      } else {
        report.summary.newRecords++;
        report.newItemsDetailed.push({
          key: 'rememberHistoryTasks',
          collection: 'RememberTask',
          id: item.id,
          text: item.text,
          status: 'done',
        });
      }
    }
  }

  // 7. SCHEDULE HISTORY (scheduleHistoryData)
  const schedHistory = parseField(raw, 'scheduleHistoryData') || [];
  const mongoSched = await ScheduleHistory.find({ userId });
  report.unchangedCounts['scheduleHistoryData (ScheduleHistory)'] = 0;
  for (const s of schedHistory) {
    report.summary.totalExamined++;
    const tTask = (s.task || '').trim();
    const match = mongoSched.find(m => m.task === tTask);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['scheduleHistoryData (ScheduleHistory)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({
        key: 'scheduleHistoryData',
        collection: 'ScheduleHistory',
        task: s.task,
        dueDate: s.dueDate,
      });
    }
  }

  // 8. FUTURE GOALS (futureGoalsTracker)
  const goals = parseField(raw, 'futureGoalsTracker') || [];
  const mongoGoals = await Target.find({ userId });
  report.unchangedCounts['futureGoalsTracker (Target)'] = 0;
  for (const g of goals) {
    report.summary.totalExamined++;
    const tName = (g.name || g.targetName || g.goal || '').trim();
    const match = mongoGoals.find(m => m.name === tName);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['futureGoalsTracker (Target)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({ key: 'futureGoalsTracker', collection: 'Target', name: tName });
    }
  }

  // 9. CODING PROFILES & LOGS
  const profiles = parseField(raw, 'codingProfilesData') || [];
  const mongoProfiles = await CodingProfile.find({ userId });
  report.unchangedCounts['codingProfilesData (CodingProfile)'] = 0;
  for (const p of profiles) {
    report.summary.totalExamined++;
    const tName = (p.name || '').trim();
    const match = mongoProfiles.find(m => m.name === tName);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['codingProfilesData (CodingProfile)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({ key: 'codingProfilesData', collection: 'CodingProfile', name: p.name });
    }
  }

  const mongoCodingLogs = await CodingLog.find({ userId });
  report.unchangedCounts['codingLogs (CodingLog)'] = 0;
  for (const k of Object.keys(raw)) {
    if (k.startsWith('codingLog_')) {
      const logs = parseField(raw, k) || [];
      const profileName = k.replace('codingLog_', '').trim();
      for (const cl of logs) {
        report.summary.totalExamined++;
        const match = mongoCodingLogs.find(m => m.question === cl.question && m.date === cl.date);
        if (match) {
          report.summary.alreadyExisting++;
          report.unchangedCounts['codingLogs (CodingLog)']++;
        } else {
          report.summary.newRecords++;
          report.newItemsDetailed.push({ key: k, collection: 'CodingLog', profileName, question: cl.question, date: cl.date });
        }
      }
    }
  }

  // 10. COURSES & LOGS
  const courses = parseField(raw, 'learningCoursesData') || [];
  const mongoCourses = await Course.find({ userId });
  report.unchangedCounts['learningCoursesData (Course)'] = 0;
  for (const c of courses) {
    report.summary.totalExamined++;
    const tName = (c.name || '').trim();
    const match = mongoCourses.find(m => m.name === tName);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['learningCoursesData (Course)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({ key: 'learningCoursesData', collection: 'Course', name: c.name });
    }
  }

  const mongoCourseLogs = await CourseLog.find({ userId });
  report.unchangedCounts['courseLogs (CourseLog)'] = 0;
  for (const k of Object.keys(raw)) {
    if (k.startsWith('courseLog_')) {
      const logs = parseField(raw, k) || [];
      const courseName = k.replace('courseLog_', '').trim();
      for (const cl of logs) {
        report.summary.totalExamined++;
        const match = mongoCourseLogs.find(m => m.topic === cl.topic && m.date === cl.date);
        if (match) {
          report.summary.alreadyExisting++;
          report.unchangedCounts['courseLogs (CourseLog)']++;
        } else {
          report.summary.newRecords++;
          report.newItemsDetailed.push({ key: k, collection: 'CourseLog', courseName, topic: cl.topic, date: cl.date });
        }
      }
    }
  }

  // 11. DOCUMENTS (userImportantDocuments)
  const docs = parseField(raw, 'userImportantDocuments') || [];
  const mongoDocs = await DocumentMeta.find({ userId });
  report.unchangedCounts['userImportantDocuments (DocumentMeta)'] = 0;
  for (const d of docs) {
    report.summary.totalExamined++;
    const tName = (d.name || '').trim();
    const match = mongoDocs.find(m => m.name === tName);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['userImportantDocuments (DocumentMeta)']++;
      report.gridfsAnalysis.existingFilesSkipped.push({
        name: d.name,
        gridfsFileId: match.gridfsFileId,
        size: match.size,
      });
    } else {
      report.summary.newRecords++;
      report.summary.newGridFSFiles++;
      report.newItemsDetailed.push({ key: 'userImportantDocuments', collection: 'DocumentMeta', name: d.name });
      report.gridfsAnalysis.newFilesRequired.push({
        module: 'userImportantDocuments',
        name: d.name,
        fileType: d.fileType || 'Document PDF/File',
      });
    }
  }

  // 12. PROFILE LINKS (importantProfileLinks)
  const links = parseField(raw, 'importantProfileLinks') || [];
  const mongoLinks = await ProfileLink.find({ userId });
  report.unchangedCounts['importantProfileLinks (ProfileLink)'] = 0;
  for (const pl of links) {
    report.summary.totalExamined++;
    const tName = (pl.name || pl.title || '').trim();
    const match = mongoLinks.find(m => m.name === tName && m.link === pl.link);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['importantProfileLinks (ProfileLink)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({ key: 'importantProfileLinks', collection: 'ProfileLink', name: tName, link: pl.link });
    }
  }

  // 13. TASKS (applyTasks & ongoingTasks)
  const applyTasks = parseField(raw, 'applyTasks') || [];
  const mongoApply = await ApplyTask.find({ userId });
  report.unchangedCounts['applyTasks (ApplyTask)'] = 0;
  for (const at of applyTasks) {
    report.summary.totalExamined++;
    const tName = (at.name || at.title || '').trim();
    const match = mongoApply.find(m => m.name === tName);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['applyTasks (ApplyTask)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({ key: 'applyTasks', collection: 'ApplyTask', name: tName });
    }
  }

  const ongoingTasks = parseField(raw, 'ongoingTasks') || [];
  const mongoOngoing = await OngoingTask.find({ userId });
  report.unchangedCounts['ongoingTasks (OngoingTask)'] = 0;
  for (const ot of ongoingTasks) {
    report.summary.totalExamined++;
    const tName = (ot.name || ot.title || '').trim();
    const match = mongoOngoing.find(m => m.name === tName);
    if (match) {
      report.summary.alreadyExisting++;
      report.unchangedCounts['ongoingTasks (OngoingTask)']++;
    } else {
      report.summary.newRecords++;
      report.newItemsDetailed.push({ key: 'ongoingTasks', collection: 'OngoingTask', name: tName });
    }
  }

  // 14. Static singletons
  const healthConfig = parseField(raw, 'healthQueryConfig');
  const mongoHealthConfig = await RoutineConfig.findOne({ userId, routineType: 'health' });
  if (healthConfig && mongoHealthConfig) {
    report.unchangedCounts['healthQueryConfig (RoutineConfig:health)'] = 1;
    report.summary.totalExamined++;
    report.summary.alreadyExisting++;
  }

  const proConfig = parseField(raw, 'proRoutineQueryConfig');
  const mongoProConfig = await RoutineConfig.findOne({ userId, routineType: 'professional' });
  if (proConfig && mongoProConfig) {
    report.unchangedCounts['proRoutineQueryConfig (RoutineConfig:professional)'] = 1;
    report.summary.totalExamined++;
    report.summary.alreadyExisting++;
  }

  const diarySettings = parseField(raw, 'diarySettings');
  const mongoDiarySettings = await DiarySettings.findOne({ userId });
  if (diarySettings && mongoDiarySettings) {
    report.unchangedCounts['diarySettings (DiarySettings)'] = 1;
    report.summary.totalExamined++;
    report.summary.alreadyExisting++;
    if (mongoDiarySettings.bgImageFileId) {
      report.gridfsAnalysis.existingFilesSkipped.push({
        name: 'Diary Settings Default Background',
        gridfsFileId: mongoDiarySettings.bgImageFileId,
      });
    }
  }

  const outfitRules = parseField(raw, 'dayWiseOutfitRules');
  const mongoOutfit = await OutfitRule.findOne({ userId });
  if (outfitRules && mongoOutfit) {
    report.unchangedCounts['dayWiseOutfitRules (OutfitRule)'] = 1;
    report.summary.totalExamined++;
    report.summary.alreadyExisting++;
  }

  const wardrobe = parseField(raw, 'myWardrobeList');
  const mongoWardrobe = await Wardrobe.findOne({ userId });
  if (wardrobe && mongoWardrobe) {
    report.unchangedCounts['myWardrobeList (Wardrobe)'] = 1;
    report.summary.totalExamined++;
    report.summary.alreadyExisting++;
  }

  const reflectionQuestions = parseField(raw, 'reflectionQuestionsList');
  const mongoRefQ = await ReflectionQuestionList.findOne({ userId });
  if (reflectionQuestions && mongoRefQ) {
    report.unchangedCounts['reflectionQuestionsList (ReflectionQuestionList)'] = 1;
    report.summary.totalExamined++;
    report.summary.alreadyExisting++;
  }

  const lastVisit = parseField(raw, 'lastScheduleVisitDate');
  const mongoSchedMeta = await ScheduleMeta.findOne({ userId });
  if (lastVisit && mongoSchedMeta) {
    report.unchangedCounts['lastScheduleVisitDate (ScheduleMeta)'] = 1;
    report.summary.totalExamined++;
    report.summary.alreadyExisting++;
  }

  fs.writeFileSync(path.join(__dirname, '..', 'state', 'incremental-dryrun-report.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('=== INCREMENTAL DRY RUN RESULTS ===');
  console.log('Total Records Examined:', report.summary.totalExamined);
  console.log('Already Existing / Unchanged:', report.summary.alreadyExisting);
  console.log('New Records Found:', report.summary.newRecords);
  console.log('Modified Records Found:', report.summary.modifiedRecords);
  console.log('Duplicates:', report.summary.duplicates);
  console.log('Potential Conflicts:', report.summary.conflicts);
  console.log('Unmapped Keys:', report.summary.unmapped);
  console.log('New GridFS Files Required:', report.summary.newGridFSFiles);

  console.log('\n--- BREAKDOWN OF NEW RECORDS (' + report.newItemsDetailed.length + ') ---');
  const byKey = {};
  report.newItemsDetailed.forEach(item => {
    byKey[item.key] = (byKey[item.key] || 0) + 1;
  });
  console.log(JSON.stringify(byKey, null, 2));

  await disconnectDB();
}

run().catch(err => {
  console.error('Dry-run error:', err);
  process.exit(1);
});
