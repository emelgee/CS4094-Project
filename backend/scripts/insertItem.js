const { pool, closePool } = require("../db/connection");

const INSERT_ITEM_SQL = `
  INSERT INTO item (
    name, category, effect, effect_long, flavor_text
  )
  VALUES (?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name     = VALUES(name),
    category     = VALUES(category),
    effect    = VALUES(effect),
    effect_long = VALUES(effect_long),
    flavor_text       = VALUES(flavor_text)
`;

async function insertItems(itemRows) {
  if (!Array.isArray(itemRows) || itemRows.length === 0) {
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const item of itemRows) {
      await connection.execute(INSERT_ITEM_SQL, [
        item.name,
        item.category,
        item.effect,
        item.effect_long,
        item.flavor_text,
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
    await insertItems(rows);
    console.log(`Inserted/updated ${rows.length} item rows.`);
  } catch (error) {
    console.error("Failed to insert item rows:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertItems, runDirectInsert };