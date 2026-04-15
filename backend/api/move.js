const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/pokemon/moves — must be registered before /:id so "moves" is not captured as an id
// Optional: ?search=thunder ?type=fire ?orderBy=power
router.get("/", async (req, res) => {
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
router.get("/:id", async (req, res) => {
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

module.exports = router;