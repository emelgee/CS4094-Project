const fs = require("fs/promises");
const path = require("path");
const { insertPokemon } = require("./insertPokemon");
const { insertMoves } = require("./insertMove");
const { insertTrainers } = require("./insertTrainer");
const { closePool } = require("../db/connection");
const { waitForDatabase } = require("../db/waitForDatabase");
const { insertItems } = require("./insertItem");
const { insertLocations } = require("./insertLocations");
const { insertPokemonMoves } = require("./insertLearnsets");
const { insertAbilities }    = require("./insertAbility");

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

async function readPokemonMovesJson() {
  const INPUT_PATH = path.join(BASE_PATH, "/learnsets.json");
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("learnsets.json must contain an array.");
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

async function readItemJson() {
  const INPUT_PATH = path.join(BASE_PATH, "/items.json");
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("items.json must contain an array.");
  }

  return parsed;
}

async function readAbilityJson() {
  const INPUT_PATH = path.join(BASE_PATH, "/abilities.json");
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("abilities.json must contain an array.");
  }

  return parsed;
}

async function readLocationJson() {
  const INPUT_PATH = path.join(BASE_PATH, "/location.json");
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("items.json must contain an array.");
  }

  return parsed;
}

async function seedFromJson() {
  await waitForDatabase();

  const ability_rows = await readAbilityJson();
  await insertAbilities(ability_rows);
  console.log(`Inserted/updated ${ability_rows.length} ability rows from JSON.`);

  const pokemon_rows = await readPokemonJson();
  await insertPokemon(pokemon_rows);
  console.log(`Inserted/updated ${pokemon_rows.length} Pokemon rows from JSON.`);

  const move_rows = await readMovesJson();
  await insertMoves(move_rows);
  console.log(`Inserted/updated ${move_rows.length} move rows from JSON.`);

  const pokemon_move_rows = await readPokemonMovesJson();
  await insertPokemonMoves(pokemon_move_rows);
  console.log(`Inserted/updated ${pokemon_move_rows.length} learnset rows from JSON.`);

  const trainer_rows = await readTrainerJson();
  await insertTrainers(trainer_rows);
  console.log(`Inserted/updated ${trainer_rows.length} trainer rows from JSON.`);

  const item_rows = await readItemJson();
  await insertItems(item_rows);
  console.log(`Inserted/updated ${item_rows.length} item rows from JSON.`);

  const location_rows = await readLocationJson();
  await insertLocations(location_rows);
  console.log(`Inserted/updated ${location_rows.length} location rows from JSON.`);
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