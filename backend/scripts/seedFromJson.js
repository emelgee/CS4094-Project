const fs = require("fs/promises");
const path = require("path");
const { insertPokemon } = require("./insertPokemon");
const { insertMoves } = require("./insertMove");
const { insertTrainers } = require("./insertTrainer");
const { closePool } = require("../db/connection");
const { waitForDatabase } = require("../db/waitForDatabase");
const { insertEncounterBasic } = require("./encounters");

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

async function readTrainerJson() {
  const INPUT_PATH = path.join(BASE_PATH, "/trainerData.json");
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.trainerList)) {
    throw new Error("trainerData.json must contain an object with trainerList array.");
  }

  return parsed.trainerList;
}

async function seedFromJson() {
  await waitForDatabase();

  const pokemon_rows = await readPokemonJson();
  await insertPokemon(pokemon_rows);
  console.log(`Inserted/updated ${pokemon_rows.length} Pokemon rows from JSON.`);

  const move_rows = await readMovesJson();
  await insertMoves(move_rows);
  console.log(`Inserted/updated ${move_rows.length} move rows from JSON.`);

  const trainer_rows = await readTrainerJson();
  await insertTrainers(trainer_rows);
  console.log(`Inserted/updated ${trainer_rows.length} trainer rows from JSON.`);

  //Test Encounters for Admin Account (REMOVE UPON DEPLOYING)
  await insertEncounterBasic(1, 258, "Littleroot Town", "Muddy", "Torrent", "Bold", "Alive", 11, 1);
  await insertEncounterBasic(1, 261, "Route 101", "Stitch", "Run Away", "Adamant", "Alive", 7, 2);
  await insertEncounterBasic(1, 263, "Route 102", "Ziggy", "Pickup", "Quiet", "Alive", 8, 3);
  await insertEncounterBasic(1, 278, "Route 103", "Bird", "Keen Eye", "Modest", "Alive", 9, 4);
  await insertEncounterBasic(1, 265, "Petalburg Woods", "Chud", "Shield Dust", "Adamant", "Alive", 1, null);
  console.log(`Inserted 5 encounters for Admin.`);
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