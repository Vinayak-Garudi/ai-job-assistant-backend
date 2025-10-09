const express = require('express');
const authController = require('./auth.controller');
const authValidation = require('./auth.validation');
const auth = require('../../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', authValidation.validateRegister, authController.register);
router.post('/login', authValidation.validateLogin, authController.login);

// Protected routes
router.use(auth); // Apply auth middleware to all routes below

router.get('/profile', authController.getProfile);
router.put('/profile', authValidation.validateUpdateProfile, authController.updateProfile);
router.put('/change-password', authValidation.validateChangePassword, authController.changePassword);

module.exports = router;