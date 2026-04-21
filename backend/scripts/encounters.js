const { pool, closePool } = require("../db/connection");

const INSERT_ENCOUNTER_BASIC_SQL = `
  INSERT INTO encounter (
  user_id, pokemon_id, location_id nickname, ability_id, nature, status, level, team_slot)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    pokemon_id = VALUES(pokemon_id),
    location_id   = VALUES(location_id),
    nickname   = VALUES(nickname),
    ability_id    = VALUES(ability_id),
    nature     = VALUES(nature),
    status     = VALUES(status),
    level      = VALUES(level),
    team_slot  = VALUES(team_slot)
  `;

async function insertEncounterBasic(user_id, pokemon_id, location, nickname, ability, nature, status, level, team_slot) {

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [abilityRows] = await connection.execute(
      'SELECT id FROM ability WHERE name LIKE ?',
      [ability]
    );
    let ability_id = abilityRows[0]?.id ?? null;

    const [locationRows] = await connection.execute(
      'SELECT id FROM location WHERE name LIKE ?',
      [location]
    );
    const location_id = locationRows[0]?.id ?? null;

    if (nickname == null || ability_id == null) {
      const [rows] = await connection.execute(
        `SELECT name, ability1 FROM pokemon WHERE id = ?`,
        [pokemon_id]
      );

      if (rows.length === 0) throw new Error(`Pokemon ${pokemon_id} not found`);

      if (nickname == null)   nickname   = rows[0].name;
      if (ability_id == null) ability_id = rows[0].ability1;
    }

    if (nature == null) nature = "serious";
    if (status == null) status = "healthy";
    if (level == null)  level  = 50;

    await connection.execute(INSERT_ENCOUNTER_BASIC_SQL, [
      user_id,
      pokemon_id,
      location_id ?? 1,
      nickname,
      ability_id,
      nature,
      status,
      level,
      team_slot
    ]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function runDirectInsert(user_id, pokemon_id, location, nickname, ability, nature, status, level, team_slot) {
  try {
    await insertEncounterBasic(user_id, pokemon_id, location, nickname, ability, nature, status, level, team_slot);
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


    