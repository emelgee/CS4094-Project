const { pool, closePool } = require("../db/connection");

const INSERT_POKEMON_SQL = `
  INSERT INTO pokemon (
    id, name, hp, attack, defense, sp_attack, sp_defense, speed,
    type1, type2, ability1, ability2, ability_hidden
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    hp = VALUES(hp),
    attack = VALUES(attack),
    defense = VALUES(defense),
    sp_attack = VALUES(sp_attack),
    sp_defense = VALUES(sp_defense),
    speed = VALUES(speed),
    type1 = VALUES(type1),
    type2 = VALUES(type2),
    ability1 = VALUES(ability1),
    ability2 = VALUES(ability2),
    ability_hidden = VALUES(ability_hidden)
`;

const GET_ABILITY_ID = `
  SELECT id
  FROM ability
  WHERE name = ?
`;

async function insertPokemon(pokemonRows) {
  if (!Array.isArray(pokemonRows) || pokemonRows.length === 0) {
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const pokemon of pokemonRows) {
      const [rows1] = await connection.execute(GET_ABILITY_ID, [pokemon.ability1]);
        const [rows2] = await connection.execute(GET_ABILITY_ID, [pokemon.ability2]);
        const [rows3] = await connection.execute(GET_ABILITY_ID, [pokemon.ability_hidden]);

        const ability1_id = rows1[0]?.id ?? null;
        const ability2_id = rows2[0]?.id ?? null;
        const ability_hidden_id = rows3[0]?.id ?? null;
      await connection.execute(INSERT_POKEMON_SQL, [
        pokemon.id,
        pokemon.name,
        pokemon.hp,
        pokemon.attack,
        pokemon.defense,
        pokemon.sp_attack,
        pokemon.sp_defense,
        pokemon.speed,
        pokemon.type1,
        pokemon.type2 ?? null,
        ability1_id,
        ability2_id,
        ability_hidden_id
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
    await insertPokemon(rows);
    console.log(`Inserted/updated ${rows.length} pokemon rows.`);
  } catch (error) {
    console.error("Failed to insert pokemon rows:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertPokemon, runDirectInsert };
