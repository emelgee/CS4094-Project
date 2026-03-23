const mysql = require("mysql2/promise");

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "db",
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
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