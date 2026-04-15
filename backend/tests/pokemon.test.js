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

// ─── GET /api/pokemon/:id/moves ──────────────────────────────────────────

describe("GET /api/pokemon/:id/moves", () => {
  it("returns all moves a pokemon can learn", async () => {
    const mockPokemon = [{ id: 4, name: "charmander" }];
    const mockMoves = [
      {
        move_id: 10,
        move_name: "scratch",
        type: "normal",
        power: 40,
        accuracy: 100,
        pp: 35,
        learn_method: "level-up",
        level: 1,
      },
      {
        move_id: 52,
        move_name: "ember",
        type: "fire",
        power: 40,
        accuracy: 100,
        pp: 25,
        learn_method: "level-up",
        level: 7,
      },
    ];
    db.pool.query
      .mockResolvedValueOnce([mockPokemon])
      .mockResolvedValueOnce([mockMoves]);

    const res = await request(app).get("/api/pokemon/4/moves");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockMoves);
  });

  it("returns 404 when pokemon is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/pokemon/999/moves");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Pokemon not found" });
  });

  it("returns empty array when pokemon exists but has no moves", async () => {
    db.pool.query
      .mockResolvedValueOnce([[{ id: 4, name: "charmander" }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/pokemon/4/moves");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/pokemon/4/moves");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
