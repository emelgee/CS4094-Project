const stageMultipliers = {
    '-6': 0.25,
    '-5': 0.28,
    '-4': 0.33,
    '-3': 0.40,
    '-2': 0.50,
    '-1': 0.67,
    '0':  1.00,
    '1':  1.50,
    '2':  2.00,
    '3':  2.50,
    '4':  3.00,
    '5':  3.50,
    '6':  4.00
};

function getStatMultiplier(stage) {
    return stageMultipliers[String(stage)];
}

module.exports = { getStatMultiplier };