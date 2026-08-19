'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Duplicate protection (requirement #7): a local, on-disk ledger of
 * "source record fingerprint -> already imported" - NOT a new MongoDB
 * collection. This is deliberately a file, not a database collection: it
 * is bookkeeping for the migration TOOL itself, not application data, so
 * it does not touch the app's schema at all (consistent with "do not
 * create duplicate collections" applying to business data, not one-off
 * tooling state).
 *
 * A record's fingerprint is a SHA-256 hash of {targetUserId, model,
 * sourceKey, sourceIndexOrId, meaningful-fields}. Re-running the importer
 * (even with --dry-run off, even twice) will skip any record whose
 * fingerprint is already in the ledger, so a second import of the same
 * backup file creates zero duplicate records.
 */

const STATE_DIR = path.join(__dirname, '..', 'state');
const LEDGER_PATH = path.join(STATE_DIR, 'imported-hashes.json');

function loadLedger() {
  try {
    const raw = fs.readFileSync(LEDGER_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { entries: {} }; // fresh ledger - first run
  }
}

function saveLedger(ledger) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

function fingerprint(model, sourceKey, discriminator, payload) {
  const hash = crypto.createHash('sha256');
  hash.update(model + '::' + sourceKey + '::' + discriminator + '::' + JSON.stringify(payload));
  return hash.digest('hex');
}

/**
 * Returns true if this exact source record has already been imported
 * (by a previous run), false otherwise. Does NOT mutate the ledger -
 * call markImported() after a successful write.
 */
function isAlreadyImported(ledger, fp) {
  return Boolean(ledger.entries[fp]);
}

function markImported(ledger, fp, meta) {
  ledger.entries[fp] = { importedAt: new Date().toISOString(), ...meta };
}

module.exports = { loadLedger, saveLedger, fingerprint, isAlreadyImported, markImported, LEDGER_PATH };
