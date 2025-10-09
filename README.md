# Node.js Express MongoDB Template

A comprehensive Node.js backend template with Express.js, MongoDB (Mongoose), and a CLI generator for rapid module development.

## Features

- **Express.js** - Fast, minimalist web framework
- **MongoDB** with **Mongoose** - Document database with ODM
- **Authentication** - JWT-based authentication system
- **Security** - Helmet, CORS, rate limiting
- **Validation** - Joi schema validation
- **CLI Generator** - Generate modules, controllers, services, and models
- **Logging** - Morgan HTTP request logger
- **Testing** - Jest testing framework
- **Code Quality** - ESLint and Prettier

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/node-template
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

### Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## CLI Generator & Automatic Route Loading

This template includes a powerful CLI generator with **automatic route discovery**:

### Generate a Module

```bash
npm run generate module product
```

This creates a complete module with:

- `src/modules/product/product.model.js` - Mongoose model
- `src/modules/product/product.service.js` - Business logic service
- `src/modules/product/product.controller.js` - Route handlers
- `src/modules/product/product.routes.js` - Express routes
- `src/modules/product/product.validation.js` - Joi validation schemas
- `src/modules/product/route.config.js` - **Route configuration**

### Automatic Route Loading

**No manual route registration needed!** The server automatically:

1. **Discovers** all modules in `src/modules/` directory
2. **Loads** routes from each module's `.routes.js` file
3. **Registers** routes using the path from `route.config.js`
4. **Applies** module-specific middleware and rate limiting

### Customize Route Paths

Edit `src/modules/{module}/route.config.js`:

```javascript
module.exports = {
  path: '/api/products', // Custom route path
  enabled: true, // Enable/disable module
  description: 'Product API', // Documentation
  version: 'v1', // API version

  // Optional: Module-specific middleware
  middleware: [require('../../middleware/auth')],

  // Optional: Module-specific rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 50,
  },
};
```

### Generate Individual Components

```bash
# Generate just a model
npm run generate model Product

# Generate just a service
npm run generate service Product

# Generate just a controller
npm run generate controller Product
```

## Project Structure

```
src/
├── config/         # Configuration files
├── middleware/     # Custom middleware
├── modules/        # Feature modules
│   └── auth/       # Authentication module
├── utils/          # Utility functions
├── app.js          # Express app setup
└── server.js       # Server entry point
cli/
├── generator.js    # CLI generator tool
└── templates/      # Code templates
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Auto-loaded Modules

The following modules are automatically loaded based on your `src/modules/` directory:

#### Products (`/api/products`)

- `GET /api/products` - Get all products (protected)
- `GET /api/products/:id` - Get product by ID (protected)
- `POST /api/products` - Create new product (protected)
- `PUT /api/products/:id` - Update product (protected)
- `DELETE /api/products/:id` - Delete product (protected)
- `GET /api/products/search?q=term` - Search products
- `GET /api/products/stats` - Get product statistics

#### Categories (`/api/categories`)

- `GET /api/categories` - Get all categories (protected)
- `GET /api/categories/:id` - Get category by ID (protected)
- `POST /api/categories` - Create new category (protected)
- `PUT /api/categories/:id` - Update category (protected)
- `DELETE /api/categories/:id` - Delete category (protected)
- `GET /api/categories/search?q=term` - Search categories
- `GET /api/categories/stats` - Get category statistics

### Health Check

- `GET /api/health` - Server health status and loaded modules

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run generate` - Run CLI generator

## Environment Variables

| Variable         | Description               | Default                                 |
| ---------------- | ------------------------- | --------------------------------------- |
| `NODE_ENV`       | Environment mode          | development                             |
| `PORT`           | Server port               | 3000                                    |
| `MONGODB_URI`    | MongoDB connection string | mongodb://localhost:27017/node-template |
| `JWT_SECRET`     | JWT signing secret        | (required)                              |
| `JWT_EXPIRES_IN` | JWT expiration time       | 7d                                      |

## License

MIT License
