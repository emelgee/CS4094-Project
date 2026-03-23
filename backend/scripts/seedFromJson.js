const fs = require("fs/promises");
const path = require("path");
const { insertPokemon } = require("./insertPokemon");
const { closePool } = require("../db/connection");
const { waitForDatabase } = require("../db/waitForDatabase");

const INPUT_PATH = path.join(__dirname, "../data/pokemon.json");

async function readPokemonJson() {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("pokemon.json must contain an array.");
  }

  return parsed;
}

async function seedFromJson() {
  await waitForDatabase();
  const rows = await readPokemonJson();
  await insertPokemon(rows);
  console.log(`Inserted/updated ${rows.length} Pokemon rows from JSON.`);
}

if (require.main === module) {
  seedFromJson()
    .catch((error) => {
      console.error("Failed to seed pokemon from JSON:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}

module.exports = { seedFromJson };
