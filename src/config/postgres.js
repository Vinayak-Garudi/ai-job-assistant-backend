const { Pool } = require('pg');
const chalk = require('chalk');

const globalForPg = globalThis;

const pool =
  globalForPg._pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (!globalForPg._pgPool) globalForPg._pgPool = pool;

const connectPostgres = async () => {
  try {
    await pool.query('SELECT 1'); // cheap check that the connection works
    console.log(chalk.green('🐘 PostgreSQL Connected'));
  } catch (error) {
    console.error(
      chalk.red(`❌ PostgreSQL Connection Error: ${error.message}`)
    );
    process.exit(1);
  }
};

module.exports = { pool, connectPostgres };
