const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage configuration for single resume upload
const singleImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => req.body.folder || 'resumes',
    resource_type: 'raw', // Use 'raw' for non-image files like PDFs and DOCX
    public_id: (req, file) => {
      // Generate a unique filename with extension
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      const originalName = file.originalname.split('.')[0].replace(/\s+/g, '_');
      return `${originalName}_${timestamp}.${fileExtension}`;
    },
  },
});

// Storage configuration for multiple resume uploads
const multipleImagesStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => req.body.folder || 'resumes',
    resource_type: 'raw', // Use 'raw' for non-image files like PDFs and DOCX
    public_id: (req, file) => {
      // Generate a unique filename with extension
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      const originalName = file.originalname.split('.')[0].replace(/\s+/g, '_');
      return `${originalName}_${timestamp}.${fileExtension}`;
    },
  },
});

// Delete document from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw', // Specify 'raw' for documents
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};

// Delete multiple documents from Cloudinary
const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: 'raw', // Specify 'raw' for documents
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to delete documents: ${error.message}`);
  }
};

// Generate a proper URL for a raw file with correct content-type
const generateSecureUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    secure: true,
    ...options,
  });
};

module.exports = {
  cloudinary,
  singleImageStorage,
  multipleImagesStorage,
  deleteImage,
  deleteMultipleImages,
  generateSecureUrl,
};
