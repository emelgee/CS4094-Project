const request = require("supertest");
const app = require("../server");
const db = require("../db");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

const mockTeamMember = {
  user_id: 1,
  pokemon_id: 4,
  nickname: "Charmy",
  level: 10,
  nature: "adamant",
  ability: "blaze",
  slot: 0,
};

// ─── GET /api/team/:user_id ───────────────────────────────────────────────────

describe("GET /api/team/:user_id", () => {
  it("returns full team with pokemon and move data for a user", async () => {
    const mockRows = [
      {
        id: 1,
        ...mockTeamMember,
        pokemon_id: 4,
        name: "charmander",
        type1: "fire",
        type2: null,
        hp: 39, attack: 52, defense: 43,
        sp_attack: 60, sp_defense: 50, speed: 65,
        ability1: 66, ability2: null, ability_hidden: 94,
        move1: "scratch", move2: "growl", move3: null, move4: null,
      },
    ];
    db.pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get("/api/team/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockRows);
  });

  it("returns empty array when user has no team members", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/team/999");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/team/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── POST /api/team ───────────────────────────────────────────────────────────

describe("POST /api/team", () => {
  it("creates a team member and returns it with pokemon data", async () => {
    const mockInserted = {
      id: 1,
      ...mockTeamMember,
      name: "charmander",
      type1: "fire",
      type2: null,
    };
    db.pool.query
      .mockResolvedValueOnce([{ insertId: 1 }])
      .mockResolvedValueOnce([[mockInserted]]);

    const res = await request(app).post("/api/team").send(mockTeamMember);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(mockInserted);
  });

  it("uses default values when optional fields are omitted", async () => {
    const minimal = { user_id: 1, pokemon_id: 4 };
    db.pool.query
      .mockResolvedValueOnce([{ insertId: 2 }])
      .mockResolvedValueOnce([[{ id: 2, ...minimal, level: 5, nature: "hardy", slot: null }]]);

    const res = await request(app).post("/api/team").send(minimal);

    expect(res.statusCode).toBe(201);
    const insertCall = db.pool.query.mock.calls[0][1];
    expect(insertCall[3]).toBe(5);       // default level
    expect(insertCall[4]).toBe("hardy"); // default nature
    expect(insertCall[6]).toBeNull();    // default slot
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).post("/api/team").send(mockTeamMember);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── PATCH /api/team/:id/slot ─────────────────────────────────────────────────

describe("PATCH /api/team/:id/slot", () => {
  it("updates a pokemon slot in the party", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .patch("/api/team/1/slot")
      .send({ slot: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SET slot = ?"),
      [2, "1"]
    );
  });

  it("moves a pokemon to the PC box when slot is null", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .patch("/api/team/1/slot")
      .send({ slot: null });

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SET slot = ?"),
      [null, "1"]
    );
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .patch("/api/team/1/slot")
      .send({ slot: 0 });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── DELETE /api/team/:id ─────────────────────────────────────────────────────

describe("DELETE /api/team/:id", () => {
  it("releases a pokemon from the team", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete("/api/team/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).delete("/api/team/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
