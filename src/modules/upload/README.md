# Upload Module

This module handles image uploads using Cloudinary for cloud storage.

## Features

- Single image upload
- Multiple images upload (up to 10 images)
- Image optimization and transformation
- Cloudinary integration
- Image deletion (single and multiple)
- Secure upload with authentication
- File validation (size, type)

## Configuration

### Environment Variables

Add these to your `.env` files:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Get your Cloudinary credentials from: https://cloudinary.com/console

## API Endpoints

All endpoints require authentication (JWT token in Authorization header).

### Upload Single Image

**POST** `/api/upload/single`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data
```

**Body (form-data):**

- `image`: File (required)
- `folder`: String (optional, default: "uploads")

**Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "equipment/abc123",
    "originalName": "racket.jpg",
    "size": 245678,
    "format": "image/jpeg"
  }
}
```

### Upload Multiple Images

**POST** `/api/upload/multiple`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data
```

**Body (form-data):**

- `images`: File[] (required, max 10 files)
- `folder`: String (optional, default: "uploads")

**Response:**

```json
{
  "success": true,
  "message": "3 images uploaded successfully",
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "equipment/abc123",
      "originalName": "image1.jpg",
      "size": 245678,
      "format": "image/jpeg"
    }
    // ... more images
  ]
}
```

### Delete Single Image

**DELETE** `/api/upload/single`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Body:**

```json
{
  "publicId": "equipment/abc123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": {
    "result": "ok"
  }
}
```

### Delete Multiple Images

**DELETE** `/api/upload/multiple`

**Headers:**

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Body:**

```json
{
  "publicIds": ["equipment/abc123", "equipment/def456"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "2 images deleted successfully",
  "data": {
    "deleted": {
      "equipment/abc123": "deleted",
      "equipment/def456": "deleted"
    }
  }
}
```

## Frontend Integration

### React/TypeScript Example

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

// Delete image
const deleteImage = async (publicId: string) => {
  const response = await fetch('/api/upload/single', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ publicId }),
  });

  return await response.json();
};
```

## Upload Constraints

- **File Types:** JPEG, PNG, GIF, WebP
- **Max File Size:** 5MB per file
- **Max Files:** 10 files per request (for multiple upload)
- **Image Transformation:** Automatic optimization
  - Max dimensions: 1200x1200 (maintains aspect ratio)
  - Quality: Auto
  - Format: Auto (WebP when supported)

## Error Handling

The module provides detailed error messages:

- `400`: Invalid file type, file too large, missing file
- `401`: Unauthorized (missing or invalid token)
- `500`: Server error during upload

## Image Optimization

Images are automatically optimized by Cloudinary:

- Resized to maximum 1200x1200 (maintains aspect ratio)
- Quality optimized for web
- Format conversion to WebP when supported by browser
- Compression applied

## Usage with Equipment Module

When creating equipment listings, upload images first and then use the returned URLs:

```typescript
// 1. Upload images
const imageFiles = [...]; // File[] from user input
const imageUrls = await uploadMultipleImages(imageFiles);

// 2. Create equipment with image URLs
const equipmentData = {
  title: 'Wilson Pro Staff RF97',
  description: 'Excellent condition tennis racket',
  category: 'racket',
  condition: 'like-new',
  price: 150,
  brand: 'Wilson',
  images: imageUrls, // Use the uploaded URLs
  // ... other fields
};

const response = await fetch('/api/equipment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(equipmentData),
});
```

## Security

- All upload endpoints require JWT authentication
- File type validation on server
- File size limits enforced
- Only image files allowed
- Cloudinary handles secure storage and delivery
