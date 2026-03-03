// backend/scripts/scrapePokemon.js

const BASE_URL = "https://pokeapi.co/api/v2/pokemon";

async function fetchPokemon(id) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`);
    const data = await res.json();

    return {
      name: data.name,
      hp: data.stats[0].base_stat,
      attack: data.stats[1].base_stat,
      defense: data.stats[2].base_stat,
      sp_attack: data.stats[3].base_stat,
      sp_defense: data.stats[4].base_stat,
      speed: data.stats[5].base_stat
    };

  } catch (err) {
    console.error(`Error fetching Pokémon ${id}`, err);
  }
}

async function run() {
  for (let i = 1; i <= 386; i++) { // Gen 1–3
    const pokemon = await fetchPokemon(i);
    console.log(pokemon);
  }
}

run();