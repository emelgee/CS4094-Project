const fs = require("fs/promises");
const path = require("path");

const SPECIES_BASE = "https://pokeapi.co/api/v2/pokemon-species";
const OUTPUT_PATH = path.join(__dirname, "../data/evolutions.json");

// Extract the numeric species ID from a PokeAPI species URL
// e.g. "https://pokeapi.co/api/v2/pokemon-species/2/" → 2
function speciesIdFromUrl(url) {
  const match = (url || "").match(/\/pokemon-species\/(\d+)\//);
  return match ? parseInt(match[1], 10) : null;
}

// Recursively walk an evolution-chain node and collect (from → to) edges.
// Only keeps edges where both IDs are within the Gen 1-3 Pokédex (≤ 386).
function walkChain(node, results = []) {
  const fromId = speciesIdFromUrl(node.species?.url);

  for (const next of (node.evolves_to || [])) {
    const toId = speciesIdFromUrl(next.species?.url);

    if (fromId && toId && fromId <= 386 && toId <= 386) {
      const details = next.evolution_details || [];
      if (details.length > 0) {
        for (const d of details) {
          results.push({
            from_pokemon_id: fromId,
            to_pokemon_id:   toId,
            trigger:   d.trigger?.name  ?? null,
            min_level: d.min_level      ?? null,
            item:      d.item?.name     ?? null,
          });
        }
      } else {
        // Defensive: no details recorded
        results.push({ from_pokemon_id: fromId, to_pokemon_id: toId, trigger: null, min_level: null, item: null });
      }
    }

    walkChain(next, results);
  }

  return results;
}

async function run() {
  // ── Step 1: fetch all 386 species to collect unique evolution-chain URLs ──
  const chainUrls = new Set();
  console.log("Fetching species 1–386 to collect evolution chain URLs…");

  for (let i = 1; i <= 386; i++) {
    try {
      const res = await fetch(`${SPECIES_BASE}/${i}`);
      if (!res.ok) { console.warn(`  Species ${i}: HTTP ${res.status}`); continue; }
      const data = await res.json();
      if (data.evolution_chain?.url) chainUrls.add(data.evolution_chain.url);
    } catch (err) {
      console.error(`  Species ${i}: ${err.message}`);
    }
    if (i % 50 === 0) console.log(`  … ${i}/386`);
  }

  console.log(`Found ${chainUrls.size} unique evolution chains. Fetching chains…`);

  // ── Step 2: fetch each chain and walk it ──
  // De-duplicate on (from, to) — keeps the first trigger seen if multiple exist
  const seen = new Set();
  const allEvolutions = [];

  for (const url of chainUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) { console.warn(`  Chain ${url}: HTTP ${res.status}`); continue; }
      const data = await res.json();
      const edges = walkChain(data.chain);

      for (const edge of edges) {
        const key = `${edge.from_pokemon_id}-${edge.to_pokemon_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          allEvolutions.push(edge);
        }
      }
    } catch (err) {
      console.error(`  Chain ${url}: ${err.message}`);
    }
  }

  allEvolutions.sort((a, b) => a.from_pokemon_id - b.from_pokemon_id || a.to_pokemon_id - b.to_pokemon_id);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(allEvolutions, null, 2), "utf8");
  console.log(`Saved ${allEvolutions.length} evolution edges to ${OUTPUT_PATH}`);
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Scraping evolutions failed:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { run };
