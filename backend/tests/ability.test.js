const request = require("supertest");
const app = require("../server");
const db = require("../db");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

// ─── GET /api/abilities ───────────────────────────────────────────────────────

describe("GET /api/abilities", () => {
  it("returns all abilities ordered by name", async () => {
    const mockAbilities = [
      { id: 1, name: "blaze", effect: "Powers up Fire moves." },
      { id: 2, name: "overgrow", effect: "Powers up Grass moves." },
    ];
    db.pool.query.mockResolvedValueOnce([mockAbilities]);

    const res = await request(app).get("/api/abilities");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockAbilities);
    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM ability ORDER BY name ASC",
      []
    );
  });

  it("filters by search query when provided", async () => {
    db.pool.query.mockResolvedValueOnce([[{ id: 1, name: "blaze" }]]);

    const res = await request(app).get("/api/abilities?search=bla");

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM ability WHERE name LIKE ? ORDER BY name ASC",
      ["bla%"]
    );
  });

  it("ignores whitespace-only search param", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    await request(app).get("/api/abilities?search=   ");

    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM ability ORDER BY name ASC",
      []
    );
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/abilities");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/abilities/:id ───────────────────────────────────────────────────

describe("GET /api/abilities/:id", () => {
  it("returns a single ability by id", async () => {
    const mockAbility = { id: 1, name: "blaze", effect: "Powers up Fire moves." };
    db.pool.query.mockResolvedValueOnce([[mockAbility]]);

    const res = await request(app).get("/api/abilities/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockAbility);
  });

  it("returns 404 when ability is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/abilities/999");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Ability not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/abilities/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/abilities/:id/pokemon ──────────────────────────────────────────

describe("GET /api/abilities/:id/pokemon", () => {
  it("returns pokemon that have the given ability", async () => {
    const mockPokemon = [
      { id: 4, name: "charmander", ability1: 66, ability2: null, ability_hidden: 18 },
      { id: 6, name: "charizard", ability1: 66, ability2: null, ability_hidden: 94 },
    ];
    db.pool.query.mockResolvedValueOnce([mockPokemon]);

    const res = await request(app).get("/api/abilities/66/pokemon");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockPokemon);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ability1 = ?"),
      ["66", "66", "66"]  // strings, not numbers
    );
  });

  it("returns 404 when no pokemon have the ability", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/abilities/999/pokemon");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "No pokemon found with that ability" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/abilities/1/pokemon");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
