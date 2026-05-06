const app = require("./server");
const { pool } = require("./db");
const { waitForDatabase } = require("./db/waitForDatabase");
const fs = require("fs/promises");
const path = require("path");

async function start() {
  await waitForDatabase();

  // Create tables if they don't exist yet (first deploy only).
  const [rows] = await pool.query(
    "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
  );
  if (rows[0].cnt === 0) {
    console.log("No tables found — running schema init...");
    const schemaPath = path.join(__dirname, "db", "schema.sql");
    const sql = await fs.readFile(schemaPath, "utf8");
    const connection = await pool.getConnection();
    try {
      const statements = sql.split(";").map(s => s.trim()).filter(Boolean);
      for (const statement of statements) {
        await connection.query(statement);
      }
      console.log("Schema created successfully.");
    } finally {
      connection.release();
    }
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch(err => {
  console.error("Startup failed:", err);
  process.exit(1);
});