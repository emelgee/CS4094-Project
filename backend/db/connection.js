const mysql = require("mysql2/promise");

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || "db",
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASS || process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// Keep a single pool instance in hot-reload/container dev flows.
const pool = globalThis.__pcmMysqlPool || createPool();
if (!globalThis.__pcmMysqlPool) {
  globalThis.__pcmMysqlPool = pool;
}

async function closePool() {
  if (globalThis.__pcmMysqlPool) {
    await globalThis.__pcmMysqlPool.end();
    globalThis.__pcmMysqlPool = null;
  }
}

module.exports = { pool, closePool };