const request = require("supertest");
const app = require("../server");
const db = require("../db");
const { authHeader } = require("./helpers/authToken");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

const TEST_USER_ID = 1;
const AUTH = authHeader(TEST_USER_ID);

const mockEncounter = {
  user_id: TEST_USER_ID,
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

// ─── Auth required ────────────────────────────────────────────────────────────

describe("auth on /api/encounters", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/encounters");
    expect(res.statusCode).toBe(401);
  });
});

// ─── GET /api/encounters ──────────────────────────────────────────────────────

describe("GET /api/encounters", () => {
  it("returns all encounters for the authenticated user with pokemon info", async () => {
    const mockRows = [
      { ...mockEncounter, id: 1, pokemon_name: "charmander", type1: "fire", type2: null },
    ];
    db.pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app)
      .get("/api/encounters")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockRows);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("JOIN pokemon"),
      [TEST_USER_ID]
    );
  });

  it("returns empty array when user has no encounters", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get("/api/encounters")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get("/api/encounters")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/encounters/encounter/:id ────────────────────────────────────────

describe("GET /api/encounters/encounter/:id", () => {
  it("returns an encounter scoped to the authed user", async () => {
    const mockRow = { ...mockEncounter, id: 1, pokemon_name: "charmander", type1: "fire", type2: null };
    db.pool.query.mockResolvedValueOnce([[mockRow]]);

    const res = await request(app)
      .get("/api/encounters/encounter/1")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockRow);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("e.user_id = ?"),
      ["1", TEST_USER_ID]
    );
  });

  it("returns 404 when the encounter is missing or not owned", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get("/api/encounters/encounter/999")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(404);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get("/api/encounters/encounter/1")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── POST /api/encounters ─────────────────────────────────────────────────────

describe("POST /api/encounters", () => {
  it("creates a new encounter and returns the new id", async () => {
    db.pool.query.mockResolvedValueOnce([{ insertId: 42 }]);

    const res = await request(app)
      .post("/api/encounters")
      .set("Authorization", AUTH)
      .send(mockEncounter);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 42 });
  });

  it("uses the authed user id, ignoring user_id from the body", async () => {
    db.pool.query.mockResolvedValueOnce([{ insertId: 42 }]);

    await request(app)
      .post("/api/encounters")
      .set("Authorization", AUTH)
      .send({ ...mockEncounter, user_id: 9999 });

    const insertParams = db.pool.query.mock.calls[0][1];
    expect(insertParams[0]).toBe(TEST_USER_ID);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .post("/api/encounters")
      .set("Authorization", AUTH)
      .send(mockEncounter);

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
      .set("Authorization", AUTH)
      .send({ nickname: "Flamey", status: "caught" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Encounter updated" });
  });

  it("returns 400 when no valid fields are provided", async () => {
    const res = await request(app)
      .patch("/api/encounters/1")
      .set("Authorization", AUTH)
      .send({ invalid_field: "value" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "No valid fields provided" });
    expect(db.pool.query).not.toHaveBeenCalled();
  });

  it("returns 404 when encounter is not found or not owned", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .patch("/api/encounters/999")
      .set("Authorization", AUTH)
      .send({ nickname: "Ghost" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Encounter not found" });
  });

  it("only updates allowed fields, ignoring unknown ones", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app)
      .patch("/api/encounters/1")
      .set("Authorization", AUTH)
      .send({ nickname: "Flamey", hacked_field: "bad_value" });

    const callArgs = db.pool.query.mock.calls[0];
    expect(callArgs[0]).toContain("nickname");
    expect(callArgs[0]).not.toContain("hacked_field");
  });

  it("scopes the update to the authed user", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app)
      .patch("/api/encounters/1")
      .set("Authorization", AUTH)
      .send({ nickname: "Flamey" });

    const [sql, params] = db.pool.query.mock.calls[0];
    expect(sql).toMatch(/WHERE id = \? AND user_id = \?/);
    expect(params[params.length - 1]).toBe(TEST_USER_ID);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .patch("/api/encounters/1")
      .set("Authorization", AUTH)
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
      .set("Authorization", AUTH)
      .send(mockEncounter);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Encounter updated" });
    const [sql, params] = db.pool.query.mock.calls[0];
    expect(sql).toContain("level = ?");
    expect(params[4]).toBe(mockEncounter.level);
  });

  it("returns 404 when encounter is not found or not owned", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .put("/api/encounters/999")
      .set("Authorization", AUTH)
      .send(mockEncounter);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Encounter not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .put("/api/encounters/1")
      .set("Authorization", AUTH)
      .send(mockEncounter);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── DELETE /api/encounters/:id ───────────────────────────────────────────────

describe("DELETE /api/encounters/:id", () => {
  it("deletes an encounter and returns success message", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete("/api/encounters/1")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "Encounter deleted" });
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM encounter WHERE id = ? AND user_id = ?"),
      ["1", TEST_USER_ID]
    );
  });

  it("returns 404 when encounter is not found or not owned", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .delete("/api/encounters/999")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Encounter not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .delete("/api/encounters/1")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
