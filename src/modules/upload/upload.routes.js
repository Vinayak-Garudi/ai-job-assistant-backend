const express = require('express');
const uploadController = require('./upload.controller');
const {
  uploadSingle,
  uploadMultiple,
  handleMulterError,
} = require('../../middleware/upload');
const auth = require('../../middleware/auth');

const router = express.Router();

// Protected routes - require authentication
router.use(auth);

// Upload routes
router.post(
  '/single',
  uploadSingle.single('image'),
  handleMulterError,
  uploadController.uploadSingle
);

router.post(
  '/multiple',
  uploadMultiple.array('images', 10),
  handleMulterError,
  uploadController.uploadMultiple
);

// Delete routes
router.delete('/single', uploadController.deleteImage);
router.delete('/multiple', uploadController.deleteMultipleImages);

module.exports = router;
