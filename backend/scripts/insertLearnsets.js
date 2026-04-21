const { pool, closePool } = require("../db/connection");

const INSERT_POKEMON_MOVE_SQL = `
    INSERT INTO pokemon_move (
        pokemon_id, move_id, learn_method, level)
    VALUES(?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    pokemon_id   = VALUES(pokemon_id), 
    move_id      = VALUES(move_id), 
    learn_method = VALUES(learn_method), 
    level        = VALUES(level)
`;

async function insertPokemonMoves(PokemonRows) {
    if (!Array.isArray(PokemonRows) || PokemonRows.length === 0) {
        return 0;
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        for (const pokemon of PokemonRows) {
            const learnset = pokemon.learnset;
            for (const move of learnset) {
                const [result] = await connection.execute('SELECT id FROM move WHERE name = ?', [move.move_name]);
                const move_id = result[0].id;
                await connection.execute(INSERT_POKEMON_MOVE_SQL, [
                    pokemon.pokemon_id,
                    move_id,
                    move.learn_method,
                    move.learn_method === "level-up" ? move.level : null
                ]);
            }
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
    await insertPokemonMoves(rows);
    console.log(`Inserted/updated ${rows.length} learnset rows.`);
  } catch (error) {
    console.error("Failed to insert learnset rows:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertPokemonMoves, runDirectInsert };