const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

// GridFS buckets are set up once, right after the Mongoose connection opens,
// and reused for the lifetime of the process. Two buckets are kept separate
// on purpose (see Phase 2 design, Section 2):
//   - "documents" -> user-uploaded documents (documents.html successor)
//   - "media"     -> wardrobe photos, diary covers, note images
let documentsBucket = null;
let mediaBucket = null;

/**
 * Opens the MongoDB connection via Mongoose and initializes the GridFS
 * buckets on top of the same underlying connection/database.
 * Must be awaited once, before the HTTP server starts accepting traffic.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      'MONGO_URI is not defined. Copy .env.example to .env and set a real connection string.'
    );
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  const nativeDb = mongoose.connection.db;
  documentsBucket = new GridFSBucket(nativeDb, { bucketName: 'documents' });
  mediaBucket = new GridFSBucket(nativeDb, { bucketName: 'media' });

  console.log(
    `[db] MongoDB connected -> host: ${mongoose.connection.host}, db: ${mongoose.connection.name}`
  );

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected.');
  });

  return mongoose.connection;
}

/**
 * Closes the MongoDB connection cleanly. Used during graceful shutdown.
 */
async function disconnectDB() {
  await mongoose.connection.close();
}

/**
 * Returns the GridFS bucket for user-uploaded documents.
 * Throws if called before connectDB() has resolved.
 */
function getDocumentsBucket() {
  if (!documentsBucket) {
    throw new Error(
      '[db] Documents GridFS bucket is not initialized yet. connectDB() must run first.'
    );
  }
  return documentsBucket;
}

/**
 * Returns the GridFS bucket for media (wardrobe photos, diary covers, note images).
 * Throws if called before connectDB() has resolved.
 */
function getMediaBucket() {
  if (!mediaBucket) {
    throw new Error(
      '[db] Media GridFS bucket is not initialized yet. connectDB() must run first.'
    );
  }
  return mediaBucket;
}

module.exports = {
  connectDB,
  disconnectDB,
  getDocumentsBucket,
  getMediaBucket,
};
