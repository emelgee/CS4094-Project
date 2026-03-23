const BASE_URL = "https://pokeapi.co/api/v2/move";
const fs = require("fs/promises");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "../data/moves.json");
const GEN3_MOVE_COUNT = 354;

const VERSION_GROUP_ORDER = [
  "red-blue", "yellow", "gold-silver", "crystal",
  "ruby-sapphire", "emerald", "firered-leafgreen", "colosseum", "xd",
  // Gen 4+ below — anything from here on is "after Gen 3"
  "diamond-pearl", "platinum", "heartgold-soulsilver", "black-white",
  "black-2-white-2", "x-y", "omega-ruby-alpha-sapphire", "sun-moon",
  "ultra-sun-ultra-moon", "sword-shield", "scarlet-violet",
];

const GEN3_LAST_INDEX = VERSION_GROUP_ORDER.indexOf("xd"); // index 8

function versionGroupIndex(name) {
  const idx = VERSION_GROUP_ORDER.indexOf(name);
  return idx === -1 ? 999 : idx;
}

/**
 * past_values entries are tagged with the version group they LAST applied in.
 * e.g. { version_group: "x-y", pp: 30 } means pp was 30 from Gen 1 up through X/Y.
 * The current API value is what changed AFTER that last entry.
 *
 * To get the Gen 3 value:
 *   - Find all past_values entries tagged to Gen 4+ (they changed after Gen 3)
 *   - Pick the EARLIEST one (first change after Gen 3) — its value is what Gen 3 had
 *   - If no post-Gen3 past_values exist, the current value has never changed since Gen 3
 */
function resolveGen3Value(pastValues, field, currentValue) {
  const postGen3Entries = (pastValues || [])
    .filter((pv) => {
      const idx = versionGroupIndex(pv.version_group?.name);
      return idx > GEN3_LAST_INDEX && pv[field] !== null && pv[field] !== undefined;
    })
    .sort((a, b) => versionGroupIndex(a.version_group.name) - versionGroupIndex(b.version_group.name));

  // The earliest post-Gen3 entry holds the value that was active during Gen 3
  if (postGen3Entries.length > 0) {
    return postGen3Entries[0][field];
  }

  // No changes after Gen 3 — current value is already correct
  return currentValue;
}

async function fetchMove(id) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const generation = data.generation?.name;
    if (
      generation &&
      !["generation-i", "generation-ii", "generation-iii"].includes(generation)
    ) {
      return null;
    }

    const pastValues = data.past_values || [];

    const power    = resolveGen3Value(pastValues, "power",    data.power);
    const accuracy = resolveGen3Value(pastValues, "accuracy", data.accuracy);
    const pp       = resolveGen3Value(pastValues, "pp",       data.pp);
    const rawType  = resolveGen3Value(pastValues, "type",     data.type);
    const type     = (typeof rawType === "object" ? rawType?.name : rawType) ?? data.type?.name ?? null;

    const effectEntry = (data.effect_entries || []).find((e) => e.language?.name === "en");
    const effect =
      effectEntry?.short_effect?.replace(/\$effect_chance%/g, `${data.effect_chance ?? "?"}%`) ?? null;

    const PRE_GEN4_VERSION_GROUPS = new Set(VERSION_GROUP_ORDER.slice(0, GEN3_LAST_INDEX + 1));
    const gen3FlavorText =
      (data.flavor_text_entries || [])
        .filter((f) => f.language?.name === "en" && PRE_GEN4_VERSION_GROUPS.has(f.version_group?.name))
        .sort((a, b) => versionGroupIndex(b.version_group.name) - versionGroupIndex(a.version_group.name))
        .map((f) => f.flavor_text?.replace(/\n|\f/g, " "))
        .find(Boolean) ?? null;

    return {
      id: data.id,
      name: data.name,
      generation,
      type,
      damage_class:   data.damage_class?.name ?? null,
      power:          power ?? null,
      accuracy:       accuracy ?? null,
      pp:             pp ?? null,
      effect_chance:  data.effect_chance ?? null,
      effect,
      target:         data.target?.name ?? null,
      ailment:        data.meta?.ailment?.name ?? null,
      ailment_chance: data.meta?.ailment_chance ?? null,
      flinch_chance:  data.meta?.flinch_chance ?? null,
      stat_chance:    data.meta?.stat_chance ?? null,
      category:       data.meta?.category?.name ?? null,
      priority:       data.priority ?? 0,
      flavor_text:    gen3FlavorText,
    };
  } catch (err) {
    console.error(`Error fetching move ${id}:`, err.message);
    return null;
  }
}

async function run() {
  const moveRows = [];

  for (let i = 1; i <= GEN3_MOVE_COUNT; i++) {
    const move = await fetchMove(i);
    if (move) moveRows.push(move);
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(moveRows, null, 2), "utf8");
  console.log(`Saved ${moveRows.length} move records to ${OUTPUT_PATH}.`);
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Failed scraping moves:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { fetchMove, run };