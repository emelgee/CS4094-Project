const { pool, closePool } = require("../db/connection");

const INSERT_LOCATION_SQL = `
    INSERT INTO location (name)
    VALUES (?)
    ON DUPLICATE KEY UPDATE
        name = VALUES(name)
`;

const INSERT_AREA_SQL = `
    INSERT INTO area (loc_id, name)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
        loc_id = VALUES(loc_id),
        name   = VALUES(name)
`;

const INSERT_ENCOUNTER_DETAILS_SQL = `
    INSERT INTO area_encounter (
        area_id, pokemon_id, encounter_rate, encounter_method, max_level, min_level
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        area_id            = VALUES(area_id), 
        pokemon_id         = VALUES(pokemon_id),
        encounter_rate     = VALUES(encounter_rate),
        encounter_method   = VALUES(encounter_method),
        max_level          = VALUES(max_level),
        min_level          = VALUES(min_level)
`;

async function insertEncounters(connection, encounterRows, area_id) {
    if (!Array.isArray(encounterRows) || encounterRows.length === 0) {
        return;
    }

    try {
        for (const pokemon of encounterRows) {
            const pokemon_name = pokemon.pokemon;
            const [result] = await connection.execute('SELECT id FROM pokemon WHERE name = ?', [pokemon_name]);
            const pokemon_id = result[0].id;
            const methods = pokemon.encounter.methods;
            for (const method of methods) {
                const [result] = await connection.execute(INSERT_ENCOUNTER_DETAILS_SQL, [
                    area_id,
                    pokemon_id,
                    method.max_chance,
                    method.method_name,
                    method.max_level,
                    method.min_level,
                ]);
            }
        }
    } catch (error) {
            throw error;
    }
}

async function insertAreas(connection, areaRows, loc_id) {
    if (!Array.isArray(areaRows) || areaRows.length === 0) {
        return;
    }

    try {
        for (const area of areaRows) {
            if (!area.encounters || area.encounters.length === 0) {
                continue;
            }       
            const [result] = await connection.execute(INSERT_AREA_SQL, [
                loc_id,
                area.name
            ]);
            const area_id = result.insertId;
            const encounterRows = area.encounters;
            await insertEncounters(connection, encounterRows, area_id);
        }
    } catch (error) {
            throw error;
    }
}

async function insertLocations(locationRows) {
    if (!Array.isArray(locationRows) || locationRows.length === 0) {
        return;
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const location of locationRows) {
            const [result] = await connection.execute(INSERT_LOCATION_SQL, [
                location.name
            ]);
            const loc_id = result.insertId;
            const areaRows = location.areas;
            await insertAreas(connection, areaRows, loc_id);
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
    await insertLocations(rows);
    console.log(`Inserted/updated ${rows.length} location rows.`);
  } catch (error) {
    console.error("Failed to insert location rows:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert([]);
}

module.exports = { insertLocations, runDirectInsert };
