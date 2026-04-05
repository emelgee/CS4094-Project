const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/team/:user_id
// Returns party (slot 0-5) and PC box (slot NULL) with full pokemon + move data
router.get("/:user_id", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT
        t.id, t.user_id, t.nickname, t.level, t.nature, t.ability, t.slot,
        p.id AS pokemon_id, p.name, p.type1, p.type2,
        p.hp, p.attack, p.defense, p.sp_attack, p.sp_defense, p.speed,
        p.ability1, p.ability2, p.ability_hidden,
        m1.name AS move1, m2.name AS move2, m3.name AS move3, m4.name AS move4
       FROM team_pokemon t
       JOIN pokemon p ON t.pokemon_id = p.id
       LEFT JOIN move m1 ON t.move1_id = m1.id
       LEFT JOIN move m2 ON t.move2_id = m2.id
       LEFT JOIN move m3 ON t.move3_id = m3.id
       LEFT JOIN move m4 ON t.move4_id = m4.id
       WHERE t.user_id = ?
       ORDER BY t.slot ASC, t.id ASC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/team error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/team
// Body: { user_id, pokemon_id, nickname, level, nature, ability, slot }
// slot = 0-5 for party, omit/null for PC box
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      pokemon_id,
      nickname,
      level = 5,
      nature = "hardy",
      ability,
      slot = null,
    } = req.body;

    const [result] = await db.pool.query(
      `INSERT INTO team_pokemon
        (user_id, pokemon_id, nickname, level, nature, ability, slot)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        pokemon_id,
        nickname || null,
        level,
        nature,
        ability || null,
        slot,
      ]
    );
    const [rows] = await db.pool.query(
      `SELECT t.*, p.name, p.type1, p.type2,
              p.hp, p.attack, p.defense, p.sp_attack, p.sp_defense, p.speed,
              p.ability1, p.ability2, p.ability_hidden
       FROM team_pokemon t
       JOIN pokemon p ON t.pokemon_id = p.id
       WHERE t.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/team error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /api/team/:id/slot
// Body: { slot } — move between party slots or to/from PC box
router.patch("/:id/slot", async (req, res) => {
  try {
    const { slot } = req.body; // null = PC box, 0-5 = party
    await db.pool.query("UPDATE team_pokemon SET slot = ? WHERE id = ?", [
      slot ?? null,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/team/:id/slot error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/team/:id
// Permanently removes from team (release)
router.delete("/:id", async (req, res) => {
  try {
    await db.pool.query("DELETE FROM team_pokemon WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/team/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
