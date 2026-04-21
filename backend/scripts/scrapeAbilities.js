const BASE_URL = "https://pokeapi.co/api/v2/ability";
const fs = require("fs/promises");
const path = require("path");
const OUTPUT_PATH = path.join(__dirname, "../data/abilities.json");

const VERSION_GROUP_ORDER = [
  "red-blue", "yellow", "gold-silver", "crystal",
  "ruby-sapphire", "emerald", "firered-leafgreen", "colosseum", "xd",
  // Gen 4+ below — anything from here on is "after Gen 3"
  "diamond-pearl", "platinum", "heartgold-soulsilver", "black-white",
  "black-2-white-2", "x-y", "omega-ruby-alpha-sapphire", "sun-moon",
  "ultra-sun-ultra-moon", "sword-shield", "scarlet-violet",
];

const GEN3_LAST_INDEX = VERSION_GROUP_ORDER.indexOf("xd");

const PRE_GEN3_GENERATIONS = new Set([
  "generation-i", "generation-ii", "generation-iii"
]);

//* Need to parse such that if the ability was changed in a gen after 3 (so 4 or higher) 
// to use the ability effect in effect changes.effect_entries
// Also, only should use ability.generation.name is in PRE GEN 3 Generations 
// Finally, should use fthe flavor text belonging to emerald version group*/
function getEnglishEffect(entries) {
    return entries.find(e => e.language.name === "en")?.effect || null;
}

function getGen3RelevantEffect(effect_changes, effect_entries) {
    if (!effect_changes || effect_changes.length === 0) {
        return getEnglishEffect(effect_entries);
    }

    let bestChange = null;
    let bestIndex = Infinity;

    for (const change of effect_changes) {
        const vgName = change.version_group.name;
        const index = VERSION_GROUP_ORDER.indexOf(vgName);

        // skip unknown version groups
        if (index === -1) continue;

        // only consider AFTER Gen 3
        if (index > GEN3_LAST_INDEX && index < bestIndex) {
            bestIndex = index;
            bestChange = change;
        }
    }

    if (bestChange) {
        return getEnglishEffect(bestChange.effect_entries);
    }

    return getEnglishEffect(effect_entries);
}

async function fetchAbility(nameOrId) {
    try {
        const abilRes = await fetch(`${BASE_URL}/${nameOrId}`);
        if (!abilRes.ok) throw new Error(`Ability -${nameOrId}- HTTP ${abilRes.status}`);
        const ability = await abilRes.json()

        if (!PRE_GEN3_GENERATIONS.has(ability.generation.name)) {
            return null;
        }

        const ability_id = ability.id;
        const ability_name = ability.name;
        let flavor_text = null;
        for (const flavor_entry of ability.flavor_text_entries) {
            if (flavor_entry.language.name !== "en") {
                continue;
            }
            if (flavor_entry.version_group.name !== "emerald") {
                continue;
            }
            flavor_text = flavor_entry.flavor_text;
        }
        const effect = await getGen3RelevantEffect(ability.effect_changes, ability.effect_entries);
        return {
            id: ability_id,
            name: ability_name,
            flavor_text: flavor_text,
            effect: effect
        }
    } catch (err) {
        console.error(`Error fetching ability: `, err.message);
        return null;
    }
}

async function getAbilities() {
    try {
        const abilities = [];
        const abilRes = await fetch(`${BASE_URL}?limit=1000`);
        if (!abilRes.ok) throw new Error(`All Ability HTTP ${abilRes.status}`);
        const list = await abilRes.json();
        const abil = list.results;
        for (const ability of abil) {
            abilities.push(ability.name);
        }
        return abilities;
    } catch (err) {
        console.error(`Error fetching list of abilites: `, err.message);
        return null;
    }
}

async function run() {
    const abilityRows = [];
    const abilities = await getAbilities();

    for (const name of abilities) {
        const ability = await fetchAbility(name);
        if (ability) {
            abilityRows.push(ability);
        }
    }

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(abilityRows, null, 2), "utf8");
    console.log(`Saved ${abilityRows.length} ability records to ${OUTPUT_PATH}.`);
}

if (require.main === module) {
    run().catch((err) => {
        console.error("Failed scraping abilities:", err.message);
        process.exitCode = 1;
    });
}

module.exports = { fetchAbility, run };