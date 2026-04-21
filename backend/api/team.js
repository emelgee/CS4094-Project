const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/team/:user_id
// Returns party (team_slot 1-6) and PC box (team_slot NULL) with full pokemon + move data
router.get("/:user_id", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT
        e.id, e.user_id, e.nickname, e.level, e.nature, e.ability, e.team_slot,
        e.hp_iv, e.attack_iv, e.defense_iv, e.sp_attack_iv, e.sp_defense_iv, e.speed_iv,
        e.hp_ev, e.attack_ev, e.defense_ev, e.sp_attack_ev, e.sp_defense_ev, e.speed_ev,
        e.status, e.item_id,
        p.id AS pokemon_id, p.name, p.type1, p.type2,
        p.hp, p.attack, p.defense, p.sp_attack, p.sp_defense, p.speed,
        a1.name AS ability1, a2.name AS ability2, ah.name AS ability_hidden,
        m1.name AS move1, m2.name AS move2, m3.name AS move3, m4.name AS move4
       FROM team_pokemon t
       JOIN pokemon p ON t.pokemon_id = p.id
       LEFT JOIN ability a1 ON p.ability1 = a1.id
       LEFT JOIN ability a2 ON p.ability2 = a2.id
       LEFT JOIN ability ah ON p.ability_hidden = ah.id
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

// PATCH /api/team/:id/slot
// Body: { team_slot } — move between party slots (1-6) or to PC box (null)
router.patch("/:id/slot", async (req, res) => {
  try {
    const { team_slot } = req.body;

    // Validate slot range
    if (team_slot !== null && (team_slot < 1 || team_slot > 6)) {
      return res.status(400).json({ error: "team_slot must be between 1 and 6 or null" });
    }

    await db.pool.query("UPDATE encounter SET team_slot = ? WHERE id = ? AND user_id = ?", [
      team_slot ?? null,
      req.params.id,
      req.body.user_id
    ]);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That team slot is already occupied" });
    }
    console.error("PATCH /api/team/:id/slot error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;