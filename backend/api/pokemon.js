const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/pokemon
// Optional: ?search=bre
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    let query = "SELECT * FROM pokemon ORDER BY id ASC";
    let params = [];

    if (search && search.trim()) {
      query = "SELECT * FROM pokemon WHERE name LIKE ? ORDER BY id ASC";
      params = [`${search.trim()}%`];
    }

    const [rows] = await db.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/pokemon error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/pokemon/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      "SELECT * FROM pokemon WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/pokemon/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/pokemon/:id/moves
// Returns all moves a pokemon can learn, with learn method and level
router.get("/:id/moves", async (req, res) => {
  try {
    const { id } = req.params;

    const [pokemon] = await db.pool.query("SELECT id, name FROM pokemon WHERE id = ?", [id]);
    if (pokemon.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    const query = `
      SELECT
        m.id AS move_id,
        m.name AS move_name,
        m.type,
        m.power,
        m.accuracy,
        m.pp,
        pm.learn_method,
        pm.level
      FROM pokemon_move pm
      JOIN move m ON pm.move_id = m.id
      WHERE pm.pokemon_id = ?
      ORDER BY pm.learn_method ASC, pm.level ASC
    `;

    const [rows] = await db.pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/pokemon/:id/moves error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/pokemon/:id/locations
// Returns all locations (and areas) where a given pokemon can be found
router.get("/:id/locations", async (req, res) => {
  try {
    const { id } = req.params;

    const [pokemon] = await db.pool.query("SELECT id, name FROM pokemon WHERE id = ?", [id]);
    if (pokemon.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    const query = `
      SELECT
        l.id AS location_id,
        l.name AS location_name,
        a.id AS area_id,
        a.name AS area_name,
        ae.encounter_rate,
        ae.encounter_method,
        ae.min_level,
        ae.max_level
      FROM area_encounter ae
      JOIN area a ON ae.area_id = a.id
      JOIN location l ON a.loc_id = l.id
      WHERE ae.pokemon_id = ?
      ORDER BY l.name ASC, a.name ASC
    `;

    const [rows] = await db.pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/pokemon/:id/locations error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* COMMENTED OUT BECAUSE NOT USED
// POST /api/pokemon/damage
// Body: { attacker_id, defender_id, move_id, conditions }
router.post("/damage", async (req, res) => {
  try {
    const { attacker_id, defender_id, move_id, conditions = {} } = req.body;

    // fetch attacker encounter + pokemon data
    const [attackerRows] = await db.pool.query(
      `SELECT e.*, p.type1, p.type2, p.attack, p.defense, p.sp_attack, p.sp_defense, p.speed, p.hp
       FROM encounter e
       JOIN pokemon p ON e.pokemon_id = p.id
       WHERE e.id = ?`,
      [attacker_id]
    );

    // fetch defender encounter + pokemon data
    const [defenderRows] = await db.pool.query(
      `SELECT e.*, p.type1, p.type2, p.attack, p.defense, p.sp_attack, p.sp_defense, p.speed, p.hp
       FROM encounter e
       JOIN pokemon p ON e.pokemon_id = p.id
       WHERE e.id = ?`,
      [defender_id]
    );

    // fetch move
    const [moveRows] = await db.pool.query(
      "SELECT * FROM move WHERE id = ?",
      [move_id]
    );

    if (attackerRows.length === 0) return res.status(404).json({ error: "Attacker encounter not found" });
    if (defenderRows.length === 0) return res.status(404).json({ error: "Defender encounter not found" });
    if (moveRows.length === 0) return res.status(404).json({ error: "Move not found" });

    const encounterAttacker = attackerRows[0];
    const encounterDefender = defenderRows[0];
    const move = moveRows[0];

    // build attacker object for calculator
    const attacker = {
      level: encounterAttacker.level ?? 50,
      attack: calculateStat(encounterAttacker.attack, encounterAttacker.attack_iv, encounterAttacker.attack_ev),
      sp_attack: calculateStat(encounterAttacker.sp_attack, encounterAttacker.sp_attack_iv, encounterAttacker.sp_attack_ev),
      type1: encounterAttacker.type1,
      type2: encounterAttacker.type2,
      item: encounterAttacker.item_id,
      atkStage: conditions.atkStage ?? 0,
      spAtkStage: conditions.spAtkStage ?? 0,
    };

    // build defender object for calculator
    const defender = {
      defense: calculateStat(encounterDefender.defense, encounterDefender.defense_iv, encounterDefender.defense_ev),
      sp_defense: calculateStat(encounterDefender.sp_defense, encounterDefender.sp_defense_iv, encounterDefender.sp_defense_ev),
      type1: encounterDefender.type1,
      type2: encounterDefender.type2,
      defStage: conditions.defStage ?? 0,
      spDefStage: conditions.spDefStage ?? 0,
    };

    const moveData = {
      type: move.type,
      basePower: move.power,
    };

    const result = calculateDamage(attacker, defender, moveData, conditions);
    res.json(result);

  } catch (err) {
    console.error("POST /api/damage error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Gen 3 stat formula
function calculateStat(base, iv, ev) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * 50) / 100 + 5);
}
*/

module.exports = router;