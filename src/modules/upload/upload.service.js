const {
  deleteFile,
  deleteMultipleFiles,
  generatePresignedUrl,
} = require('../../config/s3');
const AppError = require('../../utils/AppError');
const Upload = require('./upload.model');

class UploadService {
  // Process single file upload
  async processSingleUpload(file, userId) {
    try {
      // Extract file extension
      const fileExtension = file.originalname.split('.').pop().toLowerCase();

      // Prepare upload metadata
      const uploadData = {
        url: file.location, // S3 URL
        publicId: file.key, // S3 key (path in bucket)
        originalName: file.originalname,
        fileName: file.key.split('/').pop(), // Extract filename from key
        fileType: fileExtension,
        mimeType: file.mimetype,
        size: file.size,
        folder: file.key.split('/')[0] || 'uploads',
        uploadedBy: userId,
      };

      // Save to MongoDB
      const upload = await Upload.create(uploadData);

      // Generate presigned URL for secure access (valid for 1 hour)
      const presignedUrl = await generatePresignedUrl(file.key, 3600);

      return {
        id: upload._id,
        url: upload.url, // Public S3 URL
        secureUrl: presignedUrl, // Presigned URL for secure access
        publicId: upload.publicId,
        originalName: upload.originalName,
        fileName: upload.fileName,
        fileType: upload.fileType,
        mimeType: upload.mimeType,
        size: upload.size,
        folder: upload.folder,
        uploadedAt: upload.createdAt,
      };
    } catch (error) {
      throw new AppError(`Failed to process upload: ${error.message}`, 500);
    }
  }

  // Process multiple file uploads
  async processMultipleUploads(files, userId) {
    try {
      // Prepare all upload metadata
      const uploadsData = files.map((file) => {
        const fileExtension = file.originalname.split('.').pop().toLowerCase();

        return {
          url: file.location, // S3 URL
          publicId: file.key, // S3 key
          originalName: file.originalname,
          fileName: file.key.split('/').pop(),
          fileType: fileExtension,
          mimeType: file.mimetype,
          size: file.size,
          folder: file.key.split('/')[0] || 'uploads',
          uploadedBy: userId,
        };
      });

      // Save all uploads to MongoDB
      const uploads = await Upload.insertMany(uploadsData);

      // Generate presigned URLs for all uploads
      const uploadsWithUrls = await Promise.all(
        uploads.map(async (upload) => {
          const presignedUrl = await generatePresignedUrl(
            upload.publicId,
            3600
          );
          return {
            id: upload._id,
            url: upload.url,
            secureUrl: presignedUrl,
            publicId: upload.publicId,
            originalName: upload.originalName,
            fileName: upload.fileName,
            fileType: upload.fileType,
            mimeType: upload.mimeType,
            size: upload.size,
            folder: upload.folder,
            uploadedAt: upload.createdAt,
          };
        })
      );

      return uploadsWithUrls;
    } catch (error) {
      throw new AppError(`Failed to process uploads: ${error.message}`, 500);
    }
  }

  // Delete single file from S3 and MongoDB
  async deleteResume(publicId, userId) {
    try {
      // Delete from S3
      const result = await deleteFile(publicId);

      if (!result.success) {
        throw new AppError('Failed to delete file from storage', 400);
      }

      // Delete from MongoDB
      const deletedUpload = await Upload.findOneAndDelete({
        publicId,
        uploadedBy: userId, // Ensure user can only delete their own uploads
      });

      if (!deletedUpload) {
        throw new AppError('Upload record not found or unauthorized', 404);
      }

      return {
        storage: result,
        database: {
          id: deletedUpload._id,
          publicId: deletedUpload.publicId,
          originalName: deletedUpload.originalName,
        },
      };
    } catch (error) {
      throw new AppError(`Failed to delete file: ${error.message}`, 500);
    }
  }

  // Delete multiple files from S3 and MongoDB
  async deleteMultipleResumes(publicIds, userId) {
    try {
      // Delete from S3
      const s3Result = await deleteMultipleFiles(publicIds);

      // Delete from MongoDB
      const dbResult = await Upload.deleteMany({
        publicId: { $in: publicIds },
        uploadedBy: userId, // Ensure user can only delete their own uploads
      });

      return {
        storage: s3Result,
        database: {
          deletedCount: dbResult.deletedCount,
        },
      };
    } catch (error) {
      throw new AppError(`Failed to delete files: ${error.message}`, 500);
    }
  }

  // Get user's uploads
  async getUserUploads(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        fileType,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const query = { uploadedBy: userId };

      if (fileType) {
        query.fileType = fileType;
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [uploads, total] = await Promise.all([
        Upload.find(query).sort(sort).skip(skip).limit(limit),
        Upload.countDocuments(query),
      ]);

      // Generate presigned URLs for all uploads
      const uploadsWithUrls = await Promise.all(
        uploads.map(async (upload) => {
          const presignedUrl = await generatePresignedUrl(
            upload.publicId,
            3600
          );
          return {
            id: upload._id,
            url: upload.url,
            secureUrl: presignedUrl,
            publicId: upload.publicId,
            originalName: upload.originalName,
            fileName: upload.fileName,
            fileType: upload.fileType,
            mimeType: upload.mimeType,
            size: upload.size,
            folder: upload.folder,
            uploadedAt: upload.createdAt,
          };
        })
      );

      return {
        uploads: uploadsWithUrls,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(`Failed to fetch uploads: ${error.message}`, 500);
    }
  }

  // Get single upload by ID
  async getUploadById(uploadId, userId) {
    try {
      const upload = await Upload.findOne({
        _id: uploadId,
        uploadedBy: userId,
      });

      if (!upload) {
        throw new AppError('Upload not found', 404);
      }

      // Generate fresh presigned URL
      const presignedUrl = await generatePresignedUrl(upload.publicId, 3600);

      return {
        id: upload._id,
        url: upload.url,
        secureUrl: presignedUrl,
        publicId: upload.publicId,
        originalName: upload.originalName,
        fileName: upload.fileName,
        fileType: upload.fileType,
        mimeType: upload.mimeType,
        size: upload.size,
        folder: upload.folder,
        uploadedAt: upload.createdAt,
        updatedAt: upload.updatedAt,
      };
    } catch (error) {
      throw new AppError(`Failed to fetch upload: ${error.message}`, 500);
    }
  }
}

module.exports = new UploadService();
