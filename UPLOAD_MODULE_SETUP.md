# Image Upload Module Setup - Complete

## ✅ What Was Implemented

The image upload module has been successfully created with Cloudinary integration for cloud-based image storage and optimization.

## 📦 Installed Packages

```bash
npm install cloudinary multer multer-storage-cloudinary sharp
```

- **cloudinary**: Cloud storage and image transformation service
- **multer**: Node.js middleware for handling multipart/form-data (file uploads)
- **multer-storage-cloudinary**: Cloudinary storage engine for Multer
- **sharp**: High-performance image processing (for future enhancements)

## 📁 Files Created/Modified

### New Files

1. **`src/config/cloudinary.js`**
   - Cloudinary configuration and initialization
   - Storage configurations for single and multiple uploads
   - Helper functions for deleting images

2. **`src/middleware/upload.js`**
   - Multer middleware configuration
   - File validation and filtering
   - Error handling for upload errors

3. **`src/modules/upload/upload.controller.js`**
   - Upload single image endpoint handler
   - Upload multiple images endpoint handler
   - Delete image(s) endpoint handlers

4. **`src/modules/upload/upload.service.js`**
   - Image processing logic
   - Integration with Cloudinary utilities
   - Business logic for uploads and deletions

5. **`src/modules/upload/upload.routes.js`**
   - Route definitions for upload endpoints
   - Authentication middleware integration
   - Multer middleware integration

6. **`src/modules/upload/route.config.js`**
   - Route configuration (path: `/api/upload`)

7. **`src/modules/upload/README.md`**
   - Complete API documentation
   - Frontend integration examples
   - Usage guide and constraints

### Modified Files

1. **`.env.local`**
   - Added Cloudinary environment variables

2. **`ENV_CONFIG.md`**
   - Updated with Cloudinary configuration documentation

## 🔌 API Endpoints

All endpoints are automatically registered at `/api/upload` and require JWT authentication.

### 1. Upload Single Image

- **POST** `/api/upload/single`
- **Form Data**: `image` (file), `folder` (optional)
- **Response**: Image URL, publicId, metadata

### 2. Upload Multiple Images

- **POST** `/api/upload/multiple`
- **Form Data**: `images` (files, max 10), `folder` (optional)
- **Response**: Array of image URLs and metadata

### 3. Delete Single Image

- **DELETE** `/api/upload/single`
- **Body**: `{ "publicId": "..." }`
- **Response**: Deletion confirmation

### 4. Delete Multiple Images

- **DELETE** `/api/upload/multiple`
- **Body**: `{ "publicIds": ["...", "..."] }`
- **Response**: Deletion confirmation

## ⚙️ Configuration Required

### Step 1: Get Cloudinary Credentials

1. Sign up or log in at https://cloudinary.com
2. Go to Dashboard/Console
3. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

### Step 2: Update Environment Variables

Edit `.env.local` (and other env files):

```env
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
```

### Step 3: Test the Setup

Start your server:

```bash
npm run dev
```

The upload routes will be automatically loaded at `/api/upload`.

## 🎨 Image Processing Features

- **Automatic Optimization**: Quality set to auto
- **Size Limit**: Max 1200x1200 pixels (maintains aspect ratio)
- **Format Conversion**: Auto-converts to WebP when supported
- **Compression**: Applied automatically
- **File Size Limit**: 5MB per file
- **Allowed Formats**: JPEG, PNG, GIF, WebP

## 🔒 Security Features

- JWT authentication required for all endpoints
- File type validation (images only)
- File size validation (5MB max)
- Maximum 10 files per upload
- Secure Cloudinary integration

## 💻 Frontend Integration Example

```typescript
// Upload single image
const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', 'equipment');

  const response = await fetch('/api/upload/single', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.data.url; // Cloudinary URL
};

// Upload multiple images
const uploadMultipleImages = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });
  formData.append('folder', 'equipment');

  const response = await fetch('/api/upload/multiple', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.data.map((img) => img.url);
};
```

## 🔗 Integration with Equipment Module

The equipment model is already configured to accept image URLs:

```javascript
images: {
  type: [String],
  default: [],
  validate: {
    validator: function (v) {
      return v.length <= 10;
    },
    message: 'Cannot upload more than 10 images',
  },
}
```

### Complete Flow:

1. **Upload Images**: Use `/api/upload/multiple` to upload product images
2. **Get URLs**: Extract URLs from the response
3. **Create Equipment**: Send equipment data with image URLs to `/api/equipment`

## 📝 Next Steps

1. **Configure Cloudinary**:
   - Update `.env.local` with your Cloudinary credentials
   - Optionally configure upload presets in Cloudinary dashboard

2. **Test the Endpoints**:
   - Use Postman or similar tool to test uploads
   - Test with actual image files
   - Verify images appear in your Cloudinary dashboard

3. **Customize as Needed**:
   - Adjust image transformation settings in `src/config/cloudinary.js`
   - Modify file size limits in `src/middleware/upload.js`
   - Add additional validation in controllers

4. **Deploy**:
   - Update `.env.production` with production Cloudinary credentials
   - Ensure environment variables are set on your hosting platform

## 📚 Documentation

- Full API documentation: `src/modules/upload/README.md`
- Configuration guide: `ENV_CONFIG.md`
- Cloudinary docs: https://cloudinary.com/documentation

## ✨ Features Summary

✅ Single image upload  
✅ Multiple images upload (up to 10)  
✅ Image optimization and transformation  
✅ Cloudinary cloud storage  
✅ Image deletion (single and multiple)  
✅ JWT authentication  
✅ File validation (type, size)  
✅ Error handling  
✅ Automatic route registration  
✅ Complete documentation

The upload module is now ready to use! Just configure your Cloudinary credentials and start uploading images.
