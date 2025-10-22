# Environment Configuration Guide

This project uses environment-specific configuration files to manage different deployment environments.

## Environment Files

The project supports three environment configurations:

1. **`.env.local`** - For local development on your machine
2. **`.env.development`** - For development/staging servers
3. **`.env.production`** - For production servers

## How It Works

The application automatically loads the appropriate environment file based on the `NODE_ENV` environment variable:

- `NODE_ENV=local` → loads `.env.local`
- `NODE_ENV=development` → loads `.env.development`
- `NODE_ENV=production` → loads `.env.production`

If the specified file is not found, the application falls back to the default `.env` file.

## NPM Scripts

Use these npm scripts to run the application in different environments:

```bash
# Local development (uses .env.local)
npm run dev

# Development server (uses .env.development)
npm run dev:development
npm run start:development

# Production (uses .env.production)
npm start
npm run start:production
```

## Environment Variables

Each environment file should contain the following variables:

```env
NODE_ENV=local|development|production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/your-database-name
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## Setup Instructions

1. **Copy the example files:**
   - `.env.local` - Already created for local development
   - `.env.development` - Already created for development server
   - `.env.production` - Already created for production server

2. **Update the values in each file:**
   - Change database URIs to match your environment
   - Set strong, unique JWT secrets for each environment
   - Adjust other settings as needed

3. **Run the application:**

   ```bash
   # For local development
   npm run dev

   # For development server
   npm run start:development

   # For production
   npm start
   ```

## Security Notes

⚠️ **Important:**

- Never commit actual `.env` files to version control
- All environment files are listed in `.gitignore`
- Use strong, unique secrets for production
- Change default values before deploying

## Adding New Environment Variables

When adding new environment variables:

1. Add the variable to all environment files (`.env.local`, `.env.development`, `.env.production`)
2. Document the variable in this README
3. Use descriptive names with appropriate prefixes (e.g., `DB_`, `JWT_`, `API_`)

## Example Configuration

### Local Development (.env.local)

```env
NODE_ENV=local
PORT=3000
MONGODB_URI=mongodb://localhost:27017/myapp-local
JWT_SECRET=local-dev-secret-key
JWT_EXPIRES_IN=7d
```

### Development Server (.env.development)

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://dev-server:27017/myapp-dev
JWT_SECRET=development-secret-key
JWT_EXPIRES_IN=7d
```

### Production Server (.env.production)

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/myapp-prod
JWT_SECRET=super-strong-production-secret-key
JWT_EXPIRES_IN=1d
```
