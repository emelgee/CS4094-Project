const typeChart = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, ghost: 0 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5, steel: 0.5 },
  dragon:   { dragon: 2, steel: 0.5 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, steel: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 },
};

const stageMultipliers = {
  "-6": 0.25, "-5": 0.28, "-4": 0.33, "-3": 0.40, "-2": 0.50, "-1": 0.67,
  "0": 1.00, "1": 1.50, "2": 2.00, "3": 2.50, "4": 3.00, "5": 3.50, "6": 4.00,
};

const PHYSICAL_TYPES = new Set([
  "normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel",
]);

export function getTypeEffectiveness(moveType, defType1, defType2) {
  const row = typeChart[moveType];
  if (!row) return 1;
  const mult1 = row[defType1] ?? 1;
  const mult2 = defType2 ? (row[defType2] ?? 1) : 1;
  return mult1 * mult2;
}

export const TYPE_LIST = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting",
  "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
  "dragon", "dark", "steel",
];

function getWeatherModifier(moveType, weather) {
  if (weather === "sun")  { if (moveType === "fire") return 1.5; if (moveType === "water") return 0.5; }
  if (weather === "rain") { if (moveType === "fire") return 0.5; if (moveType === "water") return 1.5; }
  return 1;
}

function getStatMultiplier(stage) {
  return stageMultipliers[String(stage)] ?? 1;
}

function getItemModifier(item, moveType, isPhysical) {
  if (item === "black_belt"     && moveType === "fighting") return 1.1;
  if (item === "black_glasses"  && moveType === "dark")     return 1.1;
  if (item === "charcoal"       && moveType === "fire")     return 1.1;
  if (item === "dragon_fang"    && moveType === "dragon")   return 1.1;
  if (item === "hard_stone"     && moveType === "rock")     return 1.1;
  if (item === "magnet"         && moveType === "electric") return 1.1;
  if (item === "metal_coat"     && moveType === "steel")    return 1.1;
  if (item === "miracle_seed"   && moveType === "grass")    return 1.1;
  if (item === "mystic_water"   && moveType === "water")    return 1.1;
  if (item === "never_melt_ice" && moveType === "ice")      return 1.1;
  if (item === "poison_barb"    && moveType === "poison")   return 1.1;
  if (item === "sea_incense"    && moveType === "water")    return 1.05;
  if (item === "sharp_beak"     && moveType === "flying")   return 1.1;
  if (item === "silk_scarf"     && moveType === "normal")   return 1.1;
  if (item === "silver_powder"  && moveType === "bug")      return 1.1;
  if (item === "soft_sand"      && moveType === "ground")   return 1.1;
  if (item === "spell_tag"      && moveType === "ghost")    return 1.1;
  if (item === "twisted_spoon"  && moveType === "psychic")  return 1.1;
  if (item === "choice_band"    && isPhysical)              return 1.5;
  return 1;
}

/**
 * Gen 3 damage formula.
 *
 * attacker:   { level, attack, sp_attack, type1, type2, item, atkStage, spAtkStage }
 * defender:   { defense, sp_defense, type1, type2, defStage, spDefStage }
 * move:       { type, basePower }
 * conditions: { isCrit, isBurned, weather, reflect, lightScreen, helpingHand, explosion }
 *
 * Returns { min, max, rolls } — rolls is all 16 values (r = 85..100).
 */
export function calculateDamage(attacker, defender, move, conditions = {}) {
  const moveType   = (move.type || "normal").toLowerCase();
  const isPhysical = PHYSICAL_TYPES.has(moveType);

  // Crits ignore negative atk stages and positive def stages
  const atkStage = isPhysical ? (attacker.atkStage ?? 0) : (attacker.spAtkStage ?? 0);
  const defStage = isPhysical ? (defender.defStage ?? 0) : (defender.spDefStage ?? 0);
  const finalAtkStage = conditions.isCrit ? Math.max(0, atkStage) : atkStage;
  const finalDefStage = conditions.isCrit ? Math.min(0, defStage) : defStage;

  const atk = (isPhysical ? attacker.attack : attacker.sp_attack) * getStatMultiplier(finalAtkStage);

  // Sandstorm: Rock types get 1.5× SpD on special moves
  // Explosion/Self-Destruct: halves the defender's defense stat
  let defBase = isPhysical ? defender.defense : defender.sp_defense;
  const defT1 = String(defender.type1 || "").toLowerCase();
  const defT2 = String(defender.type2 || "").toLowerCase();
  if (conditions.weather === "sand" && !isPhysical && (defT1 === "rock" || defT2 === "rock")) {
    defBase = Math.floor(defBase * 1.5);
  }
  if (conditions.explosion && isPhysical) defBase = Math.max(1, Math.floor(defBase * 0.5));
  const def = defBase * getStatMultiplier(finalDefStage);

  // Helping Hand boosts the move's base power by 1.5×
  const power = (Number(move.basePower) || 0) * (conditions.helpingHand ? 1.5 : 1);
  if (!atk || power <= 0 || !def || def <= 0) return { min: 0, max: 0, rolls: [] };

  const baseDamage = Math.floor(
    (((2 * attacker.level) / 5 + 2) * power * atk) / def / 50 + 2
  );

  const stab = (moveType === String(attacker.type1 || "").toLowerCase() ||
                moveType === String(attacker.type2 || "").toLowerCase()) ? 1.5 : 1;

  const typeEff = getTypeEffectiveness(
    moveType,
    String(defender.type1 || "normal").toLowerCase(),
    defender.type2 ? String(defender.type2).toLowerCase() : null
  );

  const weather = getWeatherModifier(moveType, conditions.weather || "");
  const crit    = conditions.isCrit ? 2 : 1;
  const burn    = conditions.isBurned && isPhysical ? 0.5 : 1;
  const item    = getItemModifier(attacker.item || null, moveType, isPhysical);

  // Reflect/Light Screen halve damage; crits bypass screens
  const screen = !conditions.isCrit && (
    (isPhysical && conditions.reflect) || (!isPhysical && conditions.lightScreen)
  ) ? 0.5 : 1;

  const raw = baseDamage * stab * typeEff * weather * crit * burn * item * screen;
  const rolls = [];
  for (let r = 85; r <= 100; r++) rolls.push(Math.floor(raw * r / 100));

  return { min: rolls[0], max: rolls[15], rolls };
}
