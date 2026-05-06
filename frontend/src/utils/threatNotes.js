// =====================================================================
// THREAT NOTES — pure derivations for the Boss Data screen
// =====================================================================
// Everything here is computed from data the page already has loaded:
//   - the boss's team JSON (species, level, moves, ability, item, iv)
//   - the global pokemon index (base stats, types, abilities)
//   - the global moves list (type, BP, accuracy)
//   - the player's party (battle stats, types, level)
//   - the gen-3 type chart in utils/calc.js
//
// Keep these as pure functions — no React, no fetches — so they're easy
// to unit-test and reuse if we ever lift this analysis somewhere else.
// =====================================================================

import {
  calculateDamage,
  getTypeEffectiveness,
  TYPE_LIST,
} from "./calc";
import { calculateGen3Stat, applyNatureModifier } from "./helpers";

const NOTABLE_ABILITIES = {
  sturdy:        "won't be OHKO'd from full HP",
  levitate:      "immune to Ground moves",
  intimidate:    "drops your Attack on switch-in",
  "wonder-guard": "only super-effective hits land",
  "speed-boost": "Speed rises every turn",
  "shed-skin":   "may cure its own status",
  pressure:      "burns 2 PP per hit",
  "flash-fire":  "absorbs Fire moves",
  "volt-absorb": "absorbs Electric moves",
  "water-absorb":"absorbs Water moves",
  "thick-fat":   "halves Fire/Ice damage",
  guts:          "Attack rises when statused",
  drizzle:       "summons permanent Rain",
  drought:       "summons permanent Sun",
};

const NOTABLE_ITEMS = {
  "sitrus_berry":  "restores ~25% HP automatically below half",
  "leftovers":     "passive HP recovery each turn",
  "lum_berry":     "auto-cures any status once",
  "chesto_berry":  "auto-wakes once",
  "focus_band":    "may survive a KO with 1 HP",
  "scope_lens":    "boosted crit rate",
  "bright_powder": "evasion boost",
  "choice_band":   "1.5× Attack but locked into one move",
  "kings_rock":    "added flinch chance",
  "white_herb":    "auto-restores lowered stats once",
};

const lc = (s) => String(s || "").toLowerCase();
const hyphen = (s) => lc(s).replace(/[\s_]+/g, "-");
const display = (s) =>
  String(s || "").replace(/[-_]/g, " ").toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function lookupSpecies(species, pokemonIndex) {
  return pokemonIndex?.[lc(species)] || null;
}

function buildMoveIndex(allMoves) {
  const m = new Map();
  for (const move of allMoves || []) {
    m.set(hyphen(move.name), move);
  }
  return m;
}

// Trainer JSON stores a 0-255 "difficulty" iv; the in-game calc uses
// floor(raw / 10) for both IV and EV per stat.
function bossDerivedIvEv(rawIv) {
  const v = rawIv != null ? Number(rawIv) : 255;
  return Math.floor(v / 10);
}

function bossBattleStats(speciesData, level, rawIv) {
  if (!speciesData) return null;
  const ivev = bossDerivedIvEv(rawIv);
  return {
    hp:  calculateGen3Stat(speciesData.hp,         ivev, ivev, level, true),
    atk: calculateGen3Stat(speciesData.attack,     ivev, ivev, level, false),
    def: calculateGen3Stat(speciesData.defense,    ivev, ivev, level, false),
    spa: calculateGen3Stat(speciesData.sp_attack,  ivev, ivev, level, false),
    spd: calculateGen3Stat(speciesData.sp_defense, ivev, ivev, level, false),
    spe: calculateGen3Stat(speciesData.speed,      ivev, ivev, level, false),
  };
}

