const HOENN_URL = "https://pokeapi.co/api/v2/region/3"
const LOC_URL = "https://pokeapi.co/api/v2/location";
const AREA_URL = "https://pokeapi.co/api/v2/location-area";
const fs = require("fs/promises");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "../data/location.json");

function parseEncounterDetails(encounter_details) {
    try {
        const methodMap = {};

        for (const encounter of encounter_details) {
            const method = encounter.method.name;

            if (!methodMap[method]) {
            methodMap[method] = {
                method_name: method,
                max_chance: encounter.chance,
                max_level: encounter.max_level,
                min_level: encounter.min_level,
            };
            } else {
            methodMap[method].max_chance = Math.max(
                methodMap[method].max_chance,
                encounter.chance
            );

            methodMap[method].max_level = Math.max(
                methodMap[method].max_level,
                encounter.max_level
            );

            methodMap[method].min_level = Math.min(
                methodMap[method].min_level,
                encounter.min_level
            );
            }
        }

        return {
            methods: Object.values(methodMap),
        };
    } catch (err) {
    console.error(`Error fetching Encounter:`, err.message);
    return null;
    }
}

async function fetchArea(nameOrid) {
    try {
        const areaRes = await fetch(`${AREA_URL}/${nameOrid}`);

        if (!areaRes.ok) throw new Error(`Area HTTP ${areaRes.status}`);

        const area = await areaRes.json();

        const id = area.id;
        const name = area.name;
        const encounters = [];

        for (const pokemon of area.pokemon_encounters) {
            for (const version_details of pokemon.version_details) {
                if (version_details.version.name == "emerald") {
                    const encounter_details = version_details.encounter_details;
                    const encounter = await parseEncounterDetails(encounter_details);
                    console.log(pokemon.pokemon.name + ":\n" + JSON.stringify(encounter, null, 2));
                    encounters.push({
                        pokemon: pokemon.pokemon.name,
                        encounter: encounter            
                    });
                    
                }
            }
        }

        return {
            id: id,
            name: name,
            encounters: encounters
        }
    } catch (err) {
        console.error(`Error fetching Area ${idOrName}:`, err.message);
        return null;
    }
}

async function fetchLocation(idOrName) {
    try {
        const locRes = await fetch(`${LOC_URL}/${idOrName}`);

        if (!locRes.ok) throw new Error(`Location HTTP ${locRes.status}`);

        const loc = await locRes.json();

        if (!loc.region || loc.region.name !== 'hoenn') return null;

        const loc_id = loc.id;
        const name = loc.name;
        const loc_areas = loc.areas;
        const areas = [];

        for (const loc_area of loc_areas) {
            const area = await fetchArea(loc_area.name);
            areas.push(area);
        }

        return {
            id: loc_id,
            name: name,
            areas: areas
        };
    } catch (err) {
        console.error(`Error fetching Location ${idOrName}:`, err.message);
        return null;
    }
}

async function getLocations() {
    try {
        const location_names = [];

        const hoennRes = await fetch(`${HOENN_URL}`);
        if (!hoennRes.ok) throw new Error(`Region HTTP ${hoennRes.status}`);
        const hoenn = await hoennRes.json();

        for (const location of hoenn.locations) {
            location_names.push(location.name);
        }
        return location_names;
    } catch (err) {
        console.error(`Error fetching list of locations: `, err.message);
        return null;
    }
}

async function run() {
    const locRows = [];
    const locations = await getLocations();

    for (const name of locations) {
        const location = await fetchLocation(name);
        if (location) {
            locRows.push(location);
        }
    }

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(locRows, null, 2), "utf8");
    console.log(`Saved ${locRows.length} location records to ${OUTPUT_PATH}.`);
}

if (require.main === module) {
    run().catch((err) => {
        console.error("Failed scraping locations:", err.message);
        process.exitCode = 1;
    });
}

module.exports = { fetchLocation, run };