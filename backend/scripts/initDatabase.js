const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcryptjs");
const { pool, closePool } = require("../db/connection");
const { waitForDatabase } = require("../db/waitForDatabase");
const { insertUser } = require("./users");
const { insertEncounterBasic } = require("./encounters");

const schemaPath = path.join(__dirname, "../db/schema.sql");

async function initDatabase() {
  await waitForDatabase();
  const sql = await fs.readFile(schemaPath, "utf8");

  // mysql2 requires multiStatements for batched schema; use a dedicated connection.
  const connection = await pool.getConnection();
  try {
    const statements = sql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await connection.query(statement);
    }
  } finally {
    connection.release();
  }
}

async function run() {
  try {
    await initDatabase();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await insertUser("admin", "admin@example.com", adminHash);
    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database schema:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  run();
}

module.exports = { initDatabase };