// =====================================================================
// 1. COVERAGE: which attack types do well / poorly against this team?
// =====================================================================
// For each attacking type, compute the average effectiveness across the
// whole boss team. Surface attacker types with avg ≥ 1.5 ("bring") and
// resistance themes the team shares with avg ≤ 0.75 ("avoid").
export function getCoverageRecommendations(team, pokemonIndex) {
  const defenders = (team || []).map((p) => {
    const data = lookupSpecies(p?.species, pokemonIndex);
    return {
      type1: lc(data?.type1) || null,
      type2: lc(data?.type2) || null,
    };
  }).filter((d) => d.type1);

  if (defenders.length === 0) return { bring: [], avoid: [] };

  const rows = TYPE_LIST.map((atkType) => {
    const effs = defenders.map((d) =>
      getTypeEffectiveness(atkType, d.type1, d.type2)
    );
    const avg = effs.reduce((a, b) => a + b, 0) / effs.length;
    const max = Math.max(...effs);
    return { type: atkType, avg, max };
  });

  const bring = rows
    .filter((r) => r.avg >= 1.5 || r.max >= 2)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const avoid = rows
    .filter((r) => r.avg <= 0.75 && r.max <= 1)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  return { bring, avoid };
}

// =====================================================================
// 2. KEY THREATS: each boss mon's most dangerous move
// =====================================================================
export function getKeyThreats(team, pokemonIndex, allMoves) {
  const moveIndex = buildMoveIndex(allMoves);
  return (team || []).map((p) => {
    const data = lookupSpecies(p?.species, pokemonIndex);
    const moves = (Array.isArray(p?.moves) ? p.moves : [])
      .filter(Boolean)
      .map((name) => {
        const move = moveIndex.get(hyphen(name));
        if (!move) return { name: display(name), type: null, power: null, accuracy: null, stab: false };
        return {
          name: display(move.name),
          type: lc(move.type),
          power: move.power ?? null,
          accuracy: move.accuracy ?? null,
          stab:
            (data?.type1 && lc(move.type) === lc(data.type1)) ||
            (data?.type2 && lc(move.type) === lc(data.type2)),
        };
      });

    const damaging = moves.filter((m) => (m.power || 0) > 0);
    damaging.sort((a, b) => {
      // STAB-weighted BP, accuracy as tie-breaker
      const sa = (a.power || 0) * (a.stab ? 1.5 : 1);
      const sb = (b.power || 0) * (b.stab ? 1.5 : 1);
      if (sb !== sa) return sb - sa;
      return (b.accuracy || 0) - (a.accuracy || 0);
    });

    return {
      species: display(p?.species),
      level: p?.level ?? null,
      types: [data?.type1, data?.type2].filter(Boolean).map(display),
      moves,
      strongest: damaging[0] || null,
    };
  });
}

// =====================================================================
// 3. NOTABLE TRAITS: abilities + items worth flagging
// =====================================================================
export function getNotableTraits(team, pokemonIndex, trainerItems = []) {
  const abilities = [];
  for (const p of team || []) {
    const data = lookupSpecies(p?.species, pokemonIndex);
    if (!data) continue;
    const candidates = [data.ability1, data.ability2, data.ability_hidden]
      .filter(Boolean)
      .map(lc);
    for (const ab of candidates) {
      if (NOTABLE_ABILITIES[ab]) {
        abilities.push({
          species: display(p.species),
          ability: display(ab),
          why: NOTABLE_ABILITIES[ab],
        });
        break; // one notable ability per mon is enough
      }
    }
  }

  const items = (trainerItems || [])
    .filter(Boolean)
    .map((raw) => {
      const key = lc(raw).replace(/\s+/g, "_");
      return {
        item: display(raw),
        why: NOTABLE_ITEMS[key] || null,
      };
    });

  return { abilities, items };
}

// =====================================================================
// 4. SPEED TIER: fastest mon on the boss team
// =====================================================================
export function getSpeedTier(team, pokemonIndex) {
  let fastest = null;
  for (const p of team || []) {
    const data = lookupSpecies(p?.species, pokemonIndex);
    if (!data) continue;
    const lv = Number(p.level) || 50;
    const stats = bossBattleStats(data, lv, p.iv);
    if (!stats) continue;
    if (!fastest || stats.spe > fastest.spe) {
      fastest = { species: display(p.species), level: lv, spe: stats.spe };
    }
  }
  return fastest;
}

