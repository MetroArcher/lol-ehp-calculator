function mixedEHP(hp, armor, mr, physShare) {
    const magicShare = 1 - physShare;

    const damageFraction =
        physShare / (1 + armor / 100) +
        magicShare / (1 + mr / 100);

    return hp / damageFraction;
}

function bestStatsForBudget(hp, armor, mr, physShare, budget) {
    const hpCost = 8/3;
    const armorCost = 20;
    const mrCost = 20;

    let bestResult = {
        addedHp: 0,
        addedArmor: 0,
        addedMr: 0,
        finalEhp: mixedEHP(hp, armor, mr, physShare),
        spentGold: 0
    };

    const maxArmorToTry = Math.floor(budget / armorCost);
    const maxMrToTry = Math.floor(budget / mrCost);

    for (let addedArmor = 0; addedArmor <= maxArmorToTry; addedArmor++) {
        for (let addedMr = 0; addedMr <= maxMrToTry; addedMr++) {
            const goldSpentOnResists = addedArmor * armorCost + addedMr * mrCost;

            if (goldSpentOnResists > budget) {
                continue;
            }

            const goldLeft = budget - goldSpentOnResists;
            const addedHp = goldLeft / hpCost;

            const newHp = hp + addedHp;
            const newArmor = armor + addedArmor;
            const newMr = mr + addedMr;

            const ehp = mixedEHP(newHp, newArmor, newMr, physShare);

            if (ehp > bestResult.finalEhp) {
                bestResult = {
                    addedHp: addedHp,
                    addedArmor: addedArmor,
                    addedMr: addedMr,
                    finalEhp: ehp,
                    spentGold: budget
                };
            }
        }
    }

    return bestResult;
}



document.getElementById("calculate").addEventListener("click", function () {
    const hp = Number(document.getElementById("hp").value);
    const armor = Number(document.getElementById("armor").value);
    const mr = Number(document.getElementById("mr").value);
    const phys = Number(document.getElementById("phys").value) / 100;

    const budget = 1000;
    const HP_COST = 8 / 3;
    const ARMOR_COST = 20;
    const MR_COST = 20;

    const ehp = mixedEHP(hp, armor, mr, phys);

    document.getElementById("result").textContent =
        "Effective HP: " + ehp.toFixed(2);

    const bestResult = bestStatsForBudget(hp, armor, mr, phys, budget);

    document.getElementById("bestResult").textContent =
        "Best use of 1000 gold: +" +
        bestResult.addedHp.toFixed(1) + " HP, +" +
        bestResult.addedArmor + " Armor, +" +
        bestResult.addedMr + " MR. Final EHP: " +
        bestResult.finalEhp.toFixed(2);

    const hpAdded = budget / HP_COST;
    const ehpAllHp = mixedEHP(hp + hpAdded, armor, mr, phys);

    const armorAdded = Math.floor(budget / ARMOR_COST);
    const ehpAllArmor = mixedEHP(hp, armor + armorAdded, mr, phys);

    const mrAdded = Math.floor(budget / MR_COST);
    const ehpAllMr = mixedEHP(hp, armor, mr + mrAdded, phys);

    document.getElementById("comparison").innerHTML =
        `
        Gold allocation comparison (1000 gold):<br><br>
        All HP(+${hpAdded}HP) → EHP: ${ehpAllHp.toFixed(2)}<br>
        All Armor(+${armorAdded}Armor) → EHP: ${ehpAllArmor.toFixed(2)}<br>
        All MR(+${mrAdded}MR) → EHP: ${ehpAllMr.toFixed(2)}<br><br>
        Optimal mix → EHP: ${bestResult.finalEhp.toFixed(2)}
        `;
});
