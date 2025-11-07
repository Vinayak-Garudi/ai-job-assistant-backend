const authService = require('./auth.service');

class AuthController {
  // Register user
  async register(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await authService.register(req.body, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await authService.login(
        email,
        password,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout user
  async logout(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const result = await authService.logout(token);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout from all devices
  async logoutAll(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const result = await authService.logoutAllByToken(token);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get active sessions
  async getActiveSessions(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const sessions = await authService.getActiveSessionsByToken(token);

      res.status(200).json({
        success: true,
        message: 'Active sessions retrieved successfully',
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user profile
  async getProfile(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const user = await authService.getProfileByToken(token);

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const user = await authService.updateProfileByToken(token, req.body);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePasswordByToken(
        token,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
