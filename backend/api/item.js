const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/items
// Optional: ?search=
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    let query = "SELECT * FROM item ORDER BY name ASC";
    let params = [];

    if (search && search.trim()) {
      query = "SELECT * FROM item WHERE name LIKE ? ORDER BY name ASC";
      params = [`${search.trim()}%`];
    }

    const [rows] = await db.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/items error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/items/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.pool.query("SELECT * FROM item WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/items/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;