// =====================================================================
// 5. OHKO/2HKO threats vs YOUR party
// =====================================================================
// For each boss Pokémon and its strongest STAB-or-coverage move, simulate
// damage against every party member and surface anything that 2HKOs+.
export function getOhkoThreats(team, pokemonIndex, allMoves, party) {
  if (!Array.isArray(party) || party.length === 0) return [];
  const moveIndex = buildMoveIndex(allMoves);
  const threats = [];

  for (const p of team || []) {
    const data = lookupSpecies(p?.species, pokemonIndex);
    if (!data) continue;
    const lv = Number(p.level) || 50;
    const battle = bossBattleStats(data, lv, p.iv);
    if (!battle) continue;

    const moves = (Array.isArray(p?.moves) ? p.moves : [])
      .filter(Boolean)
      .map((name) => moveIndex.get(hyphen(name)))
      .filter((m) => m && Number(m.power) > 0);

    if (moves.length === 0) continue;

    // Pick up to 2 of the boss mon's strongest moves to test.
    moves.sort((a, b) => Number(b.power) - Number(a.power));
    const topMoves = moves.slice(0, 2);

    for (const move of topMoves) {
      const moveType = lc(move.type);
      const isPhysical = !["fire","water","electric","grass","ice","psychic","dragon","dark","ghost"]
        .includes(moveType);
      const attackerData = {
        level: lv,
        attack: battle.atk,
        sp_attack: battle.spa,
        type1: lc(data.type1),
        type2: data.type2 ? lc(data.type2) : null,
        item: null,
        atkStage: 0,
        spAtkStage: 0,
      };

      for (const mate of party) {
        if (!mate?.stats) continue;
        const partyLevel = mate.level || 1;
        const nature = lc(mate.nature) || "hardy";
        const def = applyNatureModifier(
          calculateGen3Stat(mate.stats.def, mate.ivs?.def ?? 31, mate.evs?.def ?? 0, partyLevel, false),
          "def",
          nature,
        );
        const spd = applyNatureModifier(
          calculateGen3Stat(mate.stats.spd, mate.ivs?.spd ?? 31, mate.evs?.spd ?? 0, partyLevel, false),
          "spd",
          nature,
        );
        const hp = calculateGen3Stat(mate.stats.hp, mate.ivs?.hp ?? 31, mate.evs?.hp ?? 0, partyLevel, true);

        const result = calculateDamage(
          attackerData,
          {
            defense: def,
            sp_defense: spd,
            type1: lc((mate.types || [])[0]) || null,
            type2: lc((mate.types || [])[1]) || null,
            defStage: 0,
            spDefStage: 0,
          },
          { type: moveType, basePower: Number(move.power) || 0 },
          {},
        );

        if (!result || !result.max || hp <= 0) continue;
        const minPct = (result.min / hp) * 100;
        const maxPct = (result.max / hp) * 100;
        const ohko = result.max >= hp;
        const twohko = result.min * 2 >= hp;

        // Only surface meaningful threats.
        if (maxPct < 50 && !ohko) continue;

        threats.push({
          bossSpecies: display(p.species),
          bossLevel: lv,
          partyName: mate.nickname || mate.name,
          partyLevel,
          move: { name: display(move.name), type: moveType, power: move.power },
          minPct,
          maxPct,
          ohko,
          twohko,
          isPhysical,
        });
      }
    }
  }

  // Sort worst-first; cap at 6 entries so the panel stays readable.
  threats.sort((a, b) => {
    if (a.ohko !== b.ohko) return a.ohko ? -1 : 1;
    if (a.twohko !== b.twohko) return a.twohko ? -1 : 1;
    return b.maxPct - a.maxPct;
  });
  return threats.slice(0, 6);
}
