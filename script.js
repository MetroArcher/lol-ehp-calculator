function mixedEHP(hp, armor, mr, physShare) {
    const magicShare = 1 - physShare;

    const damageFraction =
        physShare / (1 + armor / 100) +
        magicShare / (1 + mr / 100);

    return hp / damageFraction;
}

let ITEM_IMG_BASE = "";
let components = [];
let fullItems = [];

async function loadItemsFromRiot() {
    try {
        const versionsResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
        const versions = await versionsResponse.json();
        const latestPatch = versions[0];

        ITEM_IMG_BASE = `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/item/`;

        const itemResponse = await fetch(
            `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/data/en_US/item.json`
        );
        const itemData = await itemResponse.json();

        const allItems = Object.entries(itemData.data).map(([id, item]) => {
            const stats = item.stats || {};

            return {
                id: Number(id),
                name: item.name,
                cost: item.gold?.total || 0,
                purchasable: item.gold?.purchasable ?? true,
                hp: stats.FlatHPPoolMod || 0,
                armor: stats.FlatArmorMod || 0,
                mr: stats.FlatSpellBlockMod || 0,
                tags: item.tags || [],
                maps: item.maps || {},
                into: item.into || [],
                from: item.from || [],
                inStore: item.inStore,
                hideFromAll: item.hideFromAll,
                requiredChampion: item.requiredChampion,
                requiredAlly: item.requiredAlly,
                specialRecipe: item.specialRecipe
            };
        });

        const filteredDefensiveItems = allItems.filter(item => {
            const hasRelevantStats = item.hp > 0 || item.armor > 0 || item.mr > 0;

            const onSummonersRift = item.maps["11"] === true;
            const isPurchasable = item.purchasable === true;

            const isBoots = item.tags.includes("Boots");
            const isConsumable = item.tags.includes("Consumable");
            const isJungle = item.tags.includes("Jungle");
            const isTrinket = item.tags.includes("Trinket");

            const isHidden = item.hideFromAll === true;
            const isNotInStore = item.inStore === false;
            const isChampionSpecific = !!item.requiredChampion;
            const isAllySpecific = !!item.requiredAlly;
            const isSpecialRecipeOnly = item.specialRecipe != null;
            const excludedItems = [
                "Shield of Molten Stone",
                "Cruelty",
                "Atma's Reckoning",
                "Cloak of Starry Night",
                "Gargoyle Stoneplate",
                "Crown of the Shattered Queen",
                "Flesheater",
                "Sword of Blossoming Dawn",

            ];
            const isBlacklisted = excludedItems.includes(item.name);

            return (
                hasRelevantStats &&
                onSummonersRift &&
                isPurchasable &&
                !isBoots &&
                !isConsumable &&
                !isJungle &&
                !isTrinket &&
                !isHidden &&
                !isNotInStore &&
                !isChampionSpecific &&
                !isAllySpecific &&
                !isSpecialRecipeOnly &&
                !isBlacklisted
            );
        });

        const uniqueItems = Object.values(
            filteredDefensiveItems.reduce((acc, item) => {
                if (!acc[item.name]) {
                    acc[item.name] = item;
                }
                return acc;
            }, {})
        );

        components = uniqueItems.filter(item => {
            const correctCost = item.cost >= 300 && item.cost < 2000;
            const buildsIntoSomething = item.into.length > 0;

            return correctCost && buildsIntoSomething;
        });

        fullItems = uniqueItems.filter(item => {
            const correctCost = item.cost >= 2000;
            const isFinishedItem = item.into.length === 0;

            return correctCost && isFinishedItem;
        });

        console.log("Latest patch:", latestPatch);
        console.log("Loaded components:", components);
        console.log("Loaded full items:", fullItems);
        

    } catch (error) {
        console.error("Failed to load Riot item data:", error);
    }
}

async function initializeCalculator() {
    await loadItemsFromRiot();

    document.getElementById("calculate").addEventListener("click", function () {
        const hp = Number(document.getElementById("hp").value);
        const armor = Number(document.getElementById("armor").value);
        const mr = Number(document.getElementById("mr").value);
        const phys = Number(document.getElementById("phys").value) / 100;

        const ehp = mixedEHP(hp, armor, mr, phys);

        document.getElementById("result").textContent =
            "Effective HP: " + ehp.toFixed(2);

        const budget = 1000;
        const HP_COST = 8 / 3;
        const ARMOR_COST = 20;
        const MR_COST = 20;

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
            Theoretical Gold allocation comparison (1000 gold):<br>
            All HP (+${hpAdded.toFixed(0)} HP) → EHP Gain: +${ehpGainAllHp.toFixed(2)}<br>
            All Armor (+${armorAdded} Armor) → EHP Gain: +${ehpGainAllArmor.toFixed(2)}<br>
            All MR (+${mrAdded} MR) → EHP Gain: +${ehpGainAllMr.toFixed(2)}<br>
            `;

        const gold = Number(document.getElementById("gold").value);
        const bestItems = bestItemCombination(hp, armor, mr, phys, gold);
        const itemGain = bestItems.finalEhp - ehp;
        const itemEhpPerGold = itemGain / gold;
        const itemSummary = bestItems.items.length ? summarizeItems(bestItems.items) : "None";

        document.getElementById("itemResult").innerHTML =
            `Best item combination (${gold} gold):<br>
            Items: ${itemSummary}<br>
            Added stats: +${bestItems.hp} HP, +${bestItems.armor} Armor, +${bestItems.mr} MR<br>
            EHP Gain: +${itemGain.toFixed(2)}<br>
            Final EHP: ${bestItems.finalEhp.toFixed(2)}<br>
            EHP / Gold: ${itemEhpPerGold.toFixed(4)}`;

        const fullItemResults = rankFullItemsByEHP(hp, armor, mr, phys);
        const bestByEfficiency = [...fullItemResults]
            .sort((a, b) => b.ehpPerGold - a.ehpPerGold)
            .slice(0, 8);

        let rankingHtml = "<div class='item-container'>";

        for (const item of bestByEfficiency) {
            rankingHtml += `
                <div class="item-card">
                    <div class="item-header">
                        <img class="item-icon" src="${ITEM_IMG_BASE}${item.id}.png" alt="${item.name}">
                        <div class="item-name">${item.name}</div>
                    </div>

                    <div class="item-stats">
                        <div>HP: +${item.hp}</div>
                        <div>Armor: +${item.armor}</div>
                        <div>MR: +${item.mr}</div>
                    </div>

                    <div class="item-metrics">
                        <div>Cost: ${item.cost}g</div>
                        <div>EHP Gain: ${item.ehpGain.toFixed(2)}</div>
                        <div>EHP / Gold: ${item.ehpPerGold.toFixed(4)}</div>
                    </div>
                </div>
            `;
        }

        rankingHtml += "</div>";

        document.getElementById("fullItemRanking").innerHTML = rankingHtml;
    });
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
            id: item.id,
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

initializeCalculator();