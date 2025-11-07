const User = require('./user.model');
const { generateToken } = require('../../config/jwt');

class AuthService {
  // Register a new user
  async register(userData) {
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

    return {
      user,
      token,
    };
  }

  // Login user
  async login(email, password) {
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

    return {
      user,
      token,
    };
  }

  // Get user profile
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Update user profile
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

  // Change password
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
}

module.exports = new AuthService();
