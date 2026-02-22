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
  uploadSingle.single('file'),
  handleMulterError,
  uploadController.uploadSingle
);

router.post(
  '/multiple',
  uploadMultiple.array('files', 10),
  handleMulterError,
  uploadController.uploadMultiple
);

// Get routes
router.get('/', uploadController.getUserUploads);
router.get('/:id', uploadController.getUploadById);

// Delete routes
router.delete('/single', uploadController.deleteResume);
router.delete('/multiple', uploadController.deleteMultipleResumes);

module.exports = router;
