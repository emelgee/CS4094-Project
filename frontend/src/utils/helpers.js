import {
  BOSS_PRIORITY,
  BOSS_CLASS_FILTERS,
  BOSS_MULTIWORD_BASES,
  BOSS_GROUP_PRIORITY,
  BOSS_DISPLAY_NAMES,
  BOSS_ID_ALIASES,
  RIVAL_STARTER_PRIORITY,
} from "../data/constants";

// =====================================================================
// STRING HELPERS
// =====================================================================
export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =====================================================================
// TRAINER HELPERS
// =====================================================================
export function getTrainerSortKey(trainer) {
  const priorityIndex = BOSS_PRIORITY.indexOf(trainer.id);
  if (priorityIndex !== -1) return priorityIndex;
  return 10000 + String(trainer.route || trainer.name || trainer.id || "").localeCompare(String(trainer.id || ""));
}

export function groupTrainersByRoute(trainers) {
  const groups = {};
  for (const trainer of trainers) {
    const routeLabel = trainer.route || (Array.isArray(trainer.maps) && trainer.maps[0]) || "Unassigned";
    if (!groups[routeLabel]) groups[routeLabel] = [];
    groups[routeLabel].push(trainer);
  }
  for (const routeLabel of Object.keys(groups)) {
    groups[routeLabel].sort((l, r) => getTrainerSortKey(l) - getTrainerSortKey(r));
  }
  return groups;
}

export function formatTrainerClassName(trainerClass) {
  return String(trainerClass || "").replace(/^TRAINER_CLASS_/, "").replace(/_/g, " ").toLowerCase();
}

export function formatTrainerRoute(trainer) {
  if (!trainer) return "Unassigned";
  if (trainer.route) return trainer.route;
  if (Array.isArray(trainer.maps) && trainer.maps.length > 0) return trainer.maps[0];
  return "Unassigned";
}

export function formatTrainerMaps(trainer) {
  if (!trainer || !Array.isArray(trainer.maps) || trainer.maps.length === 0) return [];
  return trainer.maps;
}

export function formatTrainerSubtitle(trainer) {
  const pieces = [];
  if (trainer.route) pieces.push(trainer.route);
  if (trainer.class) pieces.push(trainer.class.replace(/^TRAINER_CLASS_/, "").replace(/_/g, " ").toLowerCase());
  return pieces.join(" · ");
}

