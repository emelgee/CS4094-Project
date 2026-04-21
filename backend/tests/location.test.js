const request = require("supertest");
const app = require("../server");
const db = require("../db");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

// ─── GET /api/locations ───────────────────────────────────────────────────────

describe("GET /api/locations", () => {
  it("returns all locations without areas by default", async () => {
    const mockLocations = [
      { id: 1, name: "Pallet Town" },
      { id: 2, name: "Viridian City" },
    ];
    db.pool.query.mockResolvedValueOnce([mockLocations]);

    const res = await request(app).get("/api/locations");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockLocations);
    expect(db.pool.query).toHaveBeenCalledTimes(1);
  });

  it("returns locations with nested areas when include_areas=true", async () => {
    const mockLocations = [
      { id: 1, name: "Viridian Forest" },
    ];
    const mockAreas = [
      { id: 1, loc_id: 1, name: "Viridian Forest North" },
      { id: 2, loc_id: 1, name: "Viridian Forest South" },
    ];
    db.pool.query
      .mockResolvedValueOnce([mockLocations])
      .mockResolvedValueOnce([mockAreas]);

    const res = await request(app).get("/api/locations?include_areas=true");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([
      {
        id: 1,
        name: "Viridian Forest",
        areas: [
          { id: 1, loc_id: 1, name: "Viridian Forest North" },
          { id: 2, loc_id: 1, name: "Viridian Forest South" },
        ],
      },
    ]);
    expect(db.pool.query).toHaveBeenCalledTimes(2);
  });

  it("correctly assigns areas to their parent locations", async () => {
    const mockLocations = [
      { id: 1, name: "Viridian Forest" },
      { id: 2, name: "Mt. Moon" },
    ];
    const mockAreas = [
      { id: 1, loc_id: 1, name: "Viridian Forest North" },
      { id: 2, loc_id: 2, name: "Mt. Moon B1F" },
      { id: 3, loc_id: 2, name: "Mt. Moon B2F" },
    ];
    db.pool.query
      .mockResolvedValueOnce([mockLocations])
      .mockResolvedValueOnce([mockAreas]);

    const res = await request(app).get("/api/locations?include_areas=true");

    expect(res.body[0].areas).toHaveLength(1);
    expect(res.body[1].areas).toHaveLength(2);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/locations");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/locations/:id/encounters ───────────────────────────────────────

describe("GET /api/locations/:id/encounters", () => {
  it("returns all encounters for a location grouped by area", async () => {
    const mockLocation = [{ id: 1, name: "Viridian Forest" }];
    const mockEncounters = [
      {
        encounter_id: 1,
        encounter_rate: 20,
        encounter_method: "grass",
        min_level: 3,
        max_level: 5,
        area_id: 1,
        area_name: "Viridian Forest North",
        pokemon_id: 10,
        pokemon_name: "caterpie",
      },
      {
        encounter_id: 2,
        encounter_rate: 15,
        encounter_method: "grass",
        min_level: 3,
        max_level: 5,
        area_id: 1,
        area_name: "Viridian Forest North",
        pokemon_id: 13,
        pokemon_name: "weedle",
      },
    ];
    db.pool.query
      .mockResolvedValueOnce([mockLocation])
      .mockResolvedValueOnce([mockEncounters]);

    const res = await request(app).get("/api/locations/1/encounters");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockEncounters);
  });

  it("returns 404 when location is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/locations/999/encounters");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Location not found" });
  });

  it("returns empty array when location exists but has no encounters", async () => {
    db.pool.query
      .mockResolvedValueOnce([[{ id: 1, name: "Pallet Town" }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/locations/1/encounters");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/locations/1/encounters");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
