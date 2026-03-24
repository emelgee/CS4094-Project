function getWeatherModifier(moveType, weather) 
{
    if (weather === 'sun')
    {
        if (moveType === 'fire') return 1.5;
        if (moveType === 'water') return 0.5;
    }

    if (weather === 'rain')
    {
        if(moveType === 'fire') return 0.5;
        if(moveType === 'water') return 1.5;
    }
    
    return 1;
}

module.exports = { getWeatherModifier };