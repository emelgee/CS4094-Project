const request = require("supertest");
const app = require("../server");
const db = require("../db");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

const mockEncounter = {
  user_id: 1,
  pokemon_id: 4,
  location: "Viridian Forest",
  nickname: "Charmy",
  ability: "blaze",
  nature: "adamant",
  level: 10,
  hp_iv: 31, attack_iv: 31, defense_iv: 31,
  sp_attack_iv: 31, sp_defense_iv: 31, speed_iv: 31,
  hp_ev: 0, attack_ev: 0, defense_ev: 0,
  sp_attack_ev: 0, sp_defense_ev: 0, speed_ev: 0,
  move1_id: 1, move2_id: null, move3_id: null, move4_id: null,
  item_id: null,
  status: null,
};

// ─── GET /api/encounters/:user_id ─────────────────────────────────────────────

describe("GET /api/encounters/:user_id", () => {
  it("returns all encounters for a user with pokemon info", async () => {
    const mockRows = [
      { ...mockEncounter, id: 1, pokemon_name: "charmander", type1: "fire", type2: null },
    ];
    db.pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get("/api/encounters/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockRows);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("JOIN pokemon"),
      ["1"]  // CHANGE MAYBE SOON WHEN IMPLEEMNTING USER
    );
  });

  it("returns empty array when user has no encounters", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/encounters/999");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/encounters/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/encounters/encounter/:id ─────────────────────────────────────────────

describe("GET /api/encounters/encounter/:id", () => {
  it("returns an encounter based on given encounter id", async () => {
    const mockJson = 
      { ...mockEncounter, id: 1, pokemon_name: "charmander", type1: "fire", type2: null }
    ;
    db.pool.query.mockResolvedValueOnce([mockJson]);

    const res = await request(app).get("/api/encounters/encounter/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockJson);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("JOIN pokemon"),
      ["1"]
    );
  });

  it("returns empty array when user has no encounters", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/encounters/999");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/encounters/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── POST /api/encounters ─────────────────────────────────────────────────────

describe("POST /api/encounters", () => {
  it("creates a new encounter and returns the new id", async () => {
    db.pool.query.mockResolvedValueOnce([{ insertId: 42 }]);

    const res = await request(app).post("/api/encounters").send(mockEncounter);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 42 });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).post("/api/encounters").send(mockEncounter);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── PATCH /api/encounters/:id ────────────────────────────────────────────────

describe("PATCH /api/encounters/:id", () => {
  it("updates valid fields and returns success message", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .patch("/api/encounters/1")
      .send({ nickname: "Flamey", status: "caught" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Encounter updated" });
  });

  it("returns 400 when no valid fields are provided", async () => {
    const res = await request(app)
      .patch("/api/encounters/1")
      .send({ invalid_field: "value" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "No valid fields provided" });
    expect(db.pool.query).not.toHaveBeenCalled();
  });

  it("returns 404 when encounter is not found", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .patch("/api/encounters/999")
      .send({ nickname: "Ghost" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Encounter not found" });
  });

  it("only updates allowed fields, ignoring unknown ones", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app)
      .patch("/api/encounters/1")
      .send({ nickname: "Flamey", hacked_field: "bad_value" });

    const callArgs = db.pool.query.mock.calls[0];
    expect(callArgs[0]).toContain("nickname");
    expect(callArgs[0]).not.toContain("hacked_field");
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .patch("/api/encounters/1")
      .send({ nickname: "Flamey" });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── PUT /api/encounters/:id ──────────────────────────────────────────────────

describe("PUT /api/encounters/:id", () => {
  it("fully updates an encounter and returns success message", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .put("/api/encounters/1")
      .send(mockEncounter);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Encounter updated" });
  });

  it("returns 404 when encounter is not found", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .put("/api/encounters/999")
      .send(mockEncounter);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Encounter not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).put("/api/encounters/1").send(mockEncounter);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── DELETE /api/encounters/:id ───────────────────────────────────────────────

describe("DELETE /api/encounters/:id", () => {
  it("deletes an encounter and returns success message", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete("/api/encounters/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Encounter deleted" });
  });

  it("returns 404 when encounter is not found", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app).delete("/api/encounters/999");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Encounter not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).delete("/api/encounters/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
