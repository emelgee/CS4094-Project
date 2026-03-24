const { getTypeEffectiveness } = require('./typeChart');
const { getWeatherModifier } = require('./weatherModifiers');
function calculateDamage(attacker, defender, move, conditions) 
{
    // If not physical, then special
    const physicalTypes = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel'];
    const isPhysical = physicalTypes.includes(move.type);

    const atk = isPhysical ? attacker.attacl : attacker.sp_attack;
    const def = isPhysical ? defender.defense : defender.sp_defense;

    // base damage formula
    const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * move.basePower * atk / def) / 50 + 2);

    // stab mod
    const stab = (attacker.type1 === move.type || attacker.type2 === move.type) ? 1.5 :1;

    // type mod
    const typeEffectiveness = getTypeEffectiveness(move.type.toLowerCase(), defender.type1.toLowerCase(), defender.type2 ? defender.type2.toLowerCase() : null);
    
    // weather mod
    const weather = getWeatherModifier(move.type, conditions.weather);

    const crit = conditions.isCrit ? 2 : 1;

    const burn = (conditions.isBurned && isPhysical) ? 0.5 : 1;

}

module.exports = { calculateDamage };
