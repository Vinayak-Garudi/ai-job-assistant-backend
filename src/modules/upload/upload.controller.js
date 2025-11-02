const uploadService = require('./upload.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

class UploadController {
  // Upload single image
  uploadSingle = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Please upload an image', 400);
    }

    const result = await uploadService.processSingleUpload(req.file);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: result,
    });
  });

  // Upload multiple images
  uploadMultiple = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('Please upload at least one image', 400);
    }

    const results = await uploadService.processMultipleUploads(req.files);

    res.status(200).json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: results,
    });
  });

  // Delete single image
  deleteImage = asyncHandler(async (req, res) => {
    const { publicId } = req.body;

    if (!publicId) {
      throw new AppError('Public ID is required', 400);
    }

    const result = await uploadService.deleteImage(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: result,
    });
  });

  // Delete multiple images
  deleteMultipleImages = asyncHandler(async (req, res) => {
    const { publicIds } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      throw new AppError('Public IDs array is required', 400);
    }

    const result = await uploadService.deleteMultipleImages(publicIds);

    res.status(200).json({
      success: true,
      message: `${publicIds.length} images deleted successfully`,
      data: result,
    });
  });
}

module.exports = new UploadController();
