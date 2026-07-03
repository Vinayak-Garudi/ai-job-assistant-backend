// test-db.js  (delete after)
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

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

async function main() {
  const { rows } = await pool.query('SELECT NOW()');
  console.log('Connected:', rows[0]);
  await pool.end();
}
main();
