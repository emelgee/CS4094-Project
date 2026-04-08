const { pool, closePool } = require("../db/connection");

const INSERT_ABILITY_SQL = `
  INSERT INTO ability (
    name, effect, flavor_text
  )
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name              = VALUES(name),
    effect            = VALUES(effect),
    flavor_text       = VALUES(flavor_text)
`;

async function insertAbilities(abilityRows) {
  if (!Array.isArray(abilityRows) || abilityRows.length === 0) {
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const ability of abilityRows) {
      await connection.execute(INSERT_ABILITY_SQL, [
        ability.name,
        ability.effect,
        ability.flavor_text,
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
    await insertAbilities(rows);
    console.log(`Inserted/updated ${rows.length} ability rows.`);
  } catch (error) {
    console.error("Failed to insert ability rows:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertAbilities, runDirectInsert };