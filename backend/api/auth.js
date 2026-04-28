const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../db");
const { signToken, requireAuth } = require("../auth/middleware");

const SALT_ROUNDS = 10;

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, username: row.username, email: row.email };
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "username, email and password are required" });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error:
          "username must be 3-50 chars, letters/numbers/._- only",
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "invalid email" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    let result;
    try {
      [result] = await db.pool.query(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        [username, email, password_hash]
      );
    } catch (err) {
      if (err && err.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ error: "username or email already in use" });
      }
      throw err;
    }

    const user = { id: result.insertId, username, email };
    const token = signToken({ sub: user.id, username: user.username });

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("POST /api/auth/signup error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, username, email, password } = req.body || {};
    const ident = identifier || username || email;

    if (!ident || !password) {
      return res
        .status(400)
        .json({ error: "username/email and password are required" });
    }

    const [rows] = await db.pool.query(
      "SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ? LIMIT 1",
      [ident, ident]
    );
    const row = rows[0];
    if (!row) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ sub: row.id, username: row.username });
    return res.json({ token, user: publicUser(row) });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/auth/me — returns the currently-authenticated user
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      "SELECT id, username, email FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
