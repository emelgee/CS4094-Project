const app = require("./server");
const { pool } = require("./db");
const { waitForDatabase } = require("./db/waitForDatabase");
const fs = require("fs/promises");
const path = require("path");

async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].cnt > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [tableName, indexName]
  );
  return rows[0].cnt > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  return rows[0].cnt > 0;
}

async function ensureEncounterSchema() {
  const hasEncounterTable = await tableExists("encounter");
  if (!hasEncounterTable) return;

  // Backfill columns added after initial release so older deployed DBs keep working.
  if (!(await columnExists("encounter", "status"))) {
    await pool.query("ALTER TABLE encounter ADD COLUMN status VARCHAR(20) NULL");
  }

  if (!(await columnExists("encounter", "team_slot"))) {
    await pool.query("ALTER TABLE encounter ADD COLUMN team_slot INT NULL");
  }

  if (!(await columnExists("encounter", "source"))) {
    await pool.query(
      "ALTER TABLE encounter ADD COLUMN source ENUM('encounter', 'team') NOT NULL DEFAULT 'encounter'"
    );
  }

  if (!(await indexExists("encounter", "idx_encounter_user_source"))) {
    await pool.query("CREATE INDEX idx_encounter_user_source ON encounter (user_id, source)");
  }

  if (!(await indexExists("encounter", "idx_encounter_user_status"))) {
    await pool.query("CREATE INDEX idx_encounter_user_status ON encounter (user_id, status)");
  }

  if (!(await indexExists("encounter", "uniq_encounter_user_slot"))) {
    const [dupes] = await pool.query(
      `SELECT user_id, team_slot, COUNT(*) AS cnt
       FROM encounter
       WHERE team_slot IS NOT NULL
       GROUP BY user_id, team_slot
       HAVING COUNT(*) > 1
       LIMIT 1`
    );

    if (dupes.length === 0) {
      await pool.query(
        "CREATE UNIQUE INDEX uniq_encounter_user_slot ON encounter (user_id, team_slot)"
      );
    } else {
      console.warn(
        "Skipping unique index uniq_encounter_user_slot due to duplicate existing team slots"
      );
    }
  }
}

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

  await ensureEncounterSchema();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch(err => {
  console.error("Startup failed:", err);
  process.exit(1);
});