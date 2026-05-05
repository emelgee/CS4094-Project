// =====================================================================
// API
// =====================================================================
export const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "https://cs4094-project-production.up.railway.app";

// =====================================================================
// HOENN GYM BADGES (Gen 3)
// =====================================================================
// Order matches the in-game gym progression. `name` doubles as the stable
// id used in storage and in the cross-component badge state.
export const BADGES = [
  { name: "Stone",   icon: "🪨" },
  { name: "Knuckle", icon: "✊" },
  { name: "Dynamo",  icon: "⚡" },
  { name: "Heat",    icon: "🔥" },
  { name: "Balance", icon: "⚖" },
  { name: "Feather", icon: "🪶" },
  { name: "Mind",    icon: "🔮" },
  { name: "Rain",    icon: "🌊" },
];

// =====================================================================
// BOSS CONSTANTS
// =====================================================================
export const BOSS_PRIORITY = [
  "ROXANNE_1", "BRAWLY_1", "WATTSON_1", "FLANNERY_1", "NORMAN_1",
  "WINONA_1", "TATE_AND_LIZA_1", "JUAN_1",
  "SIDNEY", "PHOEBE", "GLACIA", "DRAKE", "WALLACE",
];

export const BOSS_ID_ALIASES = {
  ROXANNE_1:     { title: "Roxanne",    subtitle: "Gym 1 · Rustboro City · Rock" },
  BRAWLY_1:      { title: "Brawly",     subtitle: "Gym 2 · Dewford Town · Fighting" },
  WATTSON_1:     { title: "Wattson",    subtitle: "Gym 3 · Mauville City · Electric" },
  FLANNERY_1:    { title: "Flannery",   subtitle: "Gym 4 · Lavaridge Town · Fire" },
  NORMAN_1:      { title: "Norman",     subtitle: "Gym 5 · Petalburg City · Normal" },
  WINONA_1:      { title: "Winona",     subtitle: "Gym 6 · Fortree City · Flying" },
  TATE_AND_LIZA_1: { title: "Tate & Liza", subtitle: "Gym 7 · Mossdeep City · Psychic" },
  JUAN_1:        { title: "Juan",       subtitle: "Gym 8 · Sootopolis City · Water" },
  SIDNEY:        { title: "Sidney",     subtitle: "Elite Four · Dark" },
  PHOEBE:        { title: "Phoebe",     subtitle: "Elite Four · Ghost" },
  GLACIA:        { title: "Glacia",     subtitle: "Elite Four · Ice" },
  DRAKE:         { title: "Drake",      subtitle: "Elite Four · Dragon" },
  WALLACE:       { title: "Wallace",    subtitle: "Champion · Ever Grande City · Water" },
};

export const BOSS_CLASS_FILTERS = new Set([
  "TRAINER_CLASS_LEADER",
  "TRAINER_CLASS_RIVAL",
  "TRAINER_CLASS_ELITE_FOUR",
  "TRAINER_CLASS_CHAMPION",
]);

export const BOSS_GROUP_PRIORITY = [
  "ROXANNE", "BRAWLY", "WATTSON", "FLANNERY", "NORMAN", "WINONA",
  "TATE_AND_LIZA", "JUAN",
  "SIDNEY", "PHOEBE", "GLACIA", "DRAKE", "WALLACE",
  "WALLY", "BRENDAN", "MAY", "RED", "LEAF",
];

export const BOSS_MULTIWORD_BASES = new Set(["TATE_AND_LIZA"]);

export const RIVAL_STARTER_PRIORITY = ["MUDKIP", "TREECKO", "TORCHIC"];

export const BOSS_DISPLAY_NAMES = {
  ROXANNE: "Roxanne", BRAWLY: "Brawly", WATTSON: "Wattson",
  FLANNERY: "Flannery", NORMAN: "Norman", WINONA: "Winona",
  TATE_AND_LIZA: "Tate & Liza", JUAN: "Juan",
  SIDNEY: "Sidney", PHOEBE: "Phoebe", GLACIA: "Glacia",
  DRAKE: "Drake", WALLACE: "Wallace",
  WALLY: "Wally", BRENDAN: "Brendan", MAY: "May", RED: "Red", LEAF: "Leaf",
};

// =====================================================================
// HOENN LOCATIONS
// =====================================================================
export const HOENN_LOCATIONS = [
  "Littleroot Town", "Route 101", "Oldale Town", "Route 102", "Route 103",
  "Petalburg City", "Route 104", "Petalburg Woods", "Rustboro City",
  "Route 115", "Route 116", "Rusturf Tunnel", "Dewford Town", "Route 106",
  "Granite Cave", "Route 107", "Route 108", "Route 109", "Slateport City",
  "Route 110", "Mauville City", "Route 111", "Route 112", "Fiery Path",
  "Route 113", "Fallarbor Town", "Route 114", "Meteor Falls",
  "Jagged Pass", "Lavaridge Town",
];

// =====================================================================
// INITIAL PARTY (seed data)
// =====================================================================
export const initialParty = [
  {
    id: 1,
    encounterId: null,
    name: "Breloom",
    level: 24,
    gender: "♂ Male",
    types: ["Grass", "Fighting"],
    primaryType: "grass",
    stats: { hp: 70, atk: 90, def: 60, spa: 60, spd: 60, spe: 70 },
    nature: "Adamant (+Atk, -SpA)",
    ability: "Effect Spore",
    moves: ["Mach Punch", "Seed Bomb", "", ""],
    dbData: { ability1: "effect-spore", ability2: null, ability_hidden: "poison-heal" },
  },
  {
    id: 2,
    encounterId: null,
    name: "Gyarados",
    level: 22,
    gender: "♂ Male",
    types: ["Water", "Flying"],
    primaryType: "water",
    stats: { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81 },
    nature: "Adamant (+Atk, -SpA)",
    ability: "Intimidate",
    moves: ["Surf", "Bite", "", ""],
    dbData: { ability1: "intimidate", ability2: null, ability_hidden: null },
  },
];
