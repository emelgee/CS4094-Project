const request = require("supertest");
const app = require("../server");
const db = require("../db");

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

// ─── GET /api/items ───────────────────────────────────────────────────────────

describe("GET /api/items", () => {
  it("returns all items ordered by name", async () => {
    const mockItems = [
      { id: 1, name: "potion", category: "medicine", effect: "Restores 20 HP." },
      { id: 2, name: "revive", category: "medicine", effect: "Revives a fainted pokemon." },
    ];
    db.pool.query.mockResolvedValueOnce([mockItems]);

    const res = await request(app).get("/api/items");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockItems);
    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM item ORDER BY name ASC",
      []
    );
  });

  it("filters by search query when provided", async () => {
    db.pool.query.mockResolvedValueOnce([[{ id: 1, name: "potion" }]]);

    const res = await request(app).get("/api/items?search=pot");

    expect(res.statusCode).toBe(200);
    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM item WHERE name LIKE ? ORDER BY name ASC",
      ["pot%"]
    );
  });

  it("ignores whitespace-only search param", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    await request(app).get("/api/items?search=   ");

    expect(db.pool.query).toHaveBeenCalledWith(
      "SELECT * FROM item ORDER BY name ASC",
      []
    );
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/items");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});

// ─── GET /api/items/:id ───────────────────────────────────────────────────────

describe("GET /api/items/:id", () => {
  it("returns a single item by id", async () => {
    const mockItem = { id: 1, name: "potion", category: "medicine", effect: "Restores 20 HP." };
    db.pool.query.mockResolvedValueOnce([[mockItem]]);

    const res = await request(app).get("/api/items/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockItem);
  });

  it("returns 404 when item is not found", async () => {
    db.pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/items/999");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Item not found" });
  });

  it("returns 500 on database error", async () => {
    db.pool.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/items/1");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Database error" });
  });
});
