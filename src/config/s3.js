const AWS = require('aws-sdk');
const {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multerS3 = require('multer-s3');

// Validate required environment variables
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME',
];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    `❌ Missing required AWS environment variables: ${missingVars.join(', ')}`
  );
  console.error(
    'Please check your .env file and ensure all AWS credentials are set.'
  );
}

// Configure AWS SDK v2 for multer-s3 compatibility
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3V2 = new AWS.S3();

// Configure AWS SDK v3 for modern operations
const s3ClientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Only add credentials if they are defined
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3ClientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3ClientConfig);

const bucketName = process.env.AWS_S3_BUCKET_NAME;

// Storage configuration for single file upload
const singleFileStorage = multerS3({
  s3: s3Client,
  bucket: bucketName,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: (req, file, cb) => {
    cb(null, {
      fieldName: file.fieldname,
      originalName: file.originalname,
      uploadedBy: req.user?.id || 'unknown',
    });
  },
  key: (req, file, cb) => {
    // Generate a unique filename with extension
    const folder = req.body.folder || 'uploads';
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const originalName = file.originalname
      .split('.')[0]
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove special characters

    const fileName = `${folder}/${originalName}_${timestamp}.${fileExtension}`;
    cb(null, fileName);
  },
});

// Storage configuration for multiple files upload
const multipleFilesStorage = multerS3({
  s3: s3Client,
  bucket: bucketName,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: (req, file, cb) => {
    cb(null, {
      fieldName: file.fieldname,
      originalName: file.originalname,
      uploadedBy: req.user?.id || 'unknown',
    });
  },
  key: (req, file, cb) => {
    // Generate a unique filename with extension
    const folder = req.body.folder || 'uploads';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const originalName = file.originalname
      .split('.')[0]
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove special characters

    const fileName = `${folder}/${originalName}_${timestamp}_${random}.${fileExtension}`;
    cb(null, fileName);
  },
});

// Delete single file from S3
const deleteFile = async (fileKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const result = await s3Client.send(command);
    return { success: true, result };
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

// Delete multiple files from S3
const deleteMultipleFiles = async (fileKeys) => {
  try {
    const objects = fileKeys.map((key) => ({ Key: key }));

    const command = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objects,
        Quiet: false,
      },
    });

    const result = await s3Client.send(command);
    return {
      success: true,
      deleted: result.Deleted || [],
      errors: result.Errors || [],
    };
  } catch (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
};

// Generate a pre-signed URL for secure file access
const generatePresignedUrl = async (fileKey, expiresIn = 3600) => {
  try {
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    if (!fileKey) {
      throw new Error('File key is required');
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', {
      fileKey,
      bucketName,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

// Generate a public URL (for publicly accessible files)
const generatePublicUrl = (fileKey) => {
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;
};

// Get file metadata
const getFileMetadata = async (fileKey) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileKey,
    };

    const data = await s3V2.headObject(params).promise();
    return {
      size: data.ContentLength,
      contentType: data.ContentType,
      lastModified: data.LastModified,
      metadata: data.Metadata,
    };
  } catch (error) {
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

module.exports = {
  s3V2,
  s3Client,
  singleFileStorage,
  multipleFilesStorage,
  deleteFile,
  deleteMultipleFiles,
  generatePresignedUrl,
  generatePublicUrl,
  getFileMetadata,
  bucketName,
};
