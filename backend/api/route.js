const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/locations
// Optional: ?include_areas=true
router.get("/", async (req, res) => {
  try {
    const includeAreas = req.query.include_areas === "true";

    if (!includeAreas) {
      const [rows] = await db.pool.query("SELECT * FROM location ORDER BY name ASC");
      return res.json(rows);
    }

    const [locations] = await db.pool.query("SELECT * FROM location ORDER BY name ASC");
    const [areas] = await db.pool.query("SELECT * FROM area ORDER BY name ASC");

    const result = locations.map((loc) => ({
      ...loc,
      areas: areas.filter((area) => area.loc_id === loc.id),
    }));

    res.json(result);
  } catch (err) {
    console.error("GET /api/locations error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/locations/:id/encounters
// Returns all encounters (and the pokemon in them) across all areas in a location
router.get("/:id/encounters", async (req, res) => {
  try {
    const { id } = req.params;

    const [location] = await db.pool.query("SELECT * FROM location WHERE id = ?", [id]);
    if (location.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    const query = `
      SELECT
        ae.id AS encounter_id,
        ae.encounter_rate,
        ae.encounter_method,
        ae.min_level,
        ae.max_level,
        a.id AS area_id,
        a.name AS area_name,
        p.id AS pokemon_id,
        p.name AS pokemon_name
      FROM area_encounter ae
      JOIN area a ON ae.area_id = a.id
      JOIN pokemon p ON ae.pokemon_id = p.id
      WHERE a.loc_id = ?
      ORDER BY a.name ASC, p.name ASC
    `;

    const [rows] = await db.pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/locations/:id/encounters error:", err);
    res.status(500).json({ error: "Database error" });
  }
});