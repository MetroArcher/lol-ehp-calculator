function mixedEHP(hp, armor, mr, physShare) {
    const magicShare = 1 - physShare;

    const damageFraction =
        physShare / (1 + armor / 100) +
        magicShare / (1 + mr / 100);

    return hp / damageFraction;
}

const components = [
    { name: "Cloth Armor", cost: 300, hp: 0, armor: 15, mr: 0 },
    { name: "Null-Magic Mantle", cost: 450, hp: 0, armor: 0, mr: 20 },
    { name: "Ruby Crystal", cost: 400, hp: 150, armor: 0, mr: 0 },
    { name: "Chain Vest", cost: 800, hp: 0, armor: 40, mr: 0 },
    { name: "Negatron Cloak", cost: 900, hp: 0, armor: 0, mr: 50 },
    { name: "Giant's Belt", cost: 900, hp: 350, armor: 0, mr: 0 }    
];
const fullItems = [ 
    { name: "Jak'Sho, The Protean", cost: 3200, hp: 350, armor: 45, mr: 45},
    { name: "Protoplasm Harness", cost: 2500, hp: 600, armor: 0, mr: 0 },
    { name: "Warmog's Armor", cost: 3100, hp: 1120, armor: 0, mr: 0 },
    { name: "Kaenic Rookern", cost: 2900, hp: 400, armor: 0, mr: 80 },
    { name: "Hollow Radiance", cost: 2800, hp: 400, armor: 0, mr: 40 },
    { name: "Thornmail", cost: 2450, hp: 150, armor: 75, mr: 0 },
    { name: "Sunfire Aegis", cost: 2700, hp: 350, armor: 50, mr: 0 },
    { name: "Randuin's Omen", cost: 2700, hp: 350, armor: 75, mr: 0 },
    { name: "Force of Nature", cost: 2800, hp: 400, armor: 0, mr: 55 },
    { name: "Spirit Visage", cost: 2700, hp: 400, armor: 0, mr: 50 },
    { name: "Frozen Heart", cost: 2500, hp: 0, armor: 75, mr: 0 }
]

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
function bestItemCombination(baseHp, baseArmor, baseMr, physShare, budget) {

    let bestResult = {
        finalEhp: mixedEHP(baseHp, baseArmor, baseMr, physShare),
        cost: 0,
        hp: 0,
        armor: 0,
        mr: 0,
        items: []
    };

    function search(start, cost, hp, armor, mr, items) {

        const ehp = mixedEHP(
            baseHp + hp,
            baseArmor + armor,
            baseMr + mr,
            physShare
        );

        if (ehp > bestResult.finalEhp) {
            bestResult = {
                finalEhp: ehp,
                cost,
                hp,
                armor,
                mr,
                items: [...items]
            };
        }

        for (let i = start; i < components.length; i++) {

            const item = components[i];

            if (cost + item.cost > budget) continue;

            items.push(item.name);

            search(
                i,
                cost + item.cost,
                hp + item.hp,
                armor + item.armor,
                mr + item.mr,
                items
            );

            items.pop();
        }
    }

    search(0, 0, 0, 0, 0, []);

    return bestResult;
}
function summarizeItems(items) {
    const counts = {};

    for (const item of items) {
        counts[item] = (counts[item] || 0) + 1;
    }

    return Object.entries(counts)
        .map(([name, count]) => `${count}x ${name}`)
        .join(", ");
}

