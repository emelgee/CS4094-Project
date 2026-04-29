const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../auth/middleware");

// All encounter routes require authentication and operate on the
// authenticated user's data only.
router.use(requireAuth);

// GET /api/encounters
// Returns all encounters belonging to the authenticated user.
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT 
         e.*,
         p.name AS pokemon_name,
         p.type1,
         p.type2
       FROM encounter e
       JOIN pokemon p ON e.pokemon_id = p.id
       WHERE e.user_id = ?
       ORDER BY e.id ASC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/encounters error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/encounters/encounter/:id
router.get("/encounter/:id", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT 
         e.*,
         p.name AS pokemon_name,
         p.type1,
         p.type2
       FROM encounter e
       JOIN pokemon p ON e.pokemon_id = p.id
       WHERE e.id = ? AND e.user_id = ?
       LIMIT 1`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/encounters/encounter/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/encounters
// user_id is taken from the auth token; any user_id in the body is ignored.
router.post("/", async (req, res) => {
  try {
    const {
      pokemon_id,
      location_id,
      nickname,
      ability_id,
      nature,
      hp_iv,
      attack_iv,
      defense_iv,
      sp_attack_iv,
      sp_defense_iv,
      speed_iv,
      hp_ev,
      attack_ev,
      defense_ev,
      sp_attack_ev,
      sp_defense_ev,
      speed_ev,
      move1_id,
      move2_id,
      move3_id,
      move4_id,
      item_id,
      status,
    } = req.body;

    const [result] = await db.pool.query(
      `INSERT INTO encounter 
        (user_id, pokemon_id, location_id, nickname, ability_id, nature,
         hp_iv, attack_iv, defense_iv, sp_attack_iv, sp_defense_iv, speed_iv,
         hp_ev, attack_ev, defense_ev, sp_attack_ev, sp_defense_ev, speed_ev,
         move1_id, move2_id, move3_id, move4_id, item_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        pokemon_id,
        location_id,
        nickname,
        ability_id,
        nature,
        hp_iv,
        attack_iv,
        defense_iv,
        sp_attack_iv,
        sp_defense_iv,
        speed_iv,
        hp_ev,
        attack_ev,
        defense_ev,
        sp_attack_ev,
        sp_defense_ev,
        speed_ev,
        move1_id,
        move2_id,
        move3_id,
        move4_id,
        item_id,
        status,
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("POST /api/encounters error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /api/encounters/:id
router.patch("/:id", async (req, res) => {
  try {
    const allowed = [
      "location_id",
      "nickname",
      "ability_id",
      "nature",
      "level",
      "status",
      "hp_iv",
      "attack_iv",
      "defense_iv",
      "sp_attack_iv",
      "sp_defense_iv",
      "speed_iv",
      "hp_ev",
      "attack_ev",
      "defense_ev",
      "sp_attack_ev",
      "sp_defense_ev",
      "speed_ev",
      "move1_id",
      "move2_id",
      "move3_id",
      "move4_id",
      "item_id",
    ];

    const fields = Object.keys(req.body).filter((key) => allowed.includes(key));

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields provided" });
    }

    const values = fields.map((f) => req.body[f]);
    const setClause = fields.map((f) => `${f} = ?`).join(", ");

    const [result] = await db.pool.query(
      `UPDATE encounter SET ${setClause} WHERE id = ? AND user_id = ?`,
      [...values, req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json({ message: "Encounter updated" });
  } catch (err) {
    console.error("PATCH /api/encounters/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /api/encounters/:id
router.put("/:id", async (req, res) => {
  try {
    const {
      location_id,
      nickname,
      ability_id,
      nature,
      hp_iv,
      attack_iv,
      defense_iv,
      sp_attack_iv,
      sp_defense_iv,
      speed_iv,
      hp_ev,
      attack_ev,
      defense_ev,
      sp_attack_ev,
      sp_defense_ev,
      speed_ev,
      move1_id,
      move2_id,
      move3_id,
      move4_id,
      item_id,
      status,
    } = req.body;

    const [result] = await db.pool.query(
      `UPDATE encounter SET
        location_id = ?, nickname = ?, ability_id = ?, nature = ?,
        hp_iv = ?, attack_iv = ?, defense_iv = ?, sp_attack_iv = ?, sp_defense_iv = ?, speed_iv = ?,
        hp_ev = ?, attack_ev = ?, defense_ev = ?, sp_attack_ev = ?, sp_defense_ev = ?, speed_ev = ?,
        move1_id = ?, move2_id = ?, move3_id = ?, move4_id = ?, item_id = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [
        location_id,
        nickname,
        ability_id,
        nature,
        hp_iv,
        attack_iv,
        defense_iv,
        sp_attack_iv,
        sp_defense_iv,
        speed_iv,
        hp_ev,
        attack_ev,
        defense_ev,
        sp_attack_ev,
        sp_defense_ev,
        speed_ev,
        move1_id,
        move2_id,
        move3_id,
        move4_id,
        item_id,
        status,
        req.params.id,
        req.user.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json({ message: "Encounter updated" });
  } catch (err) {
    console.error("PUT /api/encounters/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/encounters/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.pool.query(
      "DELETE FROM encounter WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json({ message: "Encounter deleted" });
  } catch (err) {
    console.error("DELETE /api/encounters/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
