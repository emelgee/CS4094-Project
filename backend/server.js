const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");
const fs = require("fs/promises");

const pokemonRoutes = require("./api/pokemon");
const encounterRoutes = require("./api/encounter");
const teamRoutes = require("./api/team");
const abilityRoutes = require("./api/ability");
const itemRoutes = require("./api/item");
const routeRoutes = require("./api/route");
const moveRoutes = require("./api/move");
const authRoutes = require("./api/auth");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/abilities", abilityRoutes)
app.use("/api/pokemon", pokemonRoutes);
app.use("/api/encounters", encounterRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/locations", routeRoutes);
app.use("/api/moves", moveRoutes);

// GET /api/trainers
app.get("/api/trainers", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      "SELECT id, name, trainer_class, party_name, route, maps_json, items_json, pokemon_json FROM trainer ORDER BY id ASC"
    );

    if (rows.length === 0) {
      const trainerDataPath = path.join(__dirname, "data", "trainerData.json");
      const raw = await fs.readFile(trainerDataPath, "utf8");
      const parsed = JSON.parse(raw);
      return res.json(
        Array.isArray(parsed.trainerList) ? parsed.trainerList : []
      );
    }

    const trainers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      class: row.trainer_class,
      party: row.party_name,
      route: row.route,
      maps: parseJsonField(row.maps_json),
      items: parseJsonField(row.items_json),
      pokemon: parseJsonField(row.pokemon_json),
    }));

    res.json(trainers);
  } catch (err) {
    console.error("GET /api/trainers error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/trainers/:id
app.get("/api/trainers/:id", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      "SELECT id, name, trainer_class, party_name, route, maps_json, items_json, pokemon_json FROM trainer WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const row = rows[0];
    res.json({
      id: row.id,
      name: row.name,
      class: row.trainer_class,
      party: row.party_name,
      route: row.route,
      maps: parseJsonField(row.maps_json),
      items: parseJsonField(row.items_json),
      pokemon: parseJsonField(row.pokemon_json),
    });
  } catch (err) {
    console.error("GET /api/trainers/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

function parseJsonField(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

module.exports = app;
