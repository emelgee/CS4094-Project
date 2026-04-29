const { pool, closePool } = require("../db/connection");

const INSERT_SQL = `
  INSERT INTO evolution (from_pokemon_id, to_pokemon_id, \`trigger\`, min_level, item)
  VALUES (?, ?, ?, ?, ?)
`;

async function insertEvolutions(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Truncate first so re-seeding is idempotent
    await connection.execute("DELETE FROM evolution");
    for (const evo of rows) {
      await connection.execute(INSERT_SQL, [
        evo.from_pokemon_id,
        evo.to_pokemon_id,
        evo.trigger    ?? null,
        evo.min_level  ?? null,
        evo.item       ?? null,
      ]);
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function runDirectInsert(rows) {
  try {
    await insertEvolutions(rows);
    console.log(`Inserted/updated ${rows.length} evolution rows.`);
  } catch (err) {
    console.error("Failed to insert evolution rows:", err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertEvolutions, runDirectInsert };
