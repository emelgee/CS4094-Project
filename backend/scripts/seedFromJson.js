const fs = require("fs/promises");
const path = require("path");
const { insertPokemon } = require("./insertPokemon");
const { insertMoves } = require("./insertMove");
const { closePool } = require("../db/connection");
const { waitForDatabase } = require("../db/waitForDatabase");

const BASE_PATH = path.join(__dirname, "../data");

async function readPokemonJson() {
  const INPUT_PATH = path.join(BASE_PATH, "/pokemon.json");
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("pokemon.json must contain an array.");
  }

  return parsed;
}

async function readMovesJson() {
  const INPUT_PATH = path.join(BASE_PATH, "/moves.json");
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("moves.json must contain an array.");
  }

  return parsed;
}

async function seedFromJson() {
  await waitForDatabase();

  const pokemon_rows = await readPokemonJson();
  await insertPokemon(pokemon_rows);
  console.log(`Inserted/updated ${pokemon_rows.length} Pokemon rows from JSON.`);

  const move_rows = await readMovesJson();
  await insertMoves(move_rows);
  console.log(`Inserted/updated ${move_rows.length} move rows from JSON.`);
}

if (require.main === module) {
  seedFromJson()
    .catch((error) => {
      console.error("Failed to seed from JSON:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}

module.exports = { seedFromJson };