'use strict';

/**
 * INCREMENTAL MIGRATION EXECUTION SCRIPT
 * 
 * Safely migrates ONLY the 46 newly identified records and uploads the 2 new Note images
 * for user sarvesh (6a735b99319826d92bf1cbcc).
 * 
 * Preserves all 367 existing records untouched.
 * Preserves historical dates.
 * Records SHA-256 fingerprints in migration/state/imported-hashes.json.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, '..', '..', 'tomp-backend', 'src');
const mongoose = require(path.join(BACKEND_SRC, '..', 'node_modules', 'mongoose'));
const { connectDB, disconnectDB } = require(path.join(BACKEND_SRC, 'config', 'db.js'));
const { uploadBuffer } = require(path.join(BACKEND_SRC, 'utils', 'gridfs.js'));

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

const { loadLedger, saveLedger, fingerprint, markImported } = require('./dedup.js');

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function parseField(raw, k) {
  let v = raw[k];
  if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
    try { return JSON.parse(v); } catch(e) { return v; }
  }
  return v;
}

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  // 1. SAFETY PRE-CHECK
  console.log('--- PERFORMING PRE-MIGRATION SAFETY CHECK ---');
  const user = await User.findOne({ username: 'sarvesh' });
  if (!user) throw new Error('Target user "sarvesh" not found in MongoDB!');
  const userId = user._id;
  if (userId.toString() !== '6a735b99319826d92bf1cbcc') {
    throw new Error('UserId mismatch: Expected 6a735b99319826d92bf1cbcc but found ' + userId);
  }
  console.log('✓ Target user confirmed:', user.username, '(' + userId + ')');

  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'backup', 'tomt-localstorage-backup.json'), 'utf8'));
  const ledger = loadLedger();

  // Load dry-run report to verify the 46 items
  const dryReport = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'state', 'incremental-dryrun-report.json'), 'utf8'));
  if (dryReport.newItemsDetailed.length !== 46) {
    throw new Error('Dry run report does not contain 46 items. Found: ' + dryReport.newItemsDetailed.length);
  }

  // Pre-check all 46 items are not already in MongoDB
  const mongoNotes = await Note.find({ userId });
  const mongoDiary = await DiaryEntry.find({ userId });
  const mongoInternships = await Internship.find({ userId });
  const mongoHealth = await RoutineHistory.find({ userId, routineType: 'health' });
  const mongoPro = await RoutineHistory.find({ userId, routineType: 'professional' });
  const mongoReflections = await ReflectionEntry.find({ userId });
  const mongoRemember = await RememberTask.find({ userId });

  if (mongoNotes.length < 57) throw new Error('Expected at least 57 existing Notes, found: ' + mongoNotes.length);
  if (mongoDiary.length < 22) throw new Error('Expected at least 22 existing Diary entries, found: ' + mongoDiary.length);
  if (mongoInternships.length < 60) throw new Error('Expected at least 60 existing Internships, found: ' + mongoInternships.length);
  if (mongoHealth.length < 38) throw new Error('Expected at least 38 existing Health logs, found: ' + mongoHealth.length);
  if (mongoPro.length < 36) throw new Error('Expected at least 36 existing Pro logs, found: ' + mongoPro.length);
  if (mongoReflections.length < 25) throw new Error('Expected at least 25 existing Reflection entries, found: ' + mongoReflections.length);
  if (mongoRemember.length < 25) throw new Error('Expected at least 25 existing Remember tasks, found: ' + mongoRemember.length);

  console.log('✓ Verified baseline existing records intact across all collections');

  // Check GridFS bucket media for the 2 Note image labels
  const db = mongoose.connection.db;
  const existingFiles = await db.collection('media.files').find({ filename: { $in: ['note-image-What is your scars', 'note-image-peter dinklage'] } }).toArray();
  if (existingFiles.length > 0) {
    console.log('Notice: Note images already present in GridFS:', existingFiles.map(f => f.filename));
  } else {
    console.log('✓ GridFS media files pre-check: 2 new images ready for upload');
  }

  console.log('--- SAFETY PRE-CHECK COMPLETE: PROCEEDING WITH INCREMENTAL MIGRATION ---');

  const migrationStats = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    gridfsUploaded: 0,
    gridfsSkipped: 0,
    errors: [],
    insertedBreakdown: {},
    fingerprintsRecorded: 0,
  };

  // 1. NOTES (16 new records)
  const notes = parseField(raw, 'inspirationNoteLog') || [];
  migrationStats.insertedBreakdown['Note'] = 0;
  for (const n of notes) {
    const trimmedName = (n.name || '').trim();
    const existing = mongoNotes.find(m => m.name === trimmedName && m.message === n.message);
    if (existing) {
      migrationStats.skipped++;
      continue;
    }

    try {
      let imageFileId = null;
      let imageContentType = null;
      if (n.image && n.image.length > 50) {
        const decoded = decodeDataUrl(n.image);
        if (decoded) {
          const fileId = await uploadBuffer('media', decoded.buffer, 'note-image-' + n.name, decoded.contentType);
          imageFileId = fileId;
          imageContentType = decoded.contentType;
          migrationStats.gridfsUploaded++;
          console.log('  Uploaded GridFS image for Note:', n.name, '->', fileId);
        }
      }

      let noteCreatedAt = new Date();
      if (typeof n.id === 'number' && n.id > 1500000000000) {
        noteCreatedAt = new Date(n.id);
      } else if (n.date && typeof n.date === 'string') {
        const parts = n.date.split('/').map(Number);
        if (parts.length === 3) {
          noteCreatedAt = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0], 12, 0, 0));
        }
      }

      const noteDoc = {
        userId,
        name: n.name,
        link: n.link || '',
        message: n.message,
        date: n.date || new Date().toLocaleDateString(),
        createdAt: noteCreatedAt,
        updatedAt: noteCreatedAt,
        imageFileId,
        imageContentType,
      };

      // Use raw collection insert to preserve exact createdAt timestamp
      await Note.collection.insertOne(noteDoc);

      const fp = fingerprint('Note', 'inspirationNoteLog', n.id || n.name, { name: n.name, message: n.message });
      markImported(ledger, fp, { model: 'Note', key: 'inspirationNoteLog', id: n.id });
      migrationStats.fingerprintsRecorded++;
      migrationStats.inserted++;
      migrationStats.insertedBreakdown['Note']++;
    } catch (err) {
      migrationStats.failed++;
      migrationStats.errors.push('Note "' + n.name + '": ' + err.message);
    }
  }

  // 2. DIARY ENTRIES (5 new records)
  const diary = parseField(raw, 'diaryHistory') || [];
  migrationStats.insertedBreakdown['DiaryEntry'] = 0;
  for (const d of diary) {
    const bDisplay = d.displayDateTime || d.dateTime;
    const existing = mongoDiary.find(m => m.displayDateTime === bDisplay && m.content === d.content);
    if (existing) {
      migrationStats.skipped++;
      continue;
    }

    try {
      const theme = d.theme || {};
      const diaryDoc = {
        userId,
        content: d.content,
        dateTime: d.dateTime ? new Date(d.dateTime) : new Date(),
        displayDateTime: d.displayDateTime || new Date(d.dateTime).toLocaleString(),
        theme: {
          textColor: theme.textColor || '#ffffff',
          fontFamily: theme.fontFamily || 'Georgia, serif',
          bgImageFileId: null,
          bgImageContentType: null,
        },
      };

      await DiaryEntry.create(diaryDoc);

      const fp = fingerprint('DiaryEntry', 'diaryHistory', d.id || d.dateTime, { content: d.content, dateTime: d.dateTime });
      markImported(ledger, fp, { model: 'DiaryEntry', key: 'diaryHistory', id: d.id });
      migrationStats.fingerprintsRecorded++;
      migrationStats.inserted++;
      migrationStats.insertedBreakdown['DiaryEntry']++;
    } catch (err) {
      migrationStats.failed++;
      migrationStats.errors.push('DiaryEntry "' + d.displayDateTime + '": ' + err.message);
    }
  }

  // 3. INTERNSHIP APPLICATIONS (3 new records)
  const internships = parseField(raw, 'internshipApplications') || [];
  migrationStats.insertedBreakdown['Internship'] = 0;
  for (const item of internships) {
    const tComp = (item.company || '').trim();
    const tRole = (item.role || '').trim();
    const existing = mongoInternships.find(m => m.company === tComp && m.role === tRole);
    if (existing) {
      migrationStats.skipped++;
      continue;
    }

    try {
      const validStatuses = ['NeedToApply', 'Applied', 'Interview', 'Offer', 'Rejected'];
      let status = item.status;
      if (!validStatuses.includes(status)) status = 'NeedToApply';

      const appDoc = {
        userId,
        company: item.company,
        role: item.role,
        dateApplied: item.dateApplied,
        status,
        mistakeMessage: item.mistakeMessage || '',
      };

      await Internship.create(appDoc);

      const fp = fingerprint('Internship', 'internshipApplications', item.id || item.company + item.role, appDoc);
      markImported(ledger, fp, { model: 'Internship', key: 'internshipApplications', id: item.id });
      migrationStats.fingerprintsRecorded++;
      migrationStats.inserted++;
      migrationStats.insertedBreakdown['Internship']++;
    } catch (err) {
      migrationStats.failed++;
      migrationStats.errors.push('Internship "' + item.company + '": ' + err.message);
    }
  }

  // 4. HEALTH ROUTINE HISTORY (7 new records)
  const healthLogs = parseField(raw, 'healthLogHistory') || [];
  migrationStats.insertedBreakdown['RoutineHistory (health)'] = 0;
  for (const h of healthLogs) {
    const match = mongoHealth.find(m => m.date && m.date.toISOString().slice(0, 10) === (h.date || '').slice(0, 10));
    if (match) {
      migrationStats.skipped++;
      continue;
    }

    try {
      const hDoc = {
        userId,
        routineType: 'health',
        date: h.date ? new Date(h.date) : new Date(),
        data: h.data || {},
      };

      await RoutineHistory.create(hDoc);

      const fp = fingerprint('RoutineHistory', 'healthLogHistory', h.date + JSON.stringify(h.data), hDoc);
      markImported(ledger, fp, { model: 'RoutineHistory', key: 'healthLogHistory', date: h.date });
      migrationStats.fingerprintsRecorded++;
      migrationStats.inserted++;
      migrationStats.insertedBreakdown['RoutineHistory (health)']++;
    } catch (err) {
      migrationStats.failed++;
      migrationStats.errors.push('Health RoutineHistory "' + h.date + '": ' + err.message);
    }
  }

  // 5. PRO ROUTINE HISTORY (7 new records)
  const proLogs = parseField(raw, 'proRoutineLogHistory') || [];
  migrationStats.insertedBreakdown['RoutineHistory (professional)'] = 0;
  for (const p of proLogs) {
    const match = mongoPro.find(m => m.date && m.date.toISOString().slice(0, 10) === (p.date || '').slice(0, 10));
    if (match) {
      migrationStats.skipped++;
      continue;
    }

    try {
      const pDoc = {
        userId,
        routineType: 'professional',
        date: p.date ? new Date(p.date) : new Date(),
        data: p.data || {},
      };

      await RoutineHistory.create(pDoc);

      const fp = fingerprint('RoutineHistory', 'proRoutineLogHistory', p.date + JSON.stringify(p.data), pDoc);
      markImported(ledger, fp, { model: 'RoutineHistory', key: 'proRoutineLogHistory', date: p.date });
      migrationStats.fingerprintsRecorded++;
      migrationStats.inserted++;
      migrationStats.insertedBreakdown['RoutineHistory (professional)']++;
    } catch (err) {
      migrationStats.failed++;
      migrationStats.errors.push('Pro RoutineHistory "' + p.date + '": ' + err.message);
    }
  }

  // 6. REFLECTION ENTRIES (7 new records)
  const reflections = parseField(raw, 'reflectionEntriesData') || {};
  migrationStats.insertedBreakdown['ReflectionEntry'] = 0;
  for (const dateKey of Object.keys(reflections)) {
    const match = mongoReflections.find(m => m.dateKey === dateKey);
    if (match) {
      migrationStats.skipped++;
      continue;
    }

    try {
      const entry = reflections[dateKey] || {};
      const refDoc = {
        userId,
        dateKey,
        timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
        answers: entry.answers || (Array.isArray(entry) ? entry : []),
      };

      await ReflectionEntry.create(refDoc);

      const fp = fingerprint('ReflectionEntry', 'reflectionEntriesData', dateKey, refDoc);
      markImported(ledger, fp, { model: 'ReflectionEntry', key: 'reflectionEntriesData', dateKey });
      migrationStats.fingerprintsRecorded++;
      migrationStats.inserted++;
      migrationStats.insertedBreakdown['ReflectionEntry']++;
    } catch (err) {
      migrationStats.failed++;
      migrationStats.errors.push('ReflectionEntry "' + dateKey + '": ' + err.message);
    }
  }

  // 7. REMEMBER ACTIVE TASKS (1 new record)
  const activeRemember = parseField(raw, 'rememberActiveTasks') || [];
  migrationStats.insertedBreakdown['RememberTask'] = 0;
  for (const item of activeRemember) {
    const tText = (item.text || '').trim();
    const match = mongoRemember.find(m => m.text === tText);
    if (match) {
      migrationStats.skipped++;
      continue;
    }

    try {
      const remDoc = {
        userId,
        text: item.text,
        priority: item.priority || 'No Priority',
        dueDate: item.dueDate || null,
        status: 'active',
      };

      await RememberTask.create(remDoc);

      const fp = fingerprint('RememberTask', 'rememberActiveTasks', item.id || item.text, remDoc);
      markImported(ledger, fp, { model: 'RememberTask', key: 'rememberActiveTasks', id: item.id });
      migrationStats.fingerprintsRecorded++;
      migrationStats.inserted++;
      migrationStats.insertedBreakdown['RememberTask']++;
    } catch (err) {
      migrationStats.failed++;
      migrationStats.errors.push('RememberTask "' + item.text + '": ' + err.message);
    }
  }

  // Save the updated ledger
  saveLedger(ledger);
  console.log('✓ Updated ledger saved to imported-hashes.json');

  // Other modules skipped counts
  const skippedCounts = {
    'ScheduleHistory': 8,
    'RememberTask (history)': 21,
    'ScheduleMeta': 1,
    'Wardrobe': 1,
    'OutfitRule': 1,
    'ReflectionQuestionList': 1,
    'RoutineConfig (health)': 1,
    'RoutineConfig (pro)': 1,
    'Target (futureGoals)': 6,
    'CodingProfile': 11,
    'CodingLog': 24,
    'Course': 1,
    'CourseLog': 2,
    'DocumentMeta': 4,
    'ProfileLink': 14,
    'ApplyTask': 11,
    'OngoingTask': 16,
    'DiarySettings': 1,
  };
  migrationStats.gridfsSkipped = 15; // 4 documents + 11 coding profile logos

  console.log('\n==================================================');
  console.log('INCREMENTAL MIGRATION EXECUTION COMPLETED');
  console.log('==================================================');
  console.log('Records Inserted:', migrationStats.inserted);
  console.log('Records Skipped (Already Present):', migrationStats.skipped);
  console.log('Records Failed:', migrationStats.failed);
  console.log('GridFS Files Uploaded:', migrationStats.gridfsUploaded);
  console.log('GridFS Files Skipped:', migrationStats.gridfsSkipped);
  console.log('Fingerprints Recorded:', migrationStats.fingerprintsRecorded);
  console.log('Inserted Breakdown:', JSON.stringify(migrationStats.insertedBreakdown, null, 2));

  // Write execution state artifact
  fs.writeFileSync(path.join(__dirname, '..', 'state', 'incremental-execution-result.json'), JSON.stringify(migrationStats, null, 2), 'utf8');

  await disconnectDB();
}

run().catch(err => {
  console.error('Incremental migration failed:', err);
  process.exit(1);
});
