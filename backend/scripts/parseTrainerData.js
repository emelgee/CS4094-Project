const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/trainerData.json');
const TRAINERS_URL = 'https://raw.githubusercontent.com/pret/pokeemerald/25ffb2c12c069ac6b2040f9238b2978f1de72e3f/src/data/trainers.h';
const PARTIES_URL = 'https://raw.githubusercontent.com/pret/pokeemerald/25ffb2c12c069ac6b2040f9238b2978f1de72e3f/src/data/trainer_parties.h';
const TREE_URL = 'https://api.github.com/repos/pret/pokeemerald/git/trees/25ffb2c12c069ac6b2040f9238b2978f1de72e3f?recursive=1';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/pret/pokeemerald/25ffb2c12c069ac6b2040f9238b2978f1de72e3f/';
const LOCATION_FETCH_CONCURRENCY = 24;

async function parseTrainerData() {
  try {
    console.log('Fetching trainer data...');

    // Pull source files, then parse each into plain JS objects.
    const [trainers, parties, trainerLocations] = await Promise.all([
      fetch(TRAINERS_URL).then(assertOk).then(r => r.text()).then(parseTrainers),
      fetch(PARTIES_URL).then(assertOk).then(r => r.text()).then(parseParties),
      parseTrainerLocations()
    ]);

    const data = buildOutput(trainers, parties, trainerLocations);

    // Create data directory if needed
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`Saved ${data.meta.totalTrainers} trainers and ${data.meta.totalParties} parties`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function parseTrainers(content) {
  const trainers = {};
  // Trainer blocks are keyed like [TRAINER_SAWYER_1] = { ... },
  const regex = /\[TRAINER_([A-Z0-9_]+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g;

  let match;
  while ((match = regex.exec(content))) {
    const id = match[1];
    const block = match[2];
    const name = (block.match(/\.trainerName\s*=\s*_?\("([^"]+)/) || [])[1] || '';
    const partyMatch = block.match(/sParty_([A-Za-z0-9_]+)/);

    trainers[id] = {
      id,
      name: name.trim(),
      class: (block.match(/\.trainerClass\s*=\s*([A-Z0-9_]+)/) || [])[1] || '',
      party: partyMatch ? partyMatch[1] : null,
      items: extractItems(block)
    };
  }

  return trainers;
}

async function parseTrainerLocations() {
  console.log('Fetching trainer map locations...');

  const tree = await fetch(TREE_URL)
    .then(assertOk)
    .then(r => r.json());

  const scriptPaths = (tree.tree || [])
    .map(node => node.path)
    .filter(Boolean)
    .filter(p => /^data\/maps\/[^/]+\/scripts\.inc$/.test(p));

  const trainerToMaps = {};

  for (let i = 0; i < scriptPaths.length; i += LOCATION_FETCH_CONCURRENCY) {
    const batch = scriptPaths.slice(i, i + LOCATION_FETCH_CONCURRENCY);
    const responses = await Promise.all(batch.map(fetchMapScriptTrainers));

    for (const { map, trainerIds } of responses) {
      for (const trainerId of trainerIds) {
        if (!trainerToMaps[trainerId]) trainerToMaps[trainerId] = new Set();
        trainerToMaps[trainerId].add(map);
      }
    }
  }

  return Object.fromEntries(
    Object.entries(trainerToMaps)
      .map(([trainerId, maps]) => [trainerId, Array.from(maps).sort()])
  );
}

async function fetchMapScriptTrainers(scriptPath) {
  const mapId = scriptPath.split('/')[2];
  const locationLabel = prettifyMapName(mapId);
  const content = await fetch(`${RAW_BASE_URL}${scriptPath}`)
    .then(assertOk)
    .then(r => r.text());

  const trainerIds = new Set();
  const regex = /\bTRAINER_([A-Z0-9_]+)\b/g;

  let match;
  while ((match = regex.exec(content))) {
    trainerIds.add(match[1]);
  }

  return {
    map: locationLabel,
    trainerIds
  };
}

function prettifyMapName(mapId) {
  return mapId
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bRoute\s*(\d+)\b/gi, 'Route $1')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertOk(response) {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.url} (${response.status})`);
  }
  return response;
}

function parseParties(content) {
  const parties = {};
  // Party blocks are keyed like sParty_Sawyer1[] = { ... };
  const regex = /sParty_([A-Za-z0-9_]+)\[\]\s*=\s*\{([\s\S]*?)\n\}\s*;/g;

  let match;
  while ((match = regex.exec(content))) {
    const name = match[1];
    const pokemon = [];
    const partyBlock = match[2];

    // Each mon entry is defined with iv/lvl/species.
    const pokeRegex = /\.iv\s*=\s*(\d+)[\s\S]*?\.lvl\s*=\s*(\d+)[\s\S]*?\.species\s*=\s*SPECIES_([A-Z0-9_]+)([\s\S]*?)(?=\{\s*\.iv|$)/g;

    let pokeMatch;
    while ((pokeMatch = pokeRegex.exec(partyBlock))) {
      pokemon.push({
        species: pokeMatch[3],
        level: parseInt(pokeMatch[2]),
        iv: parseInt(pokeMatch[1]),
        moves: extractMoves(pokeMatch[4])
      });
    }

    if (pokemon.length > 0) {
      parties[name] = { name, pokemon };
    }
  }

  return parties;
}

function extractMoves(blockContent) {
  const match = blockContent.match(/\.moves\s*=\s*\{([^}]*)\}/);
  // Most trainers use default moves from level-up learnsets, so moves may be empty.
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(m => m.trim().replace('MOVE_', ''))
    .filter(m => m && m !== 'NONE');
}

function extractItems(block) {
  const match = block.match(/\.items\s*=\s*\{([^}]*)\}/);
  if (!match) return [];

  return match[1]
    .split(',')
    .map(s => s.trim().replace('ITEM_', ''))
    .filter(s => s && s !== 'NONE' && s !== '');
}

function buildOutput(trainers, parties, trainerLocations) {
  const trainerList = Object.values(trainers)
    .map(trainer => ({
      ...trainer,
      maps: trainerLocations[trainer.id] || [],
      route: trainerLocations[trainer.id]?.[0] || null,
      pokemon: trainer.party && parties[trainer.party] ? parties[trainer.party].pokemon : []
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const enrichedTrainers = Object.fromEntries(
    Object.entries(trainers).map(([id, trainer]) => [
      id,
      {
        ...trainer,
        maps: trainerLocations[id] || [],
        route: trainerLocations[id]?.[0] || null
      }
    ])
  );

  const mappedTrainerCount = trainerList.filter(t => t.maps.length > 0).length;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'pret/pokeemerald',
      totalTrainers: trainerList.length,
      totalParties: Object.keys(parties).length,
      trainersWithLocation: mappedTrainerCount
    },
    trainers: enrichedTrainers,
    parties,
    trainerList
  };
}

parseTrainerData().catch(console.error);
