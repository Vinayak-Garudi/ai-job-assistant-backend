const uploadService = require('./upload.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

class UploadController {
  // Upload single file
  uploadSingle = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Please upload a file', 400);
    }

    const result = await uploadService.processSingleUpload(
      req.file,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: result,
    });
  });

  // Upload multiple files
  uploadMultiple = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('Please upload at least one file', 400);
    }

    const results = await uploadService.processMultipleUploads(
      req.files,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: `${results.length} files uploaded successfully`,
      data: results,
    });
  });

  // Delete single file
  deleteResume = asyncHandler(async (req, res) => {
    const { publicId } = req.body;

    if (!publicId) {
      throw new AppError('File key is required', 400);
    }

    const result = await uploadService.deleteResume(publicId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: result,
    });
  });

  // Delete multiple files
  deleteMultipleResumes = asyncHandler(async (req, res) => {
    const { publicIds } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      throw new AppError('File keys array is required', 400);
    }

    const result = await uploadService.deleteMultipleResumes(
      publicIds,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: `${publicIds.length} files deleted successfully`,
      data: result,
    });
  });

  // Get user's uploads
  getUserUploads = asyncHandler(async (req, res) => {
    const { page, limit, fileType, sortBy, sortOrder } = req.query;

    const result = await uploadService.getUserUploads(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      fileType,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Uploads retrieved successfully',
      data: result.uploads,
      pagination: result.pagination,
    });
  });

  // Get single upload by ID
  getUploadById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Upload ID is required', 400);
    }

    const result = await uploadService.getUploadById(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Upload retrieved successfully',
      data: result,
    });
  });
}

module.exports = new UploadController();
