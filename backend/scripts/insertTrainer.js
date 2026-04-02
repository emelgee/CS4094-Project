const { pool, closePool } = require("../db/connection");

const INSERT_TRAINER_SQL = `
  INSERT INTO trainer (
    id, name, trainer_class, party_name, route,
    maps_json, items_json, pokemon_json
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    trainer_class = VALUES(trainer_class),
    party_name = VALUES(party_name),
    route = VALUES(route),
    maps_json = VALUES(maps_json),
    items_json = VALUES(items_json),
    pokemon_json = VALUES(pokemon_json)
`;

async function insertTrainers(trainerRows) {
  if (!Array.isArray(trainerRows) || trainerRows.length === 0) {
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const trainer of trainerRows) {
      await connection.execute(INSERT_TRAINER_SQL, [
        trainer.id,
        trainer.name || "",
        trainer.class || "",
        trainer.party ?? null,
        trainer.route ?? null,
        JSON.stringify(Array.isArray(trainer.maps) ? trainer.maps : []),
        JSON.stringify(Array.isArray(trainer.items) ? trainer.items : []),
        JSON.stringify(Array.isArray(trainer.pokemon) ? trainer.pokemon : [])
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
    await insertTrainers(rows);
    console.log(`Inserted/updated ${rows.length} trainer rows.`);
  } catch (error) {
    console.error("Failed to insert trainer rows:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertTrainers, runDirectInsert };
