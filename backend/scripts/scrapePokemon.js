const BASE_URL = "https://pokeapi.co/api/v2/pokemon";
const fs = require("fs/promises");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "../data/pokemon.json");

async function fetchPokemon(id) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const abilities = data.abilities || [];
    const normalAbilities = abilities
      .filter((entry) => !entry.is_hidden)
      .map((entry) => entry.ability?.name)
      .filter(Boolean);
    const hiddenAbility = abilities.find((entry) => entry.is_hidden)?.ability?.name || null;

    const types = (data.types || [])
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type?.name)
      .filter(Boolean);

    return {
      id: data.id,
      name: data.name,
      hp: data.stats[0].base_stat,
      attack: data.stats[1].base_stat,
      defense: data.stats[2].base_stat,
      sp_attack: data.stats[3].base_stat,
      sp_defense: data.stats[4].base_stat,
      speed: data.stats[5].base_stat,
      type1: types[0] || null,
      type2: types[1] || null,
      ability1: normalAbilities[0] || null,
      ability2: normalAbilities[1] || null,
      ability_hidden: hiddenAbility
    };
  } catch (err) {
    console.error(`Error fetching Pokemon ${id}:`, err.message);
    return null;
  }
}

async function run() {
  const pokemonRows = [];

  for (let i = 1; i <= 386; i++) {
    const pokemon = await fetchPokemon(i);
    if (pokemon) {
      pokemonRows.push(pokemon);
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(pokemonRows, null, 2), "utf8");
  console.log(`Saved ${pokemonRows.length} Pokemon records to ${OUTPUT_PATH}.`);
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Failed scraping Pokemon:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { fetchPokemon, run };