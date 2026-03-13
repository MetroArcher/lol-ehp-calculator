# LoL Effective HP Calculator

This is a simple web tool that analyzes **tank durability in League of Legends** by calculating Effective Health (EHP) against mixed physical and magic damage.

## Context

For readers unfamiliar with *League of Legends*: the player controls a character called a **champion**. Each champion has several statistics, including **Health Points (HP)**, which represent how much damage the champion can take before being defeated, as well as **Armor** and **Magic Resist (MR)**, which reduce incoming physical and magic damage.

During the game, players earn gold and can purchase items that increase these statistics, improving their champion’s survivability.

This tool analyzes how HP, Armor, and Magic Resist interact to determine **Effective Health (EHP)** — the total amount of damage a champion can take before its HP reaches zero after accounting for damage reduction from resistances.

The calculator helps players understand which **stats, components, or full items provide the most survivability** for a given situation.

The tool is fully client-side and written in **HTML, CSS, and JavaScript**.

---

# What the Calculator Does

The tool takes the following inputs:

* Current **HP**
* Current **Armor**
* Current **Magic Resist**
* **Enemy physical damage percentage**
* Available **gold**

From these values it evaluates several durability scenarios.

---

# Features

## Base Effective Health

Calculates your **current Effective HP** against the specified damage distribution.

This uses the standard LoL mitigation formulas:

Physical damage multiplier
`1 / (1 + Armor / 100)`

Magic damage multiplier
`1 / (1 + MR / 100)`

The calculator combines both using the enemy damage split.

---

## Theoretical Stat Optimization

The tool determines the **optimal distribution of raw stats** (HP, Armor, MR) for a fixed gold budget.

This shows the **theoretically best durability gain** if you could buy stats directly.

It also compares:

* All HP
* All Armor
* All MR
* Optimal stat mix

---

## Item Component Optimization

Given a gold budget, the tool tries **every possible combination of components** and finds the set that maximizes EHP.

Example output:

```
3x Ruby Crystal
1x Negatron Cloak
1x Giant's Belt
```

This shows the **best purchasable stat combination** rather than theoretical stats.

---

## Full Item Ranking

Completed tank items are evaluated separately and ranked by:

**EHP Gain**
Increase in effective health after buying the item.

**EHP Gain per Gold**
How efficient the item is at increasing survivability.

The tool displays the **top 8 most efficient items** for the current situation.

Note: Only **raw stats are considered**. Item passives are not included.

---

# Why This Tool Exists

Tank itemization in League of Legends is often unclear because:

* HP, Armor, and MR interact multiplicatively
* Different damage mixes favor different stats
* Completed items include powerful passives not visible in raw stats

This calculator helps visualize **pure durability efficiency** and compare different item choices.

---

# Current Limitations

* Item **passives are not modeled**
* Inventory slot limits are not enforced
* Multiple copies of the same item may appear in component optimization
* Damage types are simplified to **physical vs magic**

# Running the Tool

Open `index.html` in your browser, or use the GitHub Pages version:

```
https://metroarcher.github.io/lol-ehp-calculator/
```

No installation or dependencies are required.

---

# Technologies Used

* HTML
* CSS
* JavaScript
