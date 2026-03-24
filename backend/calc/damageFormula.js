const { getTypeEffectiveness } = require('./typeChart');
const { getWeatherModifier } = require('./weatherModifiers');
const { getStatMultiplier } = require('./statStages');
const { getItemModifier } = require('./items');
function calculateDamage(attacker, defender, move, conditions) 
{
    // If not physical, then special
    const physicalTypes = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel'];
    const isPhysical = physicalTypes.includes(move.type.toLowerCase());

    const atk = isPhysical ? attacker.attack : attacker.sp_attack;
    const def = isPhysical ? defender.defense : defender.sp_defense;

    const atkStage = isPhysical ? attacker.atkStage : attacker.spAtkStage;
    const defStage = isPhysical ? defender.defStage : defender.spDefStage;
    
    const finalAtkStage = conditions.isCrit ? Math.max(0, atkStage) : atkStage;
    const finalDefStage = conditions.isCrit ? Math.min(0, defStage) : defStage;

    const finalAtk = atk * getStatMultiplier(finalAtkStage);
    const finalDef = def * getStatMultiplier(finalDefStage);

    // base damage formula
    const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * move.basePower * finalAtk / finalDef) / 50 + 2);

    // stab mod
    const stab = (attacker.type1 === move.type.toLowerCase() || attacker.type2 === move.type.toLowerCase()) ? 1.5 :1;

    // type mod
    const typeEffectiveness = getTypeEffectiveness(move.type.toLowerCase(), defender.type1.toLowerCase(), defender.type2 ? defender.type2.toLowerCase() : null);
    
    // weather mod
    const weather = getWeatherModifier(move.type.toLowerCase(), conditions.weather);

    //crit mod
    const crit = conditions.isCrit ? 2 : 1;

    //burn mod
    const burn = (conditions.isBurned && isPhysical) ? 0.5 : 1;

    //item mod
    const item = getItemModifier(attacker.item, move.type.toLowerCase(), isPhysical);

    //min damage(0.85 multiplier)
    const min = Math.floor(baseDamage * stab * typeEffectiveness * weather * crit * burn * item * 0.85);
    //"max" damage(1 multiplier)
    const max = Math.floor(baseDamage * stab * typeEffectiveness * weather * crit * burn * item * 1.0);

    return { min, max };

}

module.exports = { calculateDamage };
