const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// GET /api/pokemon
// Optional: ?search=bre
app.get("/api/pokemon", async (req, res) => {
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
app.get("/api/pokemon/:id", async (req, res) => {
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
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});