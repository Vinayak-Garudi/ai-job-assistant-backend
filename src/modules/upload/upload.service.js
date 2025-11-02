const {
  deleteImage,
  deleteMultipleImages,
} = require('../../config/cloudinary');
const AppError = require('../../utils/AppError');

class UploadService {
  // Process single image upload
  async processSingleUpload(file) {
    try {
      return {
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        format: file.mimetype,
      };
    } catch (error) {
      throw new AppError(`Failed to process upload: ${error.message}`, 500);
    }
  }

  // Process multiple images upload
  async processMultipleUploads(files) {
    try {
      return files.map((file) => ({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        format: file.mimetype,
      }));
    } catch (error) {
      throw new AppError(`Failed to process uploads: ${error.message}`, 500);
    }
  }

  // Delete single image from Cloudinary
  async deleteImage(publicId) {
    try {
      const result = await deleteImage(publicId);

      if (result.result !== 'ok') {
        throw new AppError('Failed to delete image', 400);
      }

      return result;
    } catch (error) {
      throw new AppError(`Failed to delete image: ${error.message}`, 500);
    }
  }

  // Delete multiple images from Cloudinary
  async deleteMultipleImages(publicIds) {
    try {
      const result = await deleteMultipleImages(publicIds);
      return result;
    } catch (error) {
      throw new AppError(`Failed to delete images: ${error.message}`, 500);
    }
  }
}

module.exports = new UploadService();
