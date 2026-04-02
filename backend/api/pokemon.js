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
})

// GET /api/pokemon/moves
// Optional: ?search=thunder ?type=fire ?orderBy=power
router.get("/moves", async (req, res) => {
  try {
    const { search, type, orderBy } = req.query;

    let query = "SELECT * FROM move";
    let params = [];
    let conditions = [];

    if (search && search.trim()) {
      conditions.push("name LIKE ?");
      params.push(`${search.trim()}%`);
    }

    if (type && type.trim()) {
      conditions.push("type = ?");
      params.push(type.trim().toLowerCase());
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    if (orderBy === "power") {
      query += " ORDER BY power DESC";
    } else {
      query += " ORDER BY id ASC";
    }

    const [rows] = await db.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/moves error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/pokemon/moves/:id
router.get("/moves/:id", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      "SELECT * FROM move WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Move not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/moves/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

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
      `SELECT e.*, p.type1, p.type2, p.base_attack, p.base_defense, p.base_sp_attack, p.base_sp_defense, p.base_speed, p.base_hp
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

module.exports = router;