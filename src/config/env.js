const path = require('path');
const dotenv = require('dotenv');

/**
 * Load environment-specific configuration
 * Priority: .env.local > .env.development > .env.production > .env
 */
function loadEnvConfig() {
  const nodeEnv = process.env.NODE_ENV || 'local';
  
  let envFile;
  switch (nodeEnv) {
    case 'local':
      envFile = '.env.local';
      break;
    case 'development':
      envFile = '.env.development';
      break;
    case 'production':
      envFile = '.env.production';
      break;
    default:
      envFile = '.env';
  }

  const envPath = path.resolve(process.cwd(), envFile);
  
  // Load the environment-specific file
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.warn(`⚠️  Warning: Could not load ${envFile}, falling back to .env`);
    dotenv.config(); // Fallback to default .env
  } else {
    console.log(`✅ Loaded environment configuration from ${envFile}`);
  }
}

module.exports = loadEnvConfig;
