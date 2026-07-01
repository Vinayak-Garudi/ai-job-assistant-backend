// test-db.js  (delete after)
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

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

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query('SELECT NOW()');
console.log('Connected:', rows[0]);
await pool.end();
