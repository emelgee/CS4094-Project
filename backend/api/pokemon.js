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

module.exports = router;