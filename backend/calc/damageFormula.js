function calculateDamage(attacker, defender, move, conditions) 
{

}

module.exports = { calculateDamage };

// If not physical, then special
const physicalTypes = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel'];
const isPhysical = physicalTypes.includes(move.type);

const atk = isPhysical ? attacker.attacl : attacker.sp_attack;
const def = isPhysical ? defender.defense : defender.sp_defense;

// Base damage formula
const baseDamage = Math.floor(((2 * attacker.level / 5 + 2) * move.basePower * atk / def) / 50 + 2);

const stab = (attacker.type1 === move.type || attacker.type2 === move.type) ? 1.5 :1;