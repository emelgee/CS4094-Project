const BASE_URL = "https://pokeapi.co/api/v2/pokemon";
const fs = require("fs/promises");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "../data/learnsets.json");


async function fetchLearnset(id) {
  try {
    const pokeRes = await fetch(`${BASE_URL}/${id}`);

    if (!pokeRes.ok) throw new Error(`Pokemon HTTP ${pokeRes.status}`);

    const pokemon = await pokeRes.json();

    const poke_name  = pokemon.name;
    console.log("Scraping learnset from " + poke_name + ": " + id);
    const poke_moves = pokemon.moves;
    const learnset   = [];

    for (const move of poke_moves) {
        for (const detail of move.version_group_details)  {
            if (detail.version_group.name !== "emerald") continue;

            const move_name     = move.move.name;
            const learn_method  = detail.move_learn_method.name;
            const level_learned = detail.level_learned_at;
            learnset.push({
                move_name: move_name,
                learn_method: learn_method,
                level: level_learned
            })
        }
    }

    return {
      pokemon_id: id,
      pokemon_name: poke_name,
      learnset: learnset
    };
  } catch (err) {
    console.error(`Error fetching learnset of pokemon ${id}:`, err.message);
    return null;
  }
}

async function run() {
  const learnsetRows = [];

  for (let i = 1; i <= 386; i++) {
    const learnset = await fetchLearnset(i);
    if (learnset) {
      learnsetRows.push(learnset);
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(learnsetRows, null, 2), "utf8");
  console.log(`Saved ${learnsetRows.length} learnset records to ${OUTPUT_PATH}.`);
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Failed scraping learnsets:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { fetchLearnset, run };