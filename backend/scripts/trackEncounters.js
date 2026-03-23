
const encounters = [];

function createEncounter(name, route, level, status) {
  return {
    id: Date.now().toString(),
    name,
    route,
    level,
    status,
    timestamp: new Date().toISOString(),
  };
}

    