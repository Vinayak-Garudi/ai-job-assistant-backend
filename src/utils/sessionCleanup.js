const Session = require('../modules/auth/session.model');

/**
 * Cleanup expired and inactive sessions
 * Runs periodically to keep the database clean
 */
const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.cleanupExpiredSessions();
    console.log(
      `🧹 Session cleanup: Removed ${result.deletedCount} expired/inactive sessions`
    );
  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error.message);
  }
};

/**
 * Start the session cleanup scheduler
 * Runs every hour by default
 */
const startSessionCleanup = (intervalMs = 60 * 60 * 1000) => {
  // Run immediately on start
  cleanupExpiredSessions();

  // Schedule periodic cleanup
  setInterval(cleanupExpiredSessions, intervalMs);

  console.log(
    `✅ Session cleanup scheduler started (runs every ${intervalMs / 1000 / 60} minutes)`
  );
};

module.exports = {
  cleanupExpiredSessions,
  startSessionCleanup,
};
