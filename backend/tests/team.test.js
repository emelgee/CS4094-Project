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

const mockTeamMember = {
  user_id: TEST_USER_ID,
  pokemon_id: 4,
  nickname: "Charmy",
  level: 10,
  nature: "adamant",
  ability_id: null,
  team_slot: 1,
  location_id: null,
};

// ─── Auth required ────────────────────────────────────────────────────────────

describe("auth on /api/team", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/team");
    expect(res.statusCode).toBe(401);
  });
});

// ─── GET /api/team ────────────────────────────────────────────────────────────

describe("GET /api/team", () => {
  it("returns full team with pokemon and move data for the authed user", async () => {
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
        ability1: "blaze", ability2: null, ability_hidden: "solar-power",
        move1: "scratch", move2: "growl", move3: null, move4: null,
      },
    ];
    db.pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app)
      .get("/api/team")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockRows);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE e.user_id = ?"),
      [TEST_USER_ID]
    );
  });

  it("returns empty array when user has no team members", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get("/api/team")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("query includes caught and dead encounter status (PC box + graveyard)", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    await request(app).get("/api/team").set("Authorization", AUTH);

    const sql = db.pool.query.mock.calls[0][0];
    expect(sql).toMatch(/status IN \('caught', 'dead'\)/);
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get("/api/team")
      .set("Authorization", AUTH);

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

    const res = await request(app)
      .post("/api/team")
      .set("Authorization", AUTH)
      .send(mockTeamMember);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(mockInserted);
  });

  it("uses default values when optional fields are omitted", async () => {
    const minimal = { pokemon_id: 4 };
    db.pool.query
      .mockResolvedValueOnce([{ insertId: 2 }])
      .mockResolvedValueOnce([[{ id: 2, ...minimal, level: 5, nature: "hardy", team_slot: null }]]);

    const res = await request(app)
      .post("/api/team")
      .set("Authorization", AUTH)
      .send(minimal);

    expect(res.statusCode).toBe(201);

    // INSERT params: [user_id, pokemon_id, nickname, level, nature, ability_id, team_slot, location_id]
    const insertCall = db.pool.query.mock.calls[0][1];
    expect(insertCall[0]).toBe(TEST_USER_ID); // user_id from auth
    expect(insertCall[3]).toBe(5);            // default level
    expect(insertCall[4]).toBe("hardy");      // default nature
    expect(insertCall[6]).toBeNull();         // default team_slot
    expect(insertCall[7]).toBeNull();         // default location_id
  });

  it("returns 400 when pokemon_id is missing", async () => {
    const res = await request(app)
      .post("/api/team")
      .set("Authorization", AUTH)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "pokemon_id is required" });
  });

  it("returns 409 when team slot is already occupied", async () => {
    const dupError = new Error("Duplicate");
    dupError.code = "ER_DUP_ENTRY";
    db.pool.query.mockRejectedValueOnce(dupError);

    const res = await request(app)
      .post("/api/team")
      .set("Authorization", AUTH)
      .send(mockTeamMember);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: "That team slot is already occupied" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .post("/api/team")
      .set("Authorization", AUTH)
      .send(mockTeamMember);

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
      .set("Authorization", AUTH)
      .send({ team_slot: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE encounter SET team_slot = ? WHERE id = ? AND user_id = ?"),
      [2, "1", TEST_USER_ID]
    );
  });

  it("moves a pokemon to the PC box when team_slot is null", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .patch("/api/team/1/slot")
      .set("Authorization", AUTH)
      .send({ team_slot: null });

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE encounter SET team_slot = ? WHERE id = ? AND user_id = ?"),
      [null, "1", TEST_USER_ID]
    );
  });

  it("returns 404 when the encounter is not owned by the user", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .patch("/api/team/1/slot")
      .set("Authorization", AUTH)
      .send({ team_slot: 2 });

    expect(res.statusCode).toBe(404);
  });

  it("returns 409 when team slot is already occupied", async () => {
    const dupError = new Error("Duplicate");
    dupError.code = "ER_DUP_ENTRY";
    db.pool.query.mockRejectedValueOnce(dupError);

    const res = await request(app)
      .patch("/api/team/1/slot")
      .set("Authorization", AUTH)
      .send({ team_slot: 2 });

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: "That team slot is already occupied" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .patch("/api/team/1/slot")
      .set("Authorization", AUTH)
      .send({ team_slot: 2 });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── DELETE /api/team/:id ─────────────────────────────────────────────────────

describe("DELETE /api/team/:id", () => {
  it("releases a pokemon from the team", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete("/api/team/1")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM encounter WHERE id = ? AND user_id = ?"),
      ["1", TEST_USER_ID]
    );
  });

  it("returns 404 when pokemon not found or belongs to another user", async () => {
    db.pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .delete("/api/team/999")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Pokemon not found or does not belong to user" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .delete("/api/team/1")
      .set("Authorization", AUTH);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
