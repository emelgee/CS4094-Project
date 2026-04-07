// =====================================================================
// API
// =====================================================================
export const API_BASE = "http://localhost:5000";

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

// =====================================================================
// DEFENDER DB (legacy static data — used in CalculatorScreen)
// =====================================================================
export const defenderDB = {
  emerald: {
    label: "Pokémon Emerald",
    routes: {
      route_101: {
        label: "Route 101",
        trainers: {
          wild: {
            label: "Wild Pokémon",
            team: [
              { species: "Zigzagoon", level: 2, type: "Normal", hp: 38, def: 35, spd: 35, atk: 30, spe: 60, moves: ["Tackle", "Growl"] },
              { species: "Wurmple",   level: 2, type: "Bug",    hp: 45, def: 35, spd: 30, atk: 35, spe: 20, moves: ["Tackle", "String Shot"] },
            ],
          },
        },
      },
      route_104: {
        label: "Route 104",
        trainers: {
          youngster_billy: {
            label: "Youngster Billy",
            team: [{ species: "Zigzagoon", level: 5, type: "Normal", hp: 38, def: 35, spd: 35, atk: 30, spe: 60, moves: ["Tackle", "Growl", "Tail Whip"] }],
          },
          lass_haley: {
            label: "Lass Haley",
            team: [{ species: "Shroomish", level: 6, type: "Grass", hp: 60, def: 40, spd: 60, atk: 40, spe: 35, moves: ["Absorb", "Tackle"] }],
          },
        },
      },
      rustboro_gym: {
        label: "Rustboro City Gym",
        trainers: {
          hiker_devin: {
            label: "Hiker Devin",
            team: [
              { species: "Geodude", level: 9, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle"] },
              { species: "Geodude", level: 9, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle"] },
            ],
          },
          roxanne: {
            label: "Leader Roxanne",
            team: [
              { species: "Geodude", level: 14, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle", "Defense Curl", "Mud Sport"] },
              { species: "Nosepass", level: 15, type: "Rock", hp: 30, def: 115, spd: 70, atk: 45, spe: 30, moves: ["Tackle", "Harden", "Rock Throw"] },
            ],
          },
        },
      },
      dewford_gym: {
        label: "Dewford Town Gym",
        trainers: {
          brawly: {
            label: "Leader Brawly",
            team: [
              { species: "Machop",   level: 17, type: "Fighting", hp: 70, def: 50, spd: 35, atk: 80, spe: 35, moves: ["Karate Chop", "Low Kick"] },
              { species: "Makuhita", level: 18, type: "Fighting", hp: 72, def: 30, spd: 25, atk: 60, spe: 25, moves: ["Arm Thrust", "Fake Out", "Vital Throw"] },
            ],
          },
        },
      },
      mauville_gym: {
        label: "Mauville City Gym",
        trainers: {
          wattson: {
            label: "Leader Wattson",
            team: [
              { species: "Magnemite", level: 22, type: "Electric/Steel", hp: 25, def: 115, spd: 55, atk: 35, spe: 45, moves: ["SonicBoom", "Thunder Wave", "Thundershock"] },
              { species: "Voltorb",   level: 20, type: "Electric",       hp: 40, def: 30,  spd: 55, atk: 30, spe: 100, moves: ["Rollout", "Shock Wave"] },
              { species: "Magneton",  level: 24, type: "Electric/Steel", hp: 25, def: 115, spd: 70, atk: 60, spe: 70, moves: ["Thunder Wave", "Supersonic", "Shock Wave"] },
            ],
          },
        },
      },
    },
  },
  ruby_sapphire: { label: "Ruby / Sapphire", routes: {} },
  red_blue: {
    label: "Red / Blue",
    routes: {
      route_1: {
        label: "Route 1",
        trainers: {
          wild: {
            label: "Wild Pokémon",
            team: [
              { species: "Pidgey",  level: 3, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle"] },
              { species: "Rattata", level: 2, type: "Normal",         hp: 30, def: 35, spd: 40, atk: 56, spe: 72, moves: ["Tackle"] },
            ],
          },
        },
      },
      pewter_gym: {
        label: "Pewter City Gym",
        trainers: {
          brock: {
            label: "Leader Brock",
            team: [
              { species: "Geodude", level: 12, type: "Rock/Ground", hp: 40, def: 100, spd: 55, atk: 80, spe: 20, moves: ["Tackle"] },
              { species: "Onix",    level: 14, type: "Rock/Ground", hp: 35, def: 160, spd: 30, atk: 45, spe: 70, moves: ["Tackle", "Screech"] },
            ],
          },
        },
      },
    },
  },
  gold_silver: {
    label: "Gold / Silver",
    routes: {
      route_29: {
        label: "Route 29",
        trainers: {
          wild: {
            label: "Wild Pokémon",
            team: [
              { species: "Pidgey",  level: 2, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle"] },
              { species: "Sentret", level: 2, type: "Normal",         hp: 35, def: 44, spd: 45, atk: 46, spe: 20, moves: ["Scratch"] },
            ],
          },
        },
      },
      violet_gym: {
        label: "Violet City Gym",
        trainers: {
          falkner: {
            label: "Leader Falkner",
            team: [
              { species: "Pidgey",    level: 7, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle", "Sand Attack"] },
              { species: "Pidgeotto", level: 9, type: "Normal/Flying", hp: 63, def: 55, spd: 50, atk: 60, spe: 71, moves: ["Tackle", "Sand Attack", "Gust"] },
            ],
          },
        },
      },
    },
  },
  crystal: {
    label: "Crystal",
    routes: {
      route_29: {
        label: "Route 29",
        trainers: {
          wild: {
            label: "Wild Pokémon",
            team: [
              { species: "Pidgey",  level: 2, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle"] },
              { species: "Sentret", level: 2, type: "Normal",         hp: 35, def: 44, spd: 45, atk: 46, spe: 20, moves: ["Scratch"] },
            ],
          },
        },
      },
      violet_gym: {
        label: "Violet City Gym",
        trainers: {
          falkner: {
            label: "Leader Falkner",
            team: [
              { species: "Pidgey",    level: 7, type: "Normal/Flying", hp: 40, def: 41, spd: 35, atk: 45, spe: 56, moves: ["Tackle", "Sand Attack", "Gust"] },
              { species: "Pidgeotto", level: 9, type: "Normal/Flying", hp: 63, def: 55, spd: 50, atk: 60, spe: 71, moves: ["Sand Attack", "Gust", "Quick Attack"] },
            ],
          },
        },
      },
    },
  },
};
