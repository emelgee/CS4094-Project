const { pool, closePool } = require("../db/connection");

const INSERT_MOVE_SQL = `
  INSERT INTO move (
    id, name, type, power, accuracy, pp
  )
  VALUES (?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name     = VALUES(name),
    type     = VALUES(type),
    power    = VALUES(power),
    accuracy = VALUES(accuracy),
    pp       = VALUES(pp)
`;

async function insertMoves(moveRows) {
  if (!Array.isArray(moveRows) || moveRows.length === 0) {
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const move of moveRows) {
      await connection.execute(INSERT_MOVE_SQL, [
        move.id,
        move.name,
        move.type,
        move.power ?? null,
        move.accuracy ?? null,
        move.pp,
      ]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function runDirectInsert(rows) {
  try {
    await insertMoves(rows);
    console.log(`Inserted/updated ${rows.length} move rows.`);
  } catch (error) {
    console.error("Failed to insert move rows:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertMoves, runDirectInsert };