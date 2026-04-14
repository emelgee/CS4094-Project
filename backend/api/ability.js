const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/abilities
// Optional: ?search=
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
    console.error("GET /api/ability error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

