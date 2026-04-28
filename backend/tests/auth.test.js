const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../server");
const db = require("../db");
const { signToken } = require("../auth/middleware");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

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
