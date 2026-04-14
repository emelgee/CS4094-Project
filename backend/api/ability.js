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
        console.error("GET /api/abilities error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /api/abilities/25
router.get("/id:", async (req, res) => {
    try {;

        let query = `
        SELECT * FROM ability WHERE id = ?"
        `;
        let params = [];

        const [rows] = await db.pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/abilities/id: error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /api/abilities/25/pokemon
router.get("/id:/pokemon", async (req, res) => {
    try {;

        let query = `
        SELECT * FROM pokemon
        WHERE ability1 = ? OR ability2 = ? OR ability_hidden = ?
        ORDER BY id ASC
        `;
        let params = [];

        const [rows] = await db.pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/abilities/id:/pokemon error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

