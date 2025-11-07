const User = require('./user.model');
const Session = require('./session.model');
const { generateToken } = require('../../config/jwt');
const env = require('../../config/env');

class AuthService {
  // Register a new user
  async register(userData, ipAddress, userAgent) {
    const { username, email, password } = userData;

    // Check if user already exists with username
    const existingUserByUsername = await User.findOne({
      'basicInfo.username': username,
    });
    if (existingUserByUsername) {
      throw new Error('User already exists with this username');
    }

    // Check if user already exists with email
    const existingUserByEmail = await User.findOne({
      'basicInfo.email': email,
    });
    if (existingUserByEmail) {
      throw new Error('User already exists with this email');
    }

    // Create user with default role 'user'
    const user = await User.create({
      basicInfo: {
        username,
        email,
      },
      password,
      role: 'user',
    });

    // Generate token
    const token = generateToken({ id: user._id });

    // Create session
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    await Session.createSession(
      user._id,
      token,
      expiresIn,
      ipAddress,
      userAgent
    );

    return {
      user,
      token,
    };
  }

  // Login user
  async login(email, password, ipAddress, userAgent) {
    // Check if user exists and get password
    const user = await User.findOne({ 'basicInfo.email': email }).select(
      '+password'
    );
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({ id: user._id });

    // Create session
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    await Session.createSession(
      user._id,
      token,
      expiresIn,
      ipAddress,
      userAgent
    );

    return {
      user,
      token,
    };
  }

  // Logout user
  async logout(token) {
    // Deactivate session
    const session = await Session.deactivateSession(token);
    if (!session) {
      throw new Error('Session not found');
    }

    return { message: 'Logged out successfully' };
  }

  // Logout from all devices
  async logoutAll(userId) {
    await Session.deactivateAllUserSessions(userId);
    return { message: 'Logged out from all devices successfully' };
  }

  // Get active sessions
  async getActiveSessions(userId) {
    const sessions = await Session.getUserActiveSessions(userId);
    return sessions;
  }

  // Validate session
  async validateSession(token) {
    const session = await Session.validateSession(token);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Update last activity
    await Session.updateActivity(token);

    return session;
  }

  // Get user ID from token
  async getUserIdFromToken(token) {
    const session = await Session.findOne({ token, isActive: true });
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    return session.userId;
  }

  // Get user profile by token
  async getProfileByToken(token) {
    const userId = await this.getUserIdFromToken(token);
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Get user profile by userId (legacy support)
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Update user profile by token
  async updateProfileByToken(token, updateData) {
    const userId = await this.getUserIdFromToken(token);
    return this.updateProfile(userId, updateData);
  }

  // Update user profile by userId
  async updateProfile(userId, updateData) {
    const allowedFields = [
      'basicInfo',
      'professionalInfo',
      'otherInfo',
      'education',
      'documents',
      'jobPreferences',
    ];
    const filteredData = {};

    // Filter allowed fields
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Check if email is being updated and if it already exists
    if (filteredData.basicInfo && filteredData.basicInfo.email) {
      const existingUser = await User.findOne({
        'basicInfo.email': filteredData.basicInfo.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new Error('Email already in use by another user');
      }
    }

    // Check if username is being updated and if it already exists
    if (filteredData.basicInfo && filteredData.basicInfo.username) {
      const existingUser = await User.findOne({
        'basicInfo.username': filteredData.basicInfo.username,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new Error('Username already in use by another user');
      }
    }

    const user = await User.findByIdAndUpdate(userId, filteredData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Change password by token
  async changePasswordByToken(token, currentPassword, newPassword) {
    const userId = await this.getUserIdFromToken(token);
    return this.changePassword(userId, currentPassword, newPassword);
  }

  // Change password by userId
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Check current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  // Logout from all devices by token
  async logoutAllByToken(token) {
    const userId = await this.getUserIdFromToken(token);
    return this.logoutAll(userId);
  }

  // Get active sessions by token
  async getActiveSessionsByToken(token) {
    const userId = await this.getUserIdFromToken(token);
    return this.getActiveSessions(userId);
  }
}

module.exports = new AuthService();
