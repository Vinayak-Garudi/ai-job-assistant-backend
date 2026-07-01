const path = require('path');

// Load the environment-specific .env file based on NODE_ENV,
// mirroring the convention in src/config/env.js.
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

require('dotenv').config({ path: path.resolve(process.cwd(), envFile) });

module.exports = {
  client: 'pg',
  connection: process.env.DIRECT_URL,
  migrations: { directory: './migrations' },
};