function rankFullItemsByEHP(baseHp, baseArmor, baseMr, physShare) {

    const baseEhp = mixedEHP(baseHp, baseArmor, baseMr, physShare);

    const results = fullItems.map(item => {

        const newHp = baseHp + item.hp;
        const newArmor = baseArmor + item.armor;
        const newMr = baseMr + item.mr;

        const finalEhp = mixedEHP(newHp, newArmor, newMr, physShare);

        const ehpGain = finalEhp - baseEhp;

        return {
            name: item.name,
            cost: item.cost,
            hp: item.hp,
            armor: item.armor,
            mr: item.mr,
            finalEhp: finalEhp,
            ehpGain: ehpGain,
            ehpPerGold: ehpGain / item.cost
        };

    });

    return results;
}
document.getElementById("phys").addEventListener("input", function() {
    const phys = Number(this.value);
    const magic = 100 - phys;

    document.getElementById("magicInfo").textContent =
        `Magic Damage: ${magic}%`;
});
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

    const bestGain = bestResult.finalEhp - ehp;
    document.getElementById("bestResult").textContent =
        "Theoretical Best use of 1000 gold: +" +
        bestResult.addedHp.toFixed(1) + " HP, +" +
        bestResult.addedArmor + " Armor, +" +
        bestResult.addedMr + " MR. EHP Gain: +" +
        bestGain.toFixed(2) +
        ". Final EHP: " + bestResult.finalEhp.toFixed(2);

    const hpAdded = budget / HP_COST;
    const ehpAllHp = mixedEHP(hp + hpAdded, armor, mr, phys);

    const armorAdded = Math.floor(budget / ARMOR_COST);
    const ehpAllArmor = mixedEHP(hp, armor + armorAdded, mr, phys);

    const mrAdded = Math.floor(budget / MR_COST);
    const ehpAllMr = mixedEHP(hp, armor, mr + mrAdded, phys);
    
    const ehpGainAllHp = ehpAllHp - ehp;
    const ehpGainAllArmor = ehpAllArmor - ehp;
    const ehpGainAllMr = ehpAllMr - ehp;
    document.getElementById("comparison").innerHTML =
        `
        Theoretical Gold allocation comparison (1000 gold):<br><br>
        All HP (+${hpAdded.toFixed(0)} HP) → EHP Gain: +${ehpGainAllHp.toFixed(2)}<br>
        All Armor (+${armorAdded} Armor) → EHP Gain: +${ehpGainAllArmor.toFixed(2)}<br>
        All MR (+${mrAdded} MR) → EHP Gain: +${ehpGainAllMr.toFixed(2)}<br>
        `;
    const gold = Number(document.getElementById("gold").value);

    const bestItems = bestItemCombination(hp, armor, mr, phys, gold);
    const itemGain = bestItems.finalEhp - ehp;
    const itemSummary = bestItems.items.length ? summarizeItems(bestItems.items) : "None";
    const itemEhpPerGold = itemGain / gold;
    document.getElementById("itemResult").innerHTML =
        `Best item combination (${gold} gold):<br>
        Items: ${itemSummary}<br>
        Added stats: +${bestItems.hp} HP, +${bestItems.armor} Armor, +${bestItems.mr} MR<br>
        EHP Gain: +${itemGain.toFixed(2)}<br>
        Final EHP: ${bestItems.finalEhp.toFixed(2)}<br>
        EHP / Gold: ${itemEhpPerGold.toFixed(4)}`; 
    const fullItemResults = rankFullItemsByEHP(hp, armor, mr, phys);
    const bestByGain = [...fullItemResults].sort((a,b) => b.ehpGain - a.ehpGain);
    const bestByEfficiency = [...fullItemResults]
        .sort((a,b) => b.ehpPerGold - a.ehpPerGold)
        .slice(0,5);
    
    let rankingHtml = "<div class='item-container'>";

    for (const item of bestByEfficiency) {

        rankingHtml += `
            <div class="item-card">
                <strong>${item.name}</strong><br>
                Cost: ${item.cost}g<br>
                +${item.hp} HP<br>
                +${item.armor} Armor<br>
                +${item.mr} MR<br><br>
                EHP Gain: +${item.ehpGain.toFixed(2)}<br>
                EHP / Gold: ${item.ehpPerGold.toFixed(4)}
            </div>
        `;
    }

    rankingHtml += "</div>";

    document.getElementById("fullItemRanking").innerHTML = rankingHtml;    
});
