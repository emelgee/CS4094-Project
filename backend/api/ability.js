const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/abilities
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = "SELECT * FROM ability ORDER BY name ASC";
    let params = [];
    if (search && search.trim()) {
      query = "SELECT * FROM ability WHERE name LIKE ? ORDER BY name ASC";
      params = [`${search.trim()}%`];
    }
    const [rows] = await db.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/abilities error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/abilities/by-name/:name — must be before /:id
router.get("/by-name/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const [rows] = await db.pool.query(
      "SELECT * FROM ability WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [name]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Ability not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/abilities/by-name error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/abilities/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.pool.query("SELECT * FROM ability WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Ability not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/abilities/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/abilities/:id/pokemon
router.get("/:id/pokemon", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT DISTINCT p.id, p.name, p.type1, p.type2
      FROM pokemon p
      WHERE p.ability1 = ? OR p.ability2 = ? OR p.ability_hidden = ?
      ORDER BY p.id ASC
    `;
    const [rows] = await db.pool.query(query, [id, id, id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/abilities/:id/pokemon error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
