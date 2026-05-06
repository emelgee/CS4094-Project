const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../auth/middleware");

// All team routes require authentication and operate on the
// authenticated user's data only.
router.use(requireAuth);

// GET /api/team
// Returns party (team_slot 1-6) and PC box (team_slot NULL) with full
// pokemon + move data for the authenticated user.
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT
        e.id, e.user_id, e.nickname, e.level, e.nature, e.ability_id, e.team_slot,
        e.hp_iv, e.attack_iv, e.defense_iv, e.sp_attack_iv, e.sp_defense_iv, e.speed_iv,
        e.hp_ev, e.attack_ev, e.defense_ev, e.sp_attack_ev, e.sp_defense_ev, e.speed_ev,
        e.status, e.item_id,
        p.id AS pokemon_id, p.name, p.type1, p.type2,
        p.hp, p.attack, p.defense, p.sp_attack, p.sp_defense, p.speed,
        a1.name AS ability1, a2.name AS ability2, ah.name AS ability_hidden,
        m1.name AS move1, m2.name AS move2, m3.name AS move3, m4.name AS move4
       FROM encounter e
       JOIN pokemon p ON e.pokemon_id = p.id
       LEFT JOIN ability a1 ON p.ability1 = a1.id
       LEFT JOIN ability a2 ON p.ability2 = a2.id
       LEFT JOIN ability ah ON p.ability_hidden = ah.id
       LEFT JOIN move m1 ON e.move1_id = m1.id
       LEFT JOIN move m2 ON e.move2_id = m2.id
       LEFT JOIN move m3 ON e.move3_id = m3.id
       LEFT JOIN move m4 ON e.move4_id = m4.id
       WHERE e.user_id = ?
       ORDER BY e.team_slot ASC, e.id ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/team error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/team
// Body: { pokemon_id, nickname, level, nature, ability_id, team_slot, location_id }
// user_id is taken from the auth token. team_slot 1-6 for party, omit/null for PC box.
router.post("/", async (req, res) => {
  try {
    const {
      pokemon_id,
      nickname     = null,
      level        = 5,
      nature       = "hardy",
      ability_id   = null,
      team_slot    = null,
      location_id  = null,
    } = req.body;

    if (!pokemon_id) {
      return res.status(400).json({ error: "pokemon_id is required" });
    }

    if (team_slot !== null && (team_slot < 1 || team_slot > 6)) {
      return res.status(400).json({ error: "team_slot must be between 1 and 6 or null" });
    }

    const [result] = await db.pool.query(
      `INSERT INTO encounter
        (user_id, pokemon_id, nickname, level, nature, ability_id, team_slot, location_id, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'team')`,
      [req.user.id, pokemon_id, nickname, level, nature, ability_id, team_slot, location_id]
    );

    const [rows] = await db.pool.query(
      `SELECT
        e.id, e.user_id, e.nickname, e.level, e.nature, e.ability_id, e.team_slot,
        e.hp_iv, e.attack_iv, e.defense_iv, e.sp_attack_iv, e.sp_defense_iv, e.speed_iv,
        e.hp_ev, e.attack_ev, e.defense_ev, e.sp_attack_ev, e.sp_defense_ev, e.speed_ev,
        e.status, e.item_id,
        p.id AS pokemon_id, p.name, p.type1, p.type2,
        p.hp, p.attack, p.defense, p.sp_attack, p.sp_defense, p.speed,
        a1.name AS ability1, a2.name AS ability2, ah.name AS ability_hidden
       FROM encounter e
       JOIN pokemon p ON e.pokemon_id = p.id
       LEFT JOIN ability a1 ON p.ability1 = a1.id
       LEFT JOIN ability a2 ON p.ability2 = a2.id
       LEFT JOIN ability ah ON p.ability_hidden = ah.id
       WHERE e.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That team slot is already occupied" });
    }
    console.error("POST /api/team error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /api/team/:id/slot
// Body: { team_slot } — move between party slots (1-6) or to PC box (null)
router.patch("/:id/slot", async (req, res) => {
  try {
    const { team_slot } = req.body;

    if (team_slot !== null && (team_slot < 1 || team_slot > 6)) {
      return res.status(400).json({ error: "team_slot must be between 1 and 6 or null" });
    }

    const [result] = await db.pool.query(
      "UPDATE encounter SET team_slot = ? WHERE id = ? AND user_id = ?",
      [team_slot ?? null, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pokemon not found or does not belong to user" });
    }
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That team slot is already occupied" });
    }
    console.error("PATCH /api/team/:id/slot error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /api/team/:id/evolve
// Body: { to_pokemon_id } — changes the species of an encounter while keeping all other data.
// Validates that the requested evolution is a known evolution of the current species.
router.patch("/:id/evolve", async (req, res) => {
  try {
    const { to_pokemon_id } = req.body;
    if (!to_pokemon_id) {
      return res.status(400).json({ error: "to_pokemon_id is required" });
    }

    // Confirm this encounter belongs to the user and fetch current pokemon_id
    const [encRows] = await db.pool.query(
      "SELECT id, pokemon_id FROM encounter WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (encRows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found or does not belong to user" });
    }

    const currentPokemonId = encRows[0].pokemon_id;

    // Validate the evolution exists in the evolution table
    const [evoRows] = await db.pool.query(
      "SELECT id FROM evolution WHERE from_pokemon_id = ? AND to_pokemon_id = ?",
      [currentPokemonId, to_pokemon_id]
    );
    if (evoRows.length === 0) {
      return res.status(400).json({ error: "Invalid evolution: not a known evolution of this Pokemon" });
    }

    await db.pool.query(
      "UPDATE encounter SET pokemon_id = ? WHERE id = ? AND user_id = ?",
      [to_pokemon_id, req.params.id, req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/team/:id/evolve error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/team/:id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.pool.query(
      "DELETE FROM encounter WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pokemon not found or does not belong to user" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/team/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
