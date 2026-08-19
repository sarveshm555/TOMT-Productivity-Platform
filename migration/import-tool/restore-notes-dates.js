'use strict';

/**
 * Targeted in-place date restoration script for Inspiration & Important Note records.
 * Restores original historical `date` string and `createdAt` timestamp from
 * `migration/backup/tomt-localstorage-backup.json` for user `sarvesh`.
 *
 * Safety guarantees:
 * - Does NOT recreate or re-import notes.
 * - Does NOT delete any documents.
 * - Does NOT touch any other collection.
 * - Saves a pre-update snapshot of current Note documents before applying updates.
 * - Performs in-place updates matching each document by `_id` and `userId`.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, '..', '..', 'tomp-backend', 'src');
const { connectDB, disconnectDB } = require(path.join(BACKEND_SRC, 'config', 'db.js'));
const User = require(path.join(BACKEND_SRC, 'models', 'User.js'));
const Note = require(path.join(BACKEND_SRC, 'models', 'Note.js'));

function parseDDMMYYYY(str) {
  if (typeof str !== 'string') return new Date();
  const parts = str.split('/').map(Number);
  if (parts.length === 3) {
    return new Date(Date.UTC(parts[2], parts[1] - 1, parts[0], 12, 0, 0));
  }
  return new Date();
}

async function run() {
  await connectDB();

  const targetUsername = process.env.MIGRATION_TARGET_USERNAME || 'sarvesh';
  const user = await User.findOne({ username: targetUsername });
  if (!user) {
    throw new Error('Target user "' + targetUsername + '" not found in MongoDB.');
  }

  console.log('Target User:', user.username, '(' + user._id + ')');

  // 1. Read existing MongoDB Note documents for sarvesh
  const currentNotes = await Note.find({ userId: user._id });
  console.log('Found', currentNotes.length, 'existing Note documents in MongoDB for user', user.username);

  // 2. Save pre-update backup snapshot
  const stateDir = path.join(__dirname, '..', 'state');
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
  const backupSnapshotPath = path.join(stateDir, 'pre-datefix-notes-backup.json');
  fs.writeFileSync(backupSnapshotPath, JSON.stringify(currentNotes, null, 2), 'utf8');
  console.log('✔ Pre-update snapshot saved to:', backupSnapshotPath);

  // 3. Load source backup
  const sourcePath = path.join(__dirname, '..', 'backup', 'tomt-localstorage-backup.json');
  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  let sourceNotes = raw.inspirationNoteLog || (raw.static && raw.static.inspirationNoteLog) || [];
  if (typeof sourceNotes === 'string') sourceNotes = JSON.parse(sourceNotes);

  console.log('Source backup notes:', sourceNotes.length);

  let updatedCount = 0;
  let failedCount = 0;
  const beforeAfterLog = [];

  for (let i = 0; i < sourceNotes.length; i++) {
    const b = sourceNotes[i];
    const bTrimmedName = (b.name || '').trim();

    // Match document by trimmed name and message
    const mDoc = currentNotes.find(
      (doc) => doc.name === bTrimmedName && doc.message === b.message
    ) || currentNotes.find((doc) => doc.name === bTrimmedName);

    if (!mDoc) {
      console.error('❌ Could not find matching MongoDB document for source note #' + (i + 1) + ':', b.name);
      failedCount++;
      continue;
    }

    let restoredCreatedAt = new Date();
    if (typeof b.id === 'number' && b.id > 1500000000000) {
      restoredCreatedAt = new Date(b.id);
    } else if (b.date) {
      restoredCreatedAt = parseDDMMYYYY(b.date);
    }

    const beforeState = {
      _id: mDoc._id.toString(),
      name: mDoc.name,
      beforeDate: mDoc.date || 'undefined',
      beforeCreatedAt: mDoc.createdAt.toISOString(),
    };

    // Apply in-place targeted update directly on collection to ensure createdAt is updated
    await Note.collection.updateOne(
      { _id: mDoc._id, userId: user._id },
      {
        $set: {
          date: b.date,
          createdAt: restoredCreatedAt,
        },
      }
    );

    const afterState = {
      _id: mDoc._id.toString(),
      name: mDoc.name,
      afterDate: b.date,
      afterCreatedAt: restoredCreatedAt.toISOString(),
      originalSourceId: b.id,
    };

    beforeAfterLog.push({ before: beforeState, after: afterState });
    updatedCount++;
  }

  console.log('\n================ UPDATE RESULTS ================');
  console.log('Successfully updated:', updatedCount);
  console.log('Failed updates:', failedCount);

  // 4. Post-update verification
  console.log('\n================ POST-UPDATE VERIFICATION ================');
  const postNotes = await Note.find({ userId: user._id }).sort({ createdAt: -1 });
  console.log('Total notes in MongoDB after update:', postNotes.length);

  let verifiedMatches = 0;
  for (const b of sourceNotes) {
    const bTrimmedName = (b.name || '').trim();
    const found = postNotes.find(
      (doc) => doc.name === bTrimmedName && doc.message === b.message && doc.date === b.date
    );
    if (found) {
      verifiedMatches++;
    } else {
      console.error('❌ Verification mismatch for note:', b.name);
    }
  }

  console.log('Verified exact date matches:', verifiedMatches + '/' + sourceNotes.length);

  // Print 10 samples
  console.log('\n--- 10 SAMPLE BEFORE / AFTER RESULTS ---');
  const sampleIndices = [0, 1, 2, 4, 6, 8, 9, 15, 34, 56];
  for (const idx of sampleIndices) {
    if (beforeAfterLog[idx]) {
      const entry = beforeAfterLog[idx];
      console.log('Note #' + (idx + 1) + ' "' + entry.after.name + '"');
      console.log('  BEFORE: date = ' + entry.before.beforeDate + ' | createdAt = ' + entry.before.beforeCreatedAt);
      console.log('  AFTER : date = ' + entry.after.afterDate + ' | createdAt = ' + entry.after.afterCreatedAt);
    }
  }

  await disconnectDB();
}

run().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
