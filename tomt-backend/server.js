require('dotenv').config();

const createApp = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');
const Note = require('./src/models/Note');

const PORT = process.env.PORT || 5000;

// Fail fast and loud if required secrets are missing, instead of letting
// the process boot successfully and then throw deep inside a request.
const REQUIRED_ENV_VARS = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

function assertRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `[server] Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in real values.'
    );
    process.exit(1);
  }
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    console.error('[server] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
    process.exit(1);
  }
}

async function migrateNotesToSpaceForYou() {
  try {
    const result = await Note.updateMany(
      { $or: [{ scope: { $exists: false } }, { scope: 'placement' }] },
      { $set: { scope: 'space_for_you' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[migration] Migrated ${result.modifiedCount} existing note(s) to Space for You.`);
    }
  } catch (err) {
    console.error('[migration] Note migration error:', err);
  }
}

async function start() {
  assertRequiredEnv();

  try {
    await connectDB();
    await migrateNotesToSpaceForYou();

    const app = createApp();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[server] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });

    const shutdown = (signal) => {
      console.log(`[server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('[server] HTTP server closed.');
        try {
          await disconnectDB();
          console.log('[server] MongoDB connection closed.');
        } catch (err) {
          console.error('[server] Error closing MongoDB connection:', err);
        } finally {
          process.exit(0);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      console.error('[server] Unhandled promise rejection:', reason);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

start();
