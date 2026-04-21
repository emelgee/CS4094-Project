const BASE_URL = "https://pokeapi.co/api/v2/item";
const fs = require("fs/promises");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "../data/items.json");

const VERSION_GROUP_ORDER = [
  "red-blue", "yellow", "gold-silver", "crystal",
  "ruby-sapphire", "emerald", "firered-leafgreen", "colosseum", "xd",
  "diamond-pearl", "platinum", "heartgold-soulsilver", "black-white",
  "black-2-white-2", "x-y", "omega-ruby-alpha-sapphire", "sun-moon",
  "ultra-sun-ultra-moon", "sword-shield", "scarlet-violet",
];

const GEN3_LAST_INDEX = VERSION_GROUP_ORDER.indexOf("xd"); // index 8
const PRE_GEN4_VERSION_GROUPS = new Set(VERSION_GROUP_ORDER.slice(0, GEN3_LAST_INDEX + 1));

// PokeAPI item categories that have battle relevance
const BATTLE_CATEGORIES = new Set([
  "stat-boosts",      // X Attack, X Defend, etc.
  "effort-drop",      // EV-reducing berries used in battle
  "other",            // includes many hold items
  "in-a-pinch",       // Sitrus, Oran, Figy, etc. — pinch berries
  "picky-healing",    // flavour berries (Persim, Rawst, etc.)
  "type-protection",  // type-resist berries
  "vitamins",         // Protein, Iron, etc. — raise EVs; battle-relevant
  "held-items",       // Leftovers, Shell Bell, Choice items, etc.
  "choice",           // Choice Band, etc.
  "effort-training",  // PP Up, etc.
  "bad-held-items",   // Flame Orb, Toxic Orb, Iron Ball, etc.
  "status-cures",     // Antidote, Awakening, etc.
  "plates",           // Arceus type plates
  "species-specific", // evolution / form items used as held items
  "type-enhancement", // Charcoal, Mystic Water, etc.
]);

// Categories we explicitly want to EXCLUDE
const SKIP_CATEGORIES = new Set([
  "standard-balls", "special-balls", "apricorn-balls", "apricorn-box",
  "data-cards", "jewels", "miracle-shooter", "mega-stones",
  "memories", "z-crystals", "curry-ingredients", "nature",
  "tera-shard", "baking-only", "collectibles", "loot", "all-mail",
  "mulch", "dex-completion", "scarves", "event-items", "gameplay",
  "plot-advancement", "unused", "flutes", "medicine", "revival",
  "pp-recovery", "training",
]);

function versionGroupIndex(name) {
  const idx = VERSION_GROUP_ORDER.indexOf(name);
  return idx === -1 ? 999 : idx;
}

/**
 * Items don't have past_values like moves do, but their flavor text and
 * effect entries can vary. We pick the most recent Gen 3 flavor text and
 * use the current effect entry (PokeAPI doesn't track historical item effects).
 */
function resolveGen3FlavorText(flavorTextEntries) {
  return (flavorTextEntries || [])
    .filter(
      (f) =>
        f.language?.name === "en" &&
        PRE_GEN4_VERSION_GROUPS.has(f.version_group?.name)
    )
    .sort(
      (a, b) =>
        versionGroupIndex(b.version_group.name) -
        versionGroupIndex(a.version_group.name)
    )
    .map((f) => f.text?.replace(/\n|\f/g, " "))
    .find(Boolean) ?? null;
}

function hasBattleEffect(data) {
  const category = data.category?.name;
  if (!category) return false;
  if (SKIP_CATEGORIES.has(category)) return false;
  if (!BATTLE_CATEGORIES.has(category)) return false;

  // Secondary filter: must have at least one English effect entry
  const hasEffect = (data.effect_entries || []).some(
    (e) => e.language?.name === "en"
  );
  return hasEffect;
}

async function fetchItem(idOrName) {
  try {
    const res = await fetch(`${BASE_URL}/${idOrName}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Only keep items introduced up to Gen 3
    const generation = data.game_indices?.find(
      (gi) =>
        gi.generation?.name &&
        ["generation-i", "generation-ii", "generation-iii"].includes(
          gi.generation.name
        )
    );
    // If the item has no Gen 1-3 game index at all, skip it
    if (!generation) return null;

    if (!hasBattleEffect(data)) return null;

    const effectEntry = (data.effect_entries || []).find(
      (e) => e.language?.name === "en"
    );
    const effect = effectEntry?.short_effect ?? null;
    const effectLong = effectEntry?.effect ?? null;
    const flavorText = resolveGen3FlavorText(data.flavor_text_entries);

    return {
      id: data.id,
      name: data.name,
      category: data.category?.name ?? null,
      effect,
      effect_long: effectLong,
      flavor_text: flavorText,
    };
  } catch (err) {
    console.error(`Error fetching item ${idOrName}:`, err.message);
    return null;
  }
}

async function fetchAllItemNames() {
  // PokeAPI pagination — fetch the full list first
  const res = await fetch(`${BASE_URL}?limit=2000&offset=0`);
  if (!res.ok) throw new Error(`Failed to fetch item list: HTTP ${res.status}`);
  const data = await res.json();
  return data.results; // [{ name, url }]
}

async function run() {
  console.log("Fetching item list...");
  const allItems = await fetchAllItemNames();
  console.log(`Found ${allItems.length} items total. Filtering to Gen 3 battle items...`);

  const itemRows = [];
  for (const { name } of allItems) {
    const item = await fetchItem(name);
    if (item) {
      itemRows.push(item);
      process.stdout.write(`  + ${item.name} (${item.category})\n`);
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(itemRows, null, 2), "utf8");
  console.log(`\nSaved ${itemRows.length} battle item records to ${OUTPUT_PATH}.`);
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Failed scraping items:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { fetchItem, run };