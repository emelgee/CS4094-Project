const request = require("supertest");
const app = require("../server");
const db = require("../db");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

// ─── GET /api//moves ───────────────────────────────────────────────────

describe("GET /api/moves", () => {
  it("returns all moves ordered by id", async () => {
    const mockMoves = [
      { id: 1, name: "tackle", type: "normal", power: 40, accuracy: 100, pp: 35 },
      { id: 2, name: "growl", type: "normal", power: null, accuracy: 100, pp: 40 },
    ];
    db.pool.query.mockResolvedValueOnce([mockMoves]);

    const res = await request(app).get("/api/moves");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockMoves);
  });

  it("filters by search query", async () => {
    db.pool.query.mockResolvedValueOnce([[{ id: 1, name: "tackle" }]]);

    const res = await request(app).get("/api/moves?search=tac");

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("name LIKE ?"),
      expect.arrayContaining(["tac%"])
    );
  });

  it("filters by type", async () => {
    db.pool.query.mockResolvedValueOnce([[{ id: 10, name: "ember", type: "fire" }]]);

    const res = await request(app).get("/api/moves?type=fire");

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("type = ?"),
      expect.arrayContaining(["fire"])
    );
  });

  it("orders by power when orderBy=power", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    await request(app).get("/api/moves?orderBy=power");

    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY power DESC"),
      []
    );
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/moves");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/moves/:id ───────────────────────────────────────────────

describe("GET /api/moves/:id", () => {
  it("returns a single move by id", async () => {
    const mockMove = { id: 1, name: "tackle", type: "normal", power: 40 };
    db.pool.query.mockResolvedValueOnce([[mockMove]]);

    const res = await request(app).get("/api/moves/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockMove);
  });

  it("returns 404 when move is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/moves/999");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Move not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/moves/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});