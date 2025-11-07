const { verifyToken } = require('../config/jwt');
const User = require('../modules/auth/user.model');
const Session = require('../modules/auth/session.model');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied',
      });
    }

    // Verify JWT token
    const decoded = verifyToken(token);

    // Validate session in database
    const session = await Session.validateSession(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please login again.',
      });
    }

    // Get user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Attach user to request
    req.user = user;
    req.session = session;
    req.token = token;

    next();
  } catch (error) {
    if (error.message === 'Invalid or expired session') {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token is not valid',
    });
  }
};

module.exports = auth;
