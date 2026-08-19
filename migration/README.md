# TOMT Migration Tooling — LocalStorage → MongoDB/GridFS

Migrates data from the original HTML/localStorage TOMT application into the
now-complete `tomp-backend` MongoDB database. This folder is **completely
separate** from `tomp-backend/` and `tomp-frontend/` — it reuses their real
models and the real GridFS utility directly (see "How it works" below), but
adds no new business-facing code to either app.

**This tooling has not been run against real data.** It is prepared and
verified (see Section "What was verified"), but no import has been
performed.

## How it works (no duplicated infrastructure)

- `import-tool/import.js` and `import-tool/verify.js` `require()` the
  Mongoose models straight from `../tomp-backend/src/models/*.js` — the
  exact same schemas the running app uses. No second copy of any schema.
- File uploads go through `../tomp-backend/src/utils/gridfs.js`'s
  `uploadBuffer()` — the exact same GridFS buckets (`documents`, `media`)
  the running app already reads from.
- The database connection uses `../tomp-backend/src/config/db.js`'s
  `connectDB()` — same connection logic, same `MONGO_URI`.

## Step 1 — Export your old localStorage data

1. Open `export-tool/export.html` directly in the **same browser
   profile/origin** where your old TOMT app (`schedule.html`,
   `coding-profiles.html`, etc.) has accumulated data. (localStorage is
   scoped per-origin, so this only sees data if opened from the same
   origin the old app ran on.)
2. Click **"⬇️ Export LocalStorage to JSON"**.
3. Your browser downloads `tomt-localstorage-backup.json`.

This tool is **read-only** — it never calls `localStorage.setItem()`,
`removeItem()`, or `clear()`. It only reads and downloads.

## Step 2 — Place the file

Move the downloaded file into this `migration/` folder:
```
migration/tomt-localstorage-backup.json
```
(Or pass a custom path with `--file=` on every command below.)

## Step 3 — Configure

```bash
cd migration
npm install
cp .env.example .env
```
Edit `.env`:
- `MONGO_URI` — same Atlas connection string as `tomp-backend/.env`.
- `MIGRATION_TARGET_USERNAME` — your existing TOMT account's username.
  You must have already run `tomp-backend`'s `/api/auth/setup` at least
  once; the importer looks this user up and never creates or modifies
  `User` documents itself.

## Step 4 — Dry run (default — makes zero writes)

```bash
npm run import:dry-run
# equivalent to: node import-tool/import.js --file=./tomt-localstorage-backup.json
```

This is the **default mode** — the importer only writes to MongoDB/GridFS
if you explicitly pass `--commit`. The dry run:
- Parses and validates the export file's structure.
- Runs every transformation (date parsing, enum validation, GridFS
  Base64 decoding size checks) without uploading or inserting anything.
- Reports, per localStorage key: how many records were found, how many
  would be created, how many would be skipped as already-imported
  duplicates, and any that would fail validation.
- Reports any localStorage keys present in your export that
  `import-tool/mappingTable.js` doesn't recognize at all.
- Writes the full report to `state/last-dry-run-report.json`.

**Review this output carefully before running the real import.**

## Step 5 — Real import

```bash
node import-tool/import.js --file=./tomt-localstorage-backup.json --commit
```

Same logic as the dry run, but now actually writes to MongoDB and uploads
files to GridFS. Safe to re-run (see "Duplicate protection" below) — for
example if it's interrupted partway through, or if you add more data to
the old app and re-export.

## Step 6 — Verify

```bash
npm run verify
# equivalent to: node import-tool/verify.js --file=./tomt-localstorage-backup.json
```

Read-only. Compares expected counts (from the export file) against actual
counts in MongoDB for every mapped collection, and cross-checks Document
metadata (name, filename, byte size — **not** by re-encoding and
comparing Base64, which would be slow and pointless once the data is
already binary in GridFS). Prints a mismatch count and details for any
key that doesn't match.

## How Documents are handled (GridFS, no Base64 in MongoDB)

For `userImportantDocuments`: each record's `dataUrl` (a
`data:<mime>;base64,<...>` string) is decoded into a raw `Buffer`,
streamed into the **existing** `documents` GridFS bucket via
`uploadBuffer()`, and only the resulting `gridfsFileId` + metadata (name,
type, size, fileName, mimeType) is written to the `DocumentMeta`
collection. The Base64 string itself is never written to MongoDB.

The same decode-and-upload approach (into the `media` bucket instead) is
used for: Coding Profile logos, Important Note images, and all three
Diary Settings images (background/front cover/back cover) — each
diary entry's own background-image snapshot is uploaded as its **own**
independent GridFS file (not a shared reference to the settings image),
matching the "frozen per-entry snapshot" behavior already built into the
live app's `DiaryEntry` model.

## Duplicate protection

`import-tool/dedup.js` maintains a local ledger file,
`state/imported-hashes.json` — **not** a MongoDB collection, since this
is bookkeeping for the migration tool itself, not application data. Every
source record gets a SHA-256 fingerprint (model + source key + a
discriminator + its meaningful fields). Before creating anything, the
importer checks whether that fingerprint is already in the ledger; if so,
it's skipped and reported as a duplicate rather than re-inserted.

This applies uniformly, including the single-document-per-user settings
records (`DiarySettings`, `Wardrobe`, `OutfitRule`, etc.) and — critically
— GridFS-file-bearing records: `DiarySettings`'s three images are only
uploaded to GridFS once; a second run with the same export file detects
the existing fingerprint and skips the upload entirely, rather than
leaking a new orphaned GridFS file on every run.

**Running the import twice with the same backup file produces zero
duplicate MongoDB records and zero duplicate GridFS files.**

## What happens to unmapped keys

`import-tool/mappingTable.js` is the single source of truth for every
localStorage key's fate — see that file for the full table with reasons.
Every key is one of:
- **MAPPED** — imported into a specific existing model/collection.
- **INTENTIONALLY_IGNORED** — a deliberate, documented exclusion (auth
  credentials, transient UI-handoff variables, the dashboard's
  `motivateTag` widget which the live app itself still reads from
  localStorage, and the three explicitly out-of-scope legacy prototype
  files' keys).
- **UNMAPPED** — none currently; if a future localStorage key genuinely
  has no home, the importer logs it as a warning (both in the console
  output and the JSON report) rather than silently dropping it.

## Safety guarantees

- The export tool never modifies or clears localStorage.
- The importer defaults to dry-run; real writes require `--commit`.
- The importer never creates or modifies `User` documents — it only looks
  up the existing account by username.
- Nothing here modifies any file in `tomp-backend/` or `tomp-frontend/`.
- Re-running the import is idempotent (see "Duplicate protection").