// =====================================================================
// POKEMON / SPECIES HELPERS
// =====================================================================
export function formatSpeciesName(species) {
  if (!species) return "Unknown";
  return String(species).toLowerCase().split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

// =====================================================================
// STAT CALCULATIONS
// =====================================================================
export function calculateGen3Stat(baseStat, iv, level, isHp) {
  const effectiveIv = Number.isFinite(iv) ? iv : 0;
  const effectiveLevel = Number.isFinite(level) && level > 0 ? level : 1;
  const ivContribution = Math.floor(effectiveIv / 4);
  const statCore = Math.floor((((2 * baseStat) + ivContribution) * effectiveLevel) / 100);
  return isHp ? statCore + effectiveLevel + 10 : statCore + 5;
}

export function gen3CombatStat(base, iv, ev, level) {
  const b = Number(base) || 0;
  const lv = Number(level) || 1;
  return Math.floor(((2 * b + iv + Math.floor(ev / 4)) * lv) / 100 + 5);
}

export function buildTrainerPokemonView(entry, pokemonIndex) {
  const speciesName = String(entry?.species || "").toLowerCase();
  const basePokemon = pokemonIndex[speciesName] || null;
  const level = Number(entry?.level) || 1;
  const iv = Number(entry?.iv);
  const moves = Array.isArray(entry?.moves) ? entry.moves : [];

  const baseStats = basePokemon ? {
    HP: basePokemon.hp, Atk: basePokemon.attack, Def: basePokemon.defense,
    SpA: basePokemon.sp_attack, SpD: basePokemon.sp_defense, Spe: basePokemon.speed,
  } : null;

  const battleStats = baseStats ? {
    HP:  calculateGen3Stat(basePokemon.hp,         iv, level, true),
    Atk: calculateGen3Stat(basePokemon.attack,     iv, level, false),
    Def: calculateGen3Stat(basePokemon.defense,    iv, level, false),
    SpA: calculateGen3Stat(basePokemon.sp_attack,  iv, level, false),
    SpD: calculateGen3Stat(basePokemon.sp_defense, iv, level, false),
    Spe: calculateGen3Stat(basePokemon.speed,      iv, level, false),
  } : null;

  return {
    species: entry?.species || "",
    displayName: formatSpeciesName(entry?.species),
    level,
    iv: Number.isFinite(iv) ? iv : null,
    moves,
    basePokemon,
    baseStats,
    battleStats,
  };
}

// =====================================================================
// BOSS HELPERS
// =====================================================================
export function isBossTrainer(trainer) {
  if (!trainer || !trainer.id) return false;
  return BOSS_CLASS_FILTERS.has(String(trainer.class || trainer.trainer_class || ""));
}

export function getBossSortIndex(id) {
  const index = BOSS_PRIORITY.indexOf(id);
  return index === -1 ? 9999 : index;
}

export function inferBossType(trainer) {
  const id = String(trainer?.id || "");
  if (/ROXANNE/.test(id))        return "rock";
  if (/BRAWLY/.test(id))         return "fighting";
  if (/WATTSON/.test(id))        return "electric";
  if (/FLANNERY/.test(id))       return "fire";
  if (/NORMAN/.test(id))         return "normal";
  if (/WINONA/.test(id))         return "flying";
  if (/TATE_AND_LIZA/.test(id))  return "psychic";
  if (/JUAN/.test(id))           return "water";
  if (/SIDNEY/.test(id))         return "dark";
  if (/PHOEBE/.test(id))         return "ghost";
  if (/GLACIA/.test(id))         return "ice";
  if (/DRAKE/.test(id))          return "dragon";
  if (/WALLACE/.test(id))        return "water";
  if (/BRENDAN|MAY/.test(id))    return "grass";
  return "normal";
}

export function getBossBaseId(id) {
  const value = String(id || "");
  if (!value) return "";
  for (const base of BOSS_MULTIWORD_BASES) {
    if (value === base || value.startsWith(`${base}_`)) return base;
  }
  return value.split("_")[0];
}

export function formatBossDisplayName(baseId) {
  return BOSS_DISPLAY_NAMES[baseId] || formatSpeciesName(baseId);
}

export function getBossRoleLabel(trainer) {
  const c = String(trainer?.class || trainer?.trainer_class || "");
  if (c === "TRAINER_CLASS_LEADER")     return "Gym Leader";
  if (c === "TRAINER_CLASS_RIVAL")      return "Rival";
  if (c === "TRAINER_CLASS_ELITE_FOUR") return "Elite Four";
  if (c === "TRAINER_CLASS_CHAMPION")   return "Champion";
  return "Boss";
}

export function getBossVariantLabel(trainer) {
  const c = String(trainer?.class || trainer?.trainer_class || "");
  const id = String(trainer?.id || "");

  if (c === "TRAINER_CLASS_LEADER") {
    const n = Number(id.match(/_(\d+)$/)?.[1] || 1);
    return n <= 1 ? "Initial battle" : `Rematch ${n - 1}`;
  }

  if (c === "TRAINER_CLASS_RIVAL") {
    const route = trainer?.route || (Array.isArray(trainer?.maps) && trainer.maps[0]) || "";
    const starter = id.match(/_(MUDKIP|TREECKO|TORCHIC)$/)?.[1];
    if (route && starter) return `${route} · ${formatSpeciesName(starter)}`;
    if (route) return route;
    if (starter) return formatSpeciesName(starter);
    return "Single battle";
  }

  if (c === "TRAINER_CLASS_ELITE_FOUR") return "League battle";
  if (c === "TRAINER_CLASS_CHAMPION")   return "Champion battle";
  return trainer?.party ? formatSpeciesName(trainer.party) : "Battle";
}

export function getBossVariantSortIndex(trainer) {
  const c = String(trainer?.class || trainer?.trainer_class || "");
  const id = String(trainer?.id || "");

  if (c === "TRAINER_CLASS_LEADER") return Number(id.match(/_(\d+)$/)?.[1] || 1);

  if (c === "TRAINER_CLASS_RIVAL") {
    const route = trainer?.route || (Array.isArray(trainer?.maps) && trainer.maps[0]) || "";
    const routeMatch = route.match(/(\d+)/);
    const routeIndex = routeMatch ? Number(routeMatch[1]) : 999;
    const starter = id.match(/_(MUDKIP|TREECKO|TORCHIC)$/)?.[1];
    const starterIndex = starter ? RIVAL_STARTER_PRIORITY.indexOf(starter) : 99;
    return routeIndex * 10 + (starterIndex === -1 ? 99 : starterIndex);
  }

  return Number(id.match(/_(\d+)$/)?.[1] || 999);
}

export function summarizeBossVariants(trainers) {
  const routes = [];
  const starters = [];
  for (const trainer of trainers) {
    const route = trainer?.route || (Array.isArray(trainer?.maps) && trainer.maps[0]) || "";
    if (route && !routes.includes(route)) routes.push(route);
    const starter = String(trainer?.id || "").match(/_(MUDKIP|TREECKO|TORCHIC)$/)?.[1];
    if (starter) {
      const label = formatSpeciesName(starter);
      if (!starters.includes(label)) starters.push(label);
    }
  }
  if (routes.length === 0 && starters.length === 0) return "Single battle";
  const routeText = routes.length > 0
    ? `${routes.slice(0, 2).join(" / ")}${routes.length > 2 ? ` +${routes.length - 2} more` : ""}` : "";
  const starterText = starters.length > 0
    ? `${starters.slice(0, 3).join(" / ")}${starters.length > 3 ? ` +${starters.length - 3} more` : ""}` : "";
  if (routeText && starterText) return `${routeText} · ${starterText}`;
  return routeText || starterText || "Single battle";
}

export function groupBossTrainers(trainers) {
  const grouped = new Map();
  for (const trainer of trainers) {
    if (!isBossTrainer(trainer)) continue;
    const baseId = getBossBaseId(trainer.id);
    if (!grouped.has(baseId)) grouped.set(baseId, []);
    grouped.get(baseId).push(trainer);
  }

  return Array.from(grouped.entries())
    .map(([key, groupTrainers]) => {
      const sorted = [...groupTrainers].sort((l, r) => {
        const li = getBossVariantSortIndex(l);
        const ri = getBossVariantSortIndex(r);
        if (li !== ri) return li - ri;
        return String(l.id || "").localeCompare(String(r.id || ""));
      });
      const primary = sorted[0] || null;
      const role = getBossRoleLabel(primary);
      const count = sorted.length;
      const alias = BOSS_ID_ALIASES[`${key}_1`] || {};
      const subtitle = role === "Rival"
        ? `${count} ${count === 1 ? "battle" : "battles"} · ${summarizeBossVariants(sorted)}`
        : `${alias.subtitle || formatTrainerSubtitle(primary) || "Battle data"} · ${count} ${count === 1 ? "battle" : "battles"}`;
      return {
        key,
        name: formatBossDisplayName(key),
        role,
        subtitle,
        type: inferBossType(primary),
        trainers: sorted,
      };
    })
    .sort((l, r) => {
      const li = BOSS_GROUP_PRIORITY.indexOf(l.key);
      const ri = BOSS_GROUP_PRIORITY.indexOf(r.key);
      const lp = li === -1 ? 999 : li;
      const rp = ri === -1 ? 999 : ri;
      if (lp !== rp) return lp - rp;
      return l.name.localeCompare(r.name);
    });
}
