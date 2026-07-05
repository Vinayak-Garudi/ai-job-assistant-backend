const { Pool } = require('pg');
const chalk = require('chalk');

const globalForPg = globalThis;

const pool =
  globalForPg._pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (!globalForPg._pgPool) {
  globalForPg._pgPool = pool;
  // Prevent an unhandled idle-client error from crashing the process —
  // the pool will transparently reconnect on the next query.
  pool.on('error', (error) => {
    console.error(chalk.red(`❌ PostgreSQL pool error: ${error.message}`));
  });
}

// Returns true if the connection check succeeds. Failure is logged but does
// not exit the process — the app keeps serving MongoDB-backed features and
// the pool will retry on the next query.
const connectPostgres = async () => {
  try {
    await pool.query('SELECT 1'); // cheap check that the connection works
    console.log(chalk.green('🐘 PostgreSQL Connected'));
    return true;
  } catch (error) {
    console.error(
      chalk.yellow(
        `⚠️  PostgreSQL unavailable (RAG features degraded): ${error.message}`
      )
    );
    return false;
  }
};

module.exports = { pool, connectPostgres };
