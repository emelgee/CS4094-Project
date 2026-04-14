const request = require("supertest");
const app = require("../server");
const db = require("../db");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

// ─── GET /api/pokemon ─────────────────────────────────────────────────────────

describe("GET /api/pokemon", () => {
  it("returns all pokemon ordered by id", async () => {
    const mockPokemon = [
      { id: 1, name: "bulbasaur", type1: "grass", type2: "poison" },
      { id: 4, name: "charmander", type1: "fire", type2: null },
    ];
    db.pool.query.mockResolvedValueOnce([mockPokemon]);

    const res = await request(app).get("/api/pokemon");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockPokemon);
    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM pokemon ORDER BY id ASC",
      []
    );
  });

  it("filters by search query when provided", async () => {
    db.pool.query.mockResolvedValueOnce([[{ id: 1, name: "bulbasaur" }]]);

    const res = await request(app).get("/api/pokemon?search=bulb");

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM pokemon WHERE name LIKE ? ORDER BY id ASC",
      ["bulb%"]
    );
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/pokemon");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/pokemon/:id ─────────────────────────────────────────────────────

describe("GET /api/pokemon/:id", () => {
  it("returns a single pokemon by id", async () => {
    const mockPokemon = { id: 1, name: "bulbasaur", type1: "grass", type2: "poison" };
    db.pool.query.mockResolvedValueOnce([[mockPokemon]]);

    const res = await request(app).get("/api/pokemon/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockPokemon);
  });

  it("returns 404 when pokemon is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/pokemon/999");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/pokemon/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/pokemon/moves ───────────────────────────────────────────────────

describe("GET /api/pokemon/moves", () => {
  it("returns all moves ordered by id", async () => {
    const mockMoves = [
      { id: 1, name: "tackle", type: "normal", power: 40, accuracy: 100, pp: 35 },
      { id: 2, name: "growl", type: "normal", power: null, accuracy: 100, pp: 40 },
    ];
    db.pool.query.mockResolvedValueOnce([mockMoves]);

    const res = await request(app).get("/api/pokemon/moves");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockMoves);
  });

  it("filters by search query", async () => {
    db.pool.query.mockResolvedValueOnce([[{ id: 1, name: "tackle" }]]);

    const res = await request(app).get("/api/pokemon/moves?search=tac");

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("name LIKE ?"),
      expect.arrayContaining(["tac%"])
    );
  });

  it("filters by type", async () => {
    db.pool.query.mockResolvedValueOnce([[{ id: 10, name: "ember", type: "fire" }]]);

    const res = await request(app).get("/api/pokemon/moves?type=fire");

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("type = ?"),
      expect.arrayContaining(["fire"])
    );
  });

  it("orders by power when orderBy=power", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    await request(app).get("/api/pokemon/moves?orderBy=power");

    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY power DESC"),
      []
    );
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/pokemon/moves");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/pokemon/moves/:id ───────────────────────────────────────────────

describe("GET /api/pokemon/moves/:id", () => {
  it("returns a single move by id", async () => {
    const mockMove = { id: 1, name: "tackle", type: "normal", power: 40 };
    db.pool.query.mockResolvedValueOnce([[mockMove]]);

    const res = await request(app).get("/api/pokemon/moves/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockMove);
  });

  it("returns 404 when move is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/pokemon/moves/999");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Move not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/pokemon/moves/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/pokemon/:id/locations ──────────────────────────────────────────

describe("GET /api/pokemon/:id/locations", () => {
  it("returns all locations where the pokemon can be found", async () => {
    const mockPokemon = [{ id: 10, name: "caterpie" }];
    const mockLocations = [
      {
        location_id: 1,
        location_name: "Viridian Forest",
        area_id: 1,
        area_name: "Viridian Forest North",
        encounter_rate: 20,
        encounter_method: "grass",
        min_level: 3,
        max_level: 5,
      },
    ];
    db.pool.query
      .mockResolvedValueOnce([mockPokemon])
      .mockResolvedValueOnce([mockLocations]);

    const res = await request(app).get("/api/pokemon/10/locations");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockLocations);
  });

  it("returns 404 when pokemon is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/pokemon/999/locations");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Pokemon not found" });
  });

  it("returns empty array when pokemon exists but has no encounter locations", async () => {
    db.pool.query
      .mockResolvedValueOnce([[{ id: 1, name: "bulbasaur" }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/pokemon/1/locations");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/pokemon/1/locations");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
