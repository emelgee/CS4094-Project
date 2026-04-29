const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../server");
const db = require("../db");
const { signToken } = require("../auth/middleware");

jest.mock("../db", () => ({
  pool: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));

// Factory for a fake transactional connection used by routes that call
// pool.getConnection() (currently only DELETE /api/auth/delete).
function mockConnection() {
  const conn = {
    query: jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
  };
  return conn;
}

afterEach(() => jest.clearAllMocks());

// ─── POST /api/auth/signup ───────────────────────────────────────────────────

describe("POST /api/auth/signup", () => {
  it("creates a user and returns a token + public user fields", async () => {
    db.pool.query.mockResolvedValueOnce([{ insertId: 7 }]);

    const res = await request(app).post("/api/auth/signup").send({
      username: "ash",
      email: "ash@example.com",
      password: "pikachu123",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toEqual({
      id: 7,
      username: "ash",
      email: "ash@example.com",
    });
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);

    const insertParams = db.pool.query.mock.calls[0][1];
    expect(insertParams[0]).toBe("ash");
    expect(insertParams[1]).toBe("ash@example.com");
    // password must be hashed, never stored plaintext
    expect(insertParams[2]).not.toBe("pikachu123");
  });

  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "ash" });
    expect(res.statusCode).toBe(400);
  });

  it("rejects short passwords", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      username: "ash",
      email: "ash@example.com",
      password: "short",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 409 on duplicate username/email", async () => {
    const err = new Error("dup");
    err.code = "ER_DUP_ENTRY";
    db.pool.query.mockRejectedValueOnce(err);

    const res = await request(app).post("/api/auth/signup").send({
      username: "ash",
      email: "ash@example.com",
      password: "pikachu123",
    });
    expect(res.statusCode).toBe(409);
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns a token when credentials match", async () => {
    const hash = await bcrypt.hash("pikachu123", 4);
    db.pool.query.mockResolvedValueOnce([
      [{ id: 7, username: "ash", email: "ash@example.com", password_hash: hash }],
    ]);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "ash", password: "pikachu123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      username: "ash",
      email: "ash@example.com",
    });
    expect(typeof res.body.token).toBe("string");
  });

  it("rejects unknown users", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "nope", password: "whatever1" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects bad passwords", async () => {
    const hash = await bcrypt.hash("pikachu123", 4);
    db.pool.query.mockResolvedValueOnce([
      [{ id: 7, username: "ash", email: "ash@example.com", password_hash: hash }],
    ]);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "ash", password: "wrongpass" });
    expect(res.statusCode).toBe(401);
  });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns the user identified by the token", async () => {
    db.pool.query.mockResolvedValueOnce([
      [{ id: 7, username: "ash", email: "ash@example.com" }],
    ]);

    const token = signToken({ sub: 7, username: "ash" });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      username: "ash",
      email: "ash@example.com",
    });
  });

  it("rejects when no token is supplied", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
  });
});

// ─── DELETE /api/auth/delete ─────────────────────────────────────────────────

describe("DELETE /api/auth/delete", () => {
  const TEST_USER_ID = 7;
  const authHeader = `Bearer ${signToken({ sub: TEST_USER_ID, username: "ash" })}`;

  it("returns 401 without a token", async () => {
    const res = await request(app).delete("/api/auth/delete");
    expect(res.statusCode).toBe(401);
    expect(db.pool.getConnection).not.toHaveBeenCalled();
  });

  it("deletes the user's encounters then the user, in a transaction", async () => {
    const conn = mockConnection();
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 3 }]) // DELETE FROM encounter
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE FROM users
    db.pool.getConnection.mockResolvedValueOnce(conn);

    const res = await request(app)
      .delete("/api/auth/delete")
      .set("Authorization", authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });

    // Encounters cleared first, scoped by user_id
    expect(conn.query).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM encounter WHERE user_id = ?",
      [TEST_USER_ID]
    );
    // Then the user row, scoped by id
    expect(conn.query).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM users WHERE id = ?",
      [TEST_USER_ID]
    );

    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("returns 404 and rolls back when the user no longer exists", async () => {
    const conn = mockConnection();
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 0 }]) // no encounters
      .mockResolvedValueOnce([{ affectedRows: 0 }]); // user already gone
    db.pool.getConnection.mockResolvedValueOnce(conn);

    const res = await request(app)
      .delete("/api/auth/delete")
      .set("Authorization", authHeader);

    expect(res.statusCode).toBe(404);
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and returns 500 if a query fails", async () => {
    const conn = mockConnection();
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 2 }])
      .mockRejectedValueOnce(new Error("DB down"));
    db.pool.getConnection.mockResolvedValueOnce(conn);

    const res = await request(app)
      .delete("/api/auth/delete")
      .set("Authorization", authHeader);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
});
