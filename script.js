function mixedEHP(hp, armor, mr, physShare, pen) {
    const magicShare = 1 - physShare;

    const { effectiveArmor, effectiveMr } = getEffectiveResists(armor, mr, pen);

    const damageFraction =
        physShare / (1 + effectiveArmor / 100) +
        magicShare / (1 + effectiveMr / 100);

    return hp / damageFraction;
}

let ITEM_IMG_BASE = "";
let components = [];
let fullItems = [];
let showAllFullItems = false;
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

    document.getElementById("calculate").addEventListener("click", runCalculation);

    const existingBonusHpInput = document.getElementById("existingBonusHp");
    const existingBonusArmorInput = document.getElementById("existingBonusArmor");
    const existingBonusMrInput = document.getElementById("existingBonusMr");
    const champLevelInput = document.getElementById("champLevel");

    function isVisible(id) {
        const el = document.getElementById(id);
        return el && el.style.display !== "none";
    }

    if (existingBonusHpInput) {
        existingBonusHpInput.addEventListener("input", function () {
            if (isVisible("warmogBonusHpBox")) {
                runCalculation();
            }
        });
    }

    if (existingBonusArmorInput) {
        existingBonusArmorInput.addEventListener("input", function () {
            if (
                isVisible("jakshoArmorBox") ||
                isVisible("jakshoMrBox") ||
                isVisible("protoplasmLevelBox")
            ) {
                runCalculation();
            }
        });
    }

    if (existingBonusMrInput) {
        existingBonusMrInput.addEventListener("input", function () {
            if (
                isVisible("jakshoArmorBox") ||
                isVisible("jakshoMrBox") ||
                isVisible("protoplasmLevelBox")
            ) {
                runCalculation();
            }
        });
    }

    if (champLevelInput) {
        champLevelInput.addEventListener("input", function () {
            if (isVisible("protoplasmLevelBox")) {
                runCalculation();
            }
        });
    }

    const toggleFullItemViewButton = document.getElementById("toggleFullItemView");
    if (toggleFullItemViewButton) {
        toggleFullItemViewButton.addEventListener("click", function () {
            showAllFullItems = !showAllFullItems;
            this.textContent = showAllFullItems ? "Show Top 8 Only" : "Show All Items";
            runCalculation();
        });
    }
}
function runCalculation(){
    const hp = Number(document.getElementById("hp").value);
        const armor = Number(document.getElementById("armor").value);
        const mr = Number(document.getElementById("mr").value);
        const phys = Number(document.getElementById("phys").value) / 100;
        const lethality = Number(document.getElementById("lethality").value);
        const percentArmorPen = Number(document.getElementById("armorPen").value) / 100;
        const flatMagicPen = Number(document.getElementById("magicPen").value);
        const percentMagicPen = Number(document.getElementById("magicPenPercent").value) / 100;

        const pen = {
            lethality,
            percentArmorPen,
            flatMagicPen,
            percentMagicPen
        };
        const ehp = mixedEHP(hp, armor, mr, phys, pen);

        document.getElementById("result").textContent =
            "Effective HP: " + ehp.toFixed(2);

        const budget = 1000;
        const HP_COST = 8 / 3;
        const ARMOR_COST = 20;
        const MR_COST = 20;

        const bestResult = bestStatsForBudget(hp, armor, mr, phys, budget, pen);
        const bestGain = bestResult.finalEhp - ehp;

        document.getElementById("bestResult").textContent =
            "Theoretical Best use of 1000 gold: +" +
            bestResult.addedHp.toFixed(1) + " HP, +" +
            bestResult.addedArmor + " Armor, +" +
            bestResult.addedMr + " MR. EHP Gain: +" +
            bestGain.toFixed(2) +
            ". Final EHP: " + bestResult.finalEhp.toFixed(2);

        const hpAdded = budget / HP_COST;
        const ehpAllHp = mixedEHP(hp + hpAdded, armor, mr, phys, pen);

        const armorAdded = Math.floor(budget / ARMOR_COST);
        const ehpAllArmor = mixedEHP(hp, armor + armorAdded, mr, phys, pen);

        const mrAdded = Math.floor(budget / MR_COST);
        const ehpAllMr = mixedEHP(hp, armor, mr + mrAdded, phys, pen);

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
        const bestItems = bestItemCombination(hp, armor, mr, phys, gold, pen);
        const itemGain = bestItems.finalEhp - ehp;
        const actualGoldSpent = bestItems.cost;
        const itemEhpPerGold = actualGoldSpent > 0 ? itemGain / actualGoldSpent : 0;
        const itemSummary = bestItems.items.length ? summarizeItems(bestItems.items) : "None";

        document.getElementById("itemResult").innerHTML =
            `Best component combination (budget: ${gold}g):<br>
            Items: ${itemSummary}<br>
            Gold used: ${actualGoldSpent}g / ${gold}g<br>
            Added stats: +${bestItems.hp} HP, +${bestItems.armor} Armor, +${bestItems.mr} MR<br>
            EHP Gain: +${itemGain.toFixed(2)}<br>
            Final EHP: ${bestItems.finalEhp.toFixed(2)}<br>
            EHP / Gold Spent: ${itemEhpPerGold.toFixed(4)}`;
        const existingBonusHpInput = document.getElementById("existingBonusHp");
        const existingBonusArmorInput = document.getElementById("existingBonusArmor");
        const existingBonusMrInput = document.getElementById("existingBonusMr");
        const champLevelInput = document.getElementById("champLevel");

        const existingBonusHp = Number(existingBonusHpInput?.value || 0);
        const existingBonusArmor = Number(existingBonusArmorInput?.value || 0);
        const existingBonusMr = Number(existingBonusMrInput?.value || 0);
        const champLevel = Math.max(1, Math.min(20, Number(champLevelInput?.value || 20)));

        const fullItemResults = rankFullItemsByEHP(
            hp,
            armor,
            mr,
            phys,
            pen,
            existingBonusHp,
            existingBonusArmor,
            existingBonusMr,
            champLevel
        );

        const sortedFullItemResults = [...fullItemResults]
            .sort((a, b) => b.basePerGold - a.basePerGold);

        const displayedItems = showAllFullItems
            ? sortedFullItemResults
            : sortedFullItemResults.slice(0, 8);
        let rankingHtml = "<div class='item-container'>";

        const protoplasmShown = displayedItems.some(item => item.name === "Protoplasm Harness");
        const warmogShown = displayedItems.some(item => item.name === "Warmog's Armor");
        const jakshoShown = displayedItems.some(item => item.name === "Jak'Sho, The Protean");

        const protoplasmLevelBox = document.getElementById("protoplasmLevelBox");
        const warmogBox = document.getElementById("warmogBonusHpBox");
        const jakshoArmorBox = document.getElementById("jakshoArmorBox");
        const jakshoMrBox = document.getElementById("jakshoMrBox");


        if (warmogBox) {
            warmogBox.style.display = warmogShown ? "block" : "none";
        }

        if (jakshoArmorBox) {
            jakshoArmorBox.style.display = jakshoShown ? "block" : "none";
        }

        if (jakshoMrBox) {
            jakshoMrBox.style.display = jakshoShown ? "block" : "none";
        }
        if (protoplasmLevelBox) {
            protoplasmLevelBox.style.display = protoplasmShown ? "block" : "none";
        }
        
                

        for (const item of displayedItems) {
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
                        <div>Base EHP Gain: ${item.baseGain.toFixed(2)}</div>
                        <div>Base EHP / Gold: ${item.basePerGold.toFixed(4)}</div>
                    </div>

                    ${item.passiveGain > 0 ? `
                        <div class="item-passive">
                            <div class="item-passive-title">Passive contribution</div>
                            <div>Passive EHP Gain: ${item.passiveGain.toFixed(2)}</div>
                            <div>Stacked Total EHP Gain: ${item.totalGain.toFixed(2)}</div>
                            <div>Stacked Total EHP / Gold: ${item.totalPerGold.toFixed(4)}</div>
                            <div class="item-passive-text">${item.passiveText}</div>
                            <div class="item-passive-text"><em>${item.passiveStateText}</em></div>
                        </div>
                    ` : ""}
                </div>
            `;
        }

        rankingHtml += "</div>";
        const { effectiveArmor, effectiveMr } = getEffectiveResists(armor, mr, pen);
        document.getElementById("fullItemRanking").innerHTML = rankingHtml;
        document.getElementById("itemScenario").innerHTML = `
            <div class="scenario-box">
                <div class="scenario-title">Scenario used for item ranking</div>

                <div class="scenario-top">
                    <div class="scenario-top-item">
                        <span class="scenario-label">HP</span>
                        <span class="scenario-value">${hp}</span>
                    </div>
                    <div class="scenario-top-item">
                        <span class="scenario-label">Current EHP</span>
                        <span class="scenario-value">${ehp.toFixed(2)}</span>
                    </div>
                </div>

                <div class="scenario-main scenario-main-3col">

                    <div class="scenario-group">
                        <div class="scenario-group-title">Physical side</div>

                        <div class="scenario-row">
                            <span class="scenario-label">Armor</span>
                            <span class="scenario-value">${armor}</span>
                        </div>

                        <div class="scenario-row scenario-enemy-row">
                            <span class="scenario-label">Enemy Lethality</span>
                            <span class="scenario-value">${lethality}</span>
                        </div>

                        <div class="scenario-row scenario-enemy-row">
                            <span class="scenario-label">Enemy % Armor Pen</span>
                            <span class="scenario-value">${(percentArmorPen * 100).toFixed(0)}%</span>
                        </div>

                        <div class="scenario-row scenario-effective-row">
                            <span class="scenario-label">Effective Armor</span>
                            <span class="scenario-value">${effectiveArmor.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="scenario-group">
                        <div class="scenario-group-title">Magic side</div>

                        <div class="scenario-row">
                            <span class="scenario-label">MR</span>
                            <span class="scenario-value">${mr}</span>
                        </div>

                        <div class="scenario-row scenario-enemy-row">
                            <span class="scenario-label">Enemy Flat Magic Pen</span>
                            <span class="scenario-value">${flatMagicPen}</span>
                        </div>

                        <div class="scenario-row scenario-enemy-row">
                            <span class="scenario-label">Enemy % Magic Pen</span>
                            <span class="scenario-value">${(percentMagicPen * 100).toFixed(0)}%</span>
                        </div>

                        <div class="scenario-row scenario-effective-row">
                            <span class="scenario-label">Effective MR</span>
                            <span class="scenario-value">${effectiveMr.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="scenario-chart-group">
                        <div class="scenario-group-title">Damage split</div>
                        <div 
                            class="damage-pie" 
                            style="background: conic-gradient(
                                #d84a4a 0% ${(phys * 100).toFixed(2)}%,
                                #4a78d8 ${(phys * 100).toFixed(2)}% 100%
                            );"
                        ></div>

                        <div class="damage-legend">
                            <div class="damage-legend-row">
                                <span class="legend-dot legend-physical"></span>
                                <span>Physical: ${(phys * 100).toFixed(0)}%</span>
                            </div>
                            <div class="damage-legend-row">
                                <span class="legend-dot legend-magic"></span>
                                <span>Magic: ${(100 - phys * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
}
function getEffectiveResists(armor, mr, pen) {
    const armorAfterPercent = armor * (1 - pen.percentArmorPen);
    const armorAfterFlat = armorAfterPercent - pen.lethality;

    const mrAfterPercent = mr * (1 - pen.percentMagicPen);
    const mrAfterFlat = mrAfterPercent - pen.flatMagicPen;

    return {
        effectiveArmor: Math.max(-99, armorAfterFlat),
        effectiveMr: Math.max(-99, mrAfterFlat)
    };
}

function getPassiveAdjustedValues(
    item,
    baseHp,
    baseArmor,
    baseMr,
    physShare,
    pen,
    existingBonusHp = 0,
    existingBonusArmor = 0,
    existingBonusMr = 0,
    champLevel = 1
) { 
    let hp = baseHp + item.hp; 
    let armor = baseArmor + item.armor; 
    let mr = baseMr + item.mr;

    let extraMagicShield = 0;
    let passiveTexts = [];
    let passiveStateTexts = [];
    let finalEhp = mixedEHP(hp, armor, mr, physShare, pen);

    if (item.name === "Force of Nature") {
        mr += 70;
        finalEhp = mixedEHP(hp, armor, mr, physShare, pen);
        passiveTexts.push("+70 MR from full FoN stacks");
        passiveStateTexts.push("Assumes Force of Nature is fully stacked");
    }

    if (item.name === "Kaenic Rookern") {
        extraMagicShield = 0.15 * hp;
        finalEhp = mixedEHPWithMagicShield(hp, armor, mr, physShare, extraMagicShield, pen);
        passiveTexts.push(`Magic shield: ${extraMagicShield.toFixed(2)} (15% max HP)`);
        passiveStateTexts.push("Assumes Kaenic shield is available");
    }

    if (item.name === "Warmog's Armor") {
        const warmogPassiveHp = 0.12 * (existingBonusHp + item.hp);
        hp += warmogPassiveHp;
        finalEhp = mixedEHP(hp, armor, mr, physShare, pen);
        passiveTexts.push(`+${warmogPassiveHp.toFixed(2)} HP from Warmog passive (12% bonus HP)`);
        passiveStateTexts.push(`Assumes ${existingBonusHp} bonus HP from current build`);
    }

    if (item.name === "Randuin's Omen") {
        finalEhp = mixedEHPWithModifiers(hp, armor, mr, physShare, pen, {
            physicalReduction: 0.30
        });
        passiveTexts.push("30% reduced physical damage taken from crit auto attacks");
        passiveStateTexts.push("Assumes all physical damage is from crit auto attacks");
    }
    if (item.name === "Jak'Sho, The Protean") {
        const bonusArmorAfterItem = existingBonusArmor + item.armor;
        const bonusMrAfterItem = existingBonusMr + item.mr;

        const jakshoBonusArmor = 0.30 * bonusArmorAfterItem;
        const jakshoBonusMr = 0.30 * bonusMrAfterItem;

        armor += jakshoBonusArmor;
        mr += jakshoBonusMr;

        finalEhp = mixedEHP(hp, armor, mr, physShare, pen);

        passiveTexts.push(
            `+${jakshoBonusArmor.toFixed(2)} Armor and +${jakshoBonusMr.toFixed(2)} MR from Jak'Sho passive (30% bonus resists)`
        );
        passiveStateTexts.push(
            `Assumes Passive is stacked with ${bonusArmorAfterItem} bonus Armor and ${bonusMrAfterItem} bonus MR`
        );
    }
    if (item.name === "Protoplasm Harness") {
        const level = Math.max(1, Math.min(20, champLevel));

        const passiveBonusHp = 200 + (100 / 17) * (level - 1);
        const passiveHeal =
            200 +
            (200 / 17) * (level - 1) +
            1.75 * (existingBonusArmor + item.armor) +
            1.75 * (existingBonusMr + item.mr);

        const totalPassiveHp = passiveBonusHp + passiveHeal;

        hp += totalPassiveHp;
        finalEhp = mixedEHP(hp, armor, mr, physShare, pen);

        passiveTexts.push(
            `+${passiveBonusHp.toFixed(2)} temporary HP and +${passiveHeal.toFixed(2)} healing from Protoplasm passive`
        );
        passiveStateTexts.push(
            `Assumes full passive effect at level ${level} with ${existingBonusArmor + item.armor} bonus Armor and ${existingBonusMr + item.mr} bonus MR`
        );
    }  

    return {
        finalEhp,
        hp,
        armor,
        mr,
        extraMagicShield,
        passiveText: passiveTexts.join(" | "),
        passiveStateText: passiveStateTexts.join(" | ")
    };
}
function mixedEHPWithModifiers(hp, armor, mr, physShare, pen, options = {}) {
    const magicShare = 1 - physShare;

    const { effectiveArmor, effectiveMr } = getEffectiveResists(armor, mr, pen);

    const physicalReduction = options.physicalReduction || 0;
    const magicShield = options.magicShield || 0;

    const physicalDamageFraction =
        physShare * (1 - physicalReduction) / (1 + effectiveArmor / 100);

    const magicDamageFraction =
        magicShare / (1 + effectiveMr / 100);

    const hpEhp = hp / (physicalDamageFraction + magicDamageFraction);

    let shieldEhp = 0;

    if (magicShield > 0 && magicShare > 0) {
        shieldEhp = (magicShield * (1 + effectiveMr / 100)) / magicShare;
    }

    return hpEhp + shieldEhp;
}
function mixedEHPWithMagicShield(hp, armor, mr, physShare, magicShield = 0, pen) {
    const magicShare = 1 - physShare;

    const { effectiveArmor, effectiveMr } = getEffectiveResists(armor, mr, pen);

    const hpPortion =
        hp / (
            physShare / (1 + effectiveArmor / 100) +
            magicShare / (1 + effectiveMr / 100)
        );

    const shieldPortion = magicShield * (1 + effectiveMr / 100);

    const mixedShieldEhp = magicShare > 0 ? shieldPortion / magicShare : 0;

    return hpPortion + mixedShieldEhp;
}


function bestStatsForBudget(hp, armor, mr, physShare, budget, pen) {
    const hpCost = 8/3;
    const armorCost = 20;
    const mrCost = 20;

    let bestResult = {
        addedHp: 0,
        addedArmor: 0,
        addedMr: 0,
        finalEhp: mixedEHP(hp, armor, mr, physShare, pen),
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

            const ehp = mixedEHP(newHp, newArmor, newMr, physShare, pen);

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
function bestItemCombination(baseHp, baseArmor, baseMr, physShare, budget, pen) {

    let bestResult = {
        finalEhp: mixedEHP(baseHp, baseArmor, baseMr, physShare, pen),
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
            physShare,
            pen
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

function rankFullItemsByEHP(
    baseHp,
    baseArmor,
    baseMr,
    physShare,
    pen,
    existingBonusHp = 0,
    existingBonusArmor = 0,
    existingBonusMr = 0,
    champLevel = 20
) {
    const baseEhp = mixedEHP(baseHp, baseArmor, baseMr, physShare, pen);

    return fullItems.map(item => {
        // Base item only, without passive effects
        const rawHp = baseHp + item.hp;
        const rawArmor = baseArmor + item.armor;
        const rawMr = baseMr + item.mr;

        const baseItemEhp = mixedEHP(rawHp, rawArmor, rawMr, physShare, pen);
        const baseGain = baseItemEhp - baseEhp;

        // With passive effects included
        const adjusted = getPassiveAdjustedValues(
            item,
            baseHp,
            baseArmor,
            baseMr,
            physShare,
            pen,
            existingBonusHp,
            existingBonusArmor,
            existingBonusMr,
            champLevel
        );

        const passiveGain = adjusted.finalEhp - baseItemEhp;
        const totalGain = adjusted.finalEhp - baseEhp;

        return {
            id: item.id,
            name: item.name,
            cost: item.cost,
            hp: item.hp,
            armor: item.armor,
            mr: item.mr,
            baseGain,
            passiveGain,
            totalGain,
            basePerGold: baseGain / item.cost,
            totalPerGold: totalGain / item.cost,
            passiveText: adjusted.passiveText,
            passiveStateText: adjusted.passiveStateText
        };
    });
}
document.getElementById("phys").addEventListener("input", function() {
    const phys = Number(this.value);
    const magic = 100 - phys;

    document.getElementById("magicInfo").textContent =
        `Magic Damage: ${magic}%`;
});
document.getElementById("toggleAdvanced").addEventListener("click", function () {
    const advanced = document.getElementById("advancedOptions");

    if (advanced.style.display === "none" || advanced.style.display === "") {
        advanced.style.display = "block";
        this.textContent = "Hide Advanced Options";
    } else {
        advanced.style.display = "none";
        this.textContent = "Show Advanced Options";
    }
});

initializeCalculator();