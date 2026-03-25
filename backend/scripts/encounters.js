const { pool, closePool } = require("../db/connection");

const INSERT_ENCOUNTER_BASIC_SQL = `
  INSERT INTO encounter (
  user_id, pokemon_id, location, nickname, ability, nature, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    pokemon_id = VALUES(pokemon_id),
    location   = VALUES(location),
    nickname   = VALUES(nickname),
    ability    = VALUES(ability),
    nature     = VALUES(nature),
    status     = VALUES(status)
  `;

async function insertEncounterBasic(user_id, pokemon_id, location, nickname, ability, nature, status) {

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (nickname == null || ability == null) {
      const [rows] = await connection.execute(
        `SELECT name, ability1 FROM pokemon WHERE id = ?`,
        [pokemon_id]
      );

      if (rows.length === 0) throw new Error(`Pokemon ${pokemon_id} not found`);

      if (nickname == null) nickname = rows[0].name;
      if (ability == null)  ability  = rows[0].ability1;
    }

    if (nature == null)   nature = "serious";
    if (status == null)   status = "healthy";

    await connection.execute(INSERT_ENCOUNTER_BASIC_SQL, [
    user_id,
    pokemon_id,
    location ?? null,
    nickname, 
    ability, 
    nature, 
    status
      ]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function runDirectInsert(user_id, pokemon_id, location, nickname, ability, nature, status) {
  try {
    await insertEncounterBasic(user_id, pokemon_id, location, nickname, ability, nature, status);
    console.log(`Inserted/updated basic encounter.`);
  } catch (error) {
    console.error("Failed to insert basic encounter:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert();
}

module.exports = { insertEncounterBasic, runDirectInsert };


    