const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/encounters/:user_id
// TODO: When authentication is added, update this to use auth token for user id
//router.get("/:user_id", async (req, res) => {
//try {
//const [rows] = await db.pool.query(
//"SELECT * FROM encounter WHERE user_id = ? ORDER BY id ASC",
//[req.params.user_id]
//);
//res.json(rows);
//} catch (err) {
// console.error("GET /api/encounters/:user_id error:", err);
// res.status(500).json({ error: "Database error" });
// }
//});

router.get("/:user_id", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT 
         e.*,
         p.name AS pokemon_name,
         p.type1,
         p.type2
       FROM encounter e
       JOIN pokemon p ON e.pokemon_id = p.id
       WHERE e.user_id = ?
       ORDER BY e.id ASC`,
      [req.params.user_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/encounters/:user_id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/encounters
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      pokemon_id,
      location,
      nickname,
      ability,
      nature,
      hp_iv,
      attack_iv,
      defense_iv,
      sp_attack_iv,
      sp_defense_iv,
      speed_iv,
      hp_ev,
      attack_ev,
      defense_ev,
      sp_attack_ev,
      sp_defense_ev,
      speed_ev,
      move1_id,
      move2_id,
      move3_id,
      move4_id,
      item_id,
      status,
    } = req.body;

    const [result] = await db.pool.query(
      `INSERT INTO encounter 
        (user_id, pokemon_id, location, nickname, ability, nature,
         hp_iv, attack_iv, defense_iv, sp_attack_iv, sp_defense_iv, speed_iv,
         hp_ev, attack_ev, defense_ev, sp_attack_ev, sp_defense_ev, speed_ev,
         move1_id, move2_id, move3_id, move4_id, item_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        pokemon_id,
        location,
        nickname,
        ability,
        nature,
        hp_iv,
        attack_iv,
        defense_iv,
        sp_attack_iv,
        sp_defense_iv,
        speed_iv,
        hp_ev,
        attack_ev,
        defense_ev,
        sp_attack_ev,
        sp_defense_ev,
        speed_ev,
        move1_id,
        move2_id,
        move3_id,
        move4_id,
        item_id,
        status,
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("POST /api/encounters error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /api/encounters/:id
router.patch("/:id", async (req, res) => {
  try {
    const allowed = [
      "location",
      "nickname",
      "ability",
      "nature",
      "status",
      "hp_iv",
      "attack_iv",
      "defense_iv",
      "sp_attack_iv",
      "sp_defense_iv",
      "speed_iv",
      "hp_ev",
      "attack_ev",
      "defense_ev",
      "sp_attack_ev",
      "sp_defense_ev",
      "speed_ev",
      "move1_id",
      "move2_id",
      "move3_id",
      "move4_id",
      "item_id",
    ];

    const fields = Object.keys(req.body).filter((key) => allowed.includes(key));

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields provided" });
    }

    const values = fields.map((f) => req.body[f]);
    const setClause = fields.map((f) => `${f} = ?`).join(", ");

    const [result] = await db.pool.query(
      `UPDATE encounter SET ${setClause} WHERE id = ?`,
      [...values, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json({ message: "Encounter updated" });
  } catch (err) {
    console.error("PATCH /api/encounters/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /api/encounters/:id
// TODO: When authentication is added, update this to use auth token for user id
router.put("/:id", async (req, res) => {
  try {
    const {
      location,
      nickname,
      ability,
      nature,
      hp_iv,
      attack_iv,
      defense_iv,
      sp_attack_iv,
      sp_defense_iv,
      speed_iv,
      hp_ev,
      attack_ev,
      defense_ev,
      sp_attack_ev,
      sp_defense_ev,
      speed_ev,
      move1_id,
      move2_id,
      move3_id,
      move4_id,
      item_id,
      status,
    } = req.body;

    const [result] = await db.pool.query(
      `UPDATE encounter SET
        location = ?, nickname = ?, ability = ?, nature = ?,
        hp_iv = ?, attack_iv = ?, defense_iv = ?, sp_attack_iv = ?, sp_defense_iv = ?, speed_iv = ?,
        hp_ev = ?, attack_ev = ?, defense_ev = ?, sp_attack_ev = ?, sp_defense_ev = ?, speed_ev = ?,
        move1_id = ?, move2_id = ?, move3_id = ?, move4_id = ?, item_id = ?, status = ?
       WHERE id = ?`,
      [
        location,
        nickname,
        ability,
        nature,
        hp_iv,
        attack_iv,
        defense_iv,
        sp_attack_iv,
        sp_defense_iv,
        speed_iv,
        hp_ev,
        attack_ev,
        defense_ev,
        sp_attack_ev,
        sp_defense_ev,
        speed_ev,
        move1_id,
        move2_id,
        move3_id,
        move4_id,
        item_id,
        status,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json({ message: "Encounter updated" });
  } catch (err) {
    console.error("PUT /api/encounters/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/encounters/:id
// TODO: When authentication is added, update this to use auth token for user id
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.pool.query("DELETE FROM encounter WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    res.json({ message: "Encounter deleted" });
  } catch (err) {
    console.error("DELETE /api/encounters/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;

/*
CREATE TABLE encounter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pokemon_id INT NOT NULL,
  location VARCHAR(50),
  nickname VARCHAR(20),
  ability VARCHAR(50),
  nature VARCHAR(20) NOT NULL DEFAULT 'serious',

  hp_iv INT NOT NULL DEFAULT 31 CHECK (hp_iv BETWEEN 0 AND 31),
  attack_iv INT NOT NULL DEFAULT 31 CHECK (attack_iv BETWEEN 0 AND 31),
  defense_iv INT NOT NULL DEFAULT 31 CHECK (defense_iv BETWEEN 0 AND 31),
  sp_attack_iv INT NOT NULL DEFAULT 31 CHECK (sp_attack_iv BETWEEN 0 AND 31),
  sp_defense_iv INT NOT NULL DEFAULT 31 CHECK (sp_defense_iv BETWEEN 0 AND 31),
  speed_iv INT NOT NULL DEFAULT 31 CHECK (speed_iv BETWEEN 0 AND 31),

  hp_ev INT NOT NULL DEFAULT 0 CHECK (hp_ev BETWEEN 0 AND 252),
  attack_ev INT NOT NULL DEFAULT 0 CHECK (attack_ev BETWEEN 0 AND 252),
  defense_ev INT NOT NULL DEFAULT 0 CHECK (defense_ev BETWEEN 0 AND 252),
  sp_attack_ev INT NOT NULL DEFAULT 0 CHECK (sp_attack_ev BETWEEN 0 AND 252),
  sp_defense_ev INT NOT NULL DEFAULT 0 CHECK (sp_defense_ev BETWEEN 0 AND 252),
  speed_ev INT NOT NULL DEFAULT 0 CHECK (speed_ev BETWEEN 0 AND 252),

  move1_id INT NULL,
  move2_id INT NULL,
  move3_id INT NULL,
  move4_id INT NULL,

  item_id INT NULL,

  CHECK (
  hp_ev + attack_ev + defense_ev + sp_attack_ev + sp_defense_ev + speed_ev <= 510
  ),

  status VARCHAR(20),

  FOREIGN KEY (item_id) REFERENCES item(id),
  FOREIGN KEY (move1_id) REFERENCES move(id),
  FOREIGN KEY (move2_id) REFERENCES move(id),
  FOREIGN KEY (move3_id) REFERENCES move(id),
  FOREIGN KEY (move4_id) REFERENCES move(id),
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);*/
