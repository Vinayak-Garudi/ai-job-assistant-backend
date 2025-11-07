const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for automatic cleanup of expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient active session queries
sessionSchema.index({ userId: 1, isActive: 1 });

// Static method to create a new session
sessionSchema.statics.createSession = async function (
  userId,
  token,
  expiresIn,
  ipAddress,
  userAgent
) {
  // Calculate expiration date
  const expiresAt = new Date();
  const expiryDays = parseInt(expiresIn.replace('d', '')) || 7;
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  // Create session
  const session = await this.create({
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return session;
};

// Static method to validate and get active session
sessionSchema.statics.validateSession = async function (token) {
  const session = await this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).populate('userId');

  return session;
};

// Static method to deactivate a session (logout)
sessionSchema.statics.deactivateSession = async function (token) {
  const session = await this.findOneAndUpdate(
    { token },
    { isActive: false },
    { new: true }
  );

  return session;
};

// Static method to deactivate all user sessions
sessionSchema.statics.deactivateAllUserSessions = async function (userId) {
  await this.updateMany({ userId, isActive: true }, { isActive: false });
};

// Static method to update last activity
sessionSchema.statics.updateActivity = async function (token) {
  await this.findOneAndUpdate({ token }, { lastActivityAt: new Date() });
};

// Static method to get user's active sessions
sessionSchema.statics.getUserActiveSessions = async function (userId) {
  return await this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivityAt: -1 });
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpiredSessions = async function () {
  const result = await this.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }],
  });

  return result;
};

module.exports = mongoose.model('Session', sessionSchema);
