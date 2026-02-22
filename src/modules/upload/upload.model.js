const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Public ID is required'],
      unique: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
    },
    fileName: {
      type: String,
      required: [true, 'Filename is required'],
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      lowercase: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    folder: {
      type: String,
      default: 'uploads',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
uploadSchema.index({ uploadedBy: 1, createdAt: -1 });
uploadSchema.index({ publicId: 1 });

const Upload = mongoose.model('Upload', uploadSchema);

module.exports = Upload;
