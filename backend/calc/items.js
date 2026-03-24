function getItemModifier(item, moveType, isPhysical)
{

    //base items
    if (item === 'black_belt' && moveType === 'fighting') return 1.1;
    if (item === 'black_glasses' && moveType === 'dark') return 1.1;
    if (item === 'charcoal' && moveType === 'fire') return 1.1;
    if (item === 'dragon_fang' && moveType === 'dragon') return 1.1;
    if (item === 'hard_stone' && moveType === 'rock') return 1.1;
    if (item === 'magnet' && moveType === 'electric') return 1.1;
    if (item === 'metal_coat' && moveType === 'steel') return 1.1;
    if (item === 'miracle_seed' && moveType === 'grass') return 1.1;
    if (item === 'mystic_water' && moveType === 'water') return 1.1;
    if (item === 'never_melt_ice' && moveType === 'ice') return 1.1;
    if (item === 'poison_barb' && moveType === 'poison') return 1.1;
    if (item === 'sea_incense' && moveType === 'water') return 1.05;
    if (item === 'sharp_beak' && moveType === 'flying') return 1.1;
    if (item === 'silk_scarf' && moveType === 'normal') return 1.1;
    if (item === 'silver_powder' && moveType === 'bug') return 1.1;
    if (item === 'soft_sand' && moveType === 'ground') return 1.1;
    if (item === 'spell_tag' && moveType === 'ghost') return 1.1;
    if (item === 'twisted_spoon' && moveType === 'psychic') return 1.1;
    if (item === 'choice_band' && isPhysical) return 1.5;

    //pokemon specific items
    
    return 1;
}

module.exports = { getItemModifier };