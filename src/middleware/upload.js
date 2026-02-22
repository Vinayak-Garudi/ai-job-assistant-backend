const multer = require('multer');
const { singleFileStorage, multipleFilesStorage } = require('../config/s3');
const AppError = require('../utils/AppError');

// File filter to validate various file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC (legacy)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.ms-excel', // XLS
    'text/plain', // TXT
    'text/csv', // CSV

    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',

    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime', // MOV
    'video/x-msvideo', // AVI
    'video/webm',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Allowed types: PDF, DOCX, DOC, images (JPEG, PNG, GIF, WebP, SVG), videos (MP4, MOV, AVI, WebM), spreadsheets, and text files',
        400
      ),
      false
    );
  }
};

// Multer configuration for single file upload
const uploadSingle = multer({
  storage: singleFileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for files (increased for videos)
  },
});

// Multer configuration for multiple file uploads
const uploadMultiple = multer({
  storage: multipleFilesStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 10, // Maximum 10 files
  },
});

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError('File size too large. Maximum size is 50MB', 400)
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 10 files', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected field in form data', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleMulterError,
};
