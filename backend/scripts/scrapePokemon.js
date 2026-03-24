const BASE_URL = "https://pokeapi.co/api/v2/pokemon";
const SPECIES_URL = "https://pokeapi.co/api/v2/pokemon-species";
const fs = require("fs/promises");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "../data/pokemon.json");

// Generation order for past_types / past_abilities resolution
const GENERATION_ORDER = [
  "generation-i", "generation-ii", "generation-iii",
  "generation-iv", "generation-v", "generation-vi",
  "generation-vii", "generation-viii", "generation-ix",
];

const POST_GEN3_GENERATIONS = new Set([
  "generation-iv", "generation-v", "generation-vi",
  "generation-vii", "generation-viii", "generation-ix",
]);

function generationIndex(name) {
  const idx = GENERATION_ORDER.indexOf(name);
  return idx === -1 ? 999 : idx;
}

/**
 * Stats are stored in past_stats as { generation, stats[] }.
 * Each stat entry has { base_stat, stat: { name } }.
 * Find the earliest post-Gen3 generation entry that contains the stat we want
 * — its base_stat is what was active in Gen 3.
 */
function resolveGen3Stat(pastStats, statName, currentValue) {
  // Gather all post-Gen3 entries that include this specific stat
  const postGen3Entries = (pastStats || [])
    .filter((ps) => POST_GEN3_GENERATIONS.has(ps.generation?.name))
    .sort((a, b) => generationIndex(a.generation.name) - generationIndex(b.generation.name));

  for (const entry of postGen3Entries) {
    const statEntry = (entry.stats || []).find((s) => s.stat?.name === statName);
    if (statEntry !== undefined) {
      return statEntry.base_stat;
    }
  }

  return currentValue;
}

/**
 * Types are stored in past_types as { generation, types[] }.
 * Find the earliest post-Gen3 generation entry — those types are what Gen 3 had.
 */
function resolveGen3Types(pastTypes, currentTypes) {
  const postGen3Entries = (pastTypes || [])
    .filter((pt) => POST_GEN3_GENERATIONS.has(pt.generation?.name))
    .sort((a, b) => generationIndex(a.generation.name) - generationIndex(b.generation.name));

  if (postGen3Entries.length > 0) {
    return postGen3Entries[0].types
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type?.name)
      .filter(Boolean);
  }

  return currentTypes;
}

/**
 * Abilities are stored in past_abilities on the SPECIES endpoint as { generation, abilities[] }.
 * Each ability entry has { ability, is_hidden, slot }. Hideen abilities didnt exist until Gen V,
 * so always null.
 */
function resolveGen3Abilities(pastAbilities, currentAbilities) {
  const postGen3Entries = (pastAbilities || [])
    .filter((pa) => POST_GEN3_GENERATIONS.has(pa.generation?.name))
    .sort((a, b) => generationIndex(a.generation.name) - generationIndex(b.generation.name));

  const abilityList = postGen3Entries.length > 0
    ? postGen3Entries[0].abilities
    : currentAbilities;

  const normal = abilityList
    .filter((entry) => !entry.is_hidden)
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => entry.ability?.name)
    .filter(Boolean);

  return {
    ability1: normal[0] || null,
    ability2: normal[1] || null,
    ability_hidden: null, // Hidden abilities did not exist in Gen 3
  };
}

async function fetchPokemon(id) {
  try {
    const [pokeRes, speciesRes] = await Promise.all([
      fetch(`${BASE_URL}/${id}`),
      fetch(`${SPECIES_URL}/${id}`),
    ]);

    if (!pokeRes.ok) throw new Error(`Pokemon HTTP ${pokeRes.status}`);
    if (!speciesRes.ok) throw new Error(`Species HTTP ${speciesRes.status}`);

    const [data, species] = await Promise.all([pokeRes.json(), speciesRes.json()]);

    // Resolve stats via past_values
    const pastStats = data.past_stats || [];
    const hp         = resolveGen3Stat(pastStats, "hp",              data.stats[0].base_stat);
    const attack     = resolveGen3Stat(pastStats, "attack",          data.stats[1].base_stat);
    const defense    = resolveGen3Stat(pastStats, "defense",         data.stats[2].base_stat);
    const sp_attack  = resolveGen3Stat(pastStats, "special-attack",  data.stats[3].base_stat);
    const sp_defense = resolveGen3Stat(pastStats, "special-defense", data.stats[4].base_stat);
    const speed      = resolveGen3Stat(pastStats, "speed",           data.stats[5].base_stat);

    // Resolve types via past_types on the pokemon endpoint
    const currentTypes = (data.types || [])
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type?.name)
      .filter(Boolean);
    const types = resolveGen3Types(data.past_types || [], currentTypes);

    // Resolve abilities via past_abilities on the species endpoint
    const { ability1, ability2, ability_hidden } = resolveGen3Abilities(
      species.past_abilities || [],
      data.abilities || []
    );

    return {
      id: data.id,
      name: data.name,
      hp,
      attack,
      defense,
      sp_attack,
      sp_defense,
      speed,
      type1: types[0] || null,
      type2: types[1] || null,
      ability1,
      ability2,
      ability_hidden,
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