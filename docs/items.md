# Fable Bot — Catcher's Gear & Items Manual

This manual details the mechanics, distinctions, catalog, and mathematical calculations governing **Nets** and **Baits** in Fable.

---

## 1. Core Distinctions

| Feature | 🥅 Nets (Equipment) | 🧪 Baits (Consumables) |
| :--- | :--- | :--- |
| **Inventory State** | Active item equipped to slot. | Consumable stack inside storage. |
| **Lifetime** | Multi-use. Breaks when durability hits `0`. | Single-use. Consumes `1` unit on catch. |
| **Equip Flow** | Equips manually via `/equip <net_id>`. | Activated per catch via `/catch [bait]`. |
| **Primary Utility** | Passive weight boosts to rare/celestial tiers. | Extra catch rolls (+1 or +2) or temporary boosts. |

---

## 2. Nets (Equipment)

Nets are your primary catching tools. You can purchase them from the `/shop` and review them in `/inventory`.

* **Durability**: Every net has a set number of uses. When you perform a `/catch`, your equipped net's durability decreases by `1`.
* **Breaking**: Once a net's durability reaches `0`, the net breaks and is removed from your inventory.
* **Auto-Equip Fallback**: When a player has no net equipped (e.g. beginners purchasing their first net), buying a net automatically equips it. Otherwise, new nets are stored in the inventory, and players can switch tools using `/equip <net_id>`.

---

## 3. Baits (Consumables)

Baits are consumable lures that speed up level progression or target specific insect tiers.

* **Stacking**: Unlike nets, you can buy and carry multiple copies of the same bait.
* **Usage**: Baits are not equipped. Instead, they are selected as an optional parameter when running the catch command:
  `/catch bait:sweet_honey`
* **Consumption**: Using a bait reduces its inventory count by `1`. If you run out of that bait, it is removed from your inventory.

---

## 4. Item Catalog

The following items are available in the `/shop`:

### Nets (Equipment Category)
| Net Name | ID | Price | Durability | Rarity Modifiers |
| :--- | :--- | :--- | :--- | :--- |
| **Basic Net** 🕸️ | `basic_net` | **100 ⌬** | 20 uses | *None (Base Rates)* |
| **Sturdy Carbon Net** 🎣 | `sturdy_net` | **250 ⌬** | 45 uses | *None (Standard Rates, High Durability)* |
| **Reinforced Iron Net** ⚓ | `heavy_net` | **800 ⌬** | 25 uses | Rare: **2.5x** |
| **Fine Mesh Net** 🏸 | `fine_net` | **500 ⌬** | 15 uses | Rare: **2.0x** · Legendary: **1.5x** |
| **Lucky Net** 🍀 | `lucky_net` | **1,200 ⌬** | 12 uses | Uncommon: **1.5x** · Epic: **2.0x** |
| **Golden Net** 🥇 | `golden_net` | **2,500 ⌬** | 10 uses | Legendary: **3.0x** · Celestial: **3.0x** |

### Baits (Consumable Category)
| Bait Name | ID | Price | Multiplier / Utility Effects |
| :--- | :--- | :--- | :--- |
| **Sweet Sugar Spray** 💧 | `sugar_spray` | **50 ⌬** | Common: **2.0x** |
| **Sweet Honey** 🍯 | `sweet_honey` | **150 ⌬** | Extra Catches: **+1 insect** |
| **Rotten Fruit Lure** 🍎 | `rotten_fruit` | **200 ⌬** | Uncommon: **1.8x** · Epic: **1.8x** |
| **Insect Pheromone** 🧪 | `pheromone` | **300 ⌬** | Uncommon: **2.0x** · Rare: **2.0x** |
| **Golden Nectar** 🏺 | `golden_nectar` | **600 ⌬** | Extra Catches: **+2 insects** |
| **Glowing Spore** 🍄 | `glowing_spore` | **1,000 ⌬** | Epic: **3.0x** · Legendary: **3.0x** |

---

## 5. Mathematical Calculations

When you catch an insect, Fable calculates the probability of rolling each rarity tier and processes item modifiers as follows:

### Rarity Weight Multipliers
Fable uses a **tier-first cumulative probability selector**. The base weights for each rarity tier are:
* **Common**: `60.0%`
* **Uncommon**: `28.0%`
* **Rare**: `10.0%`
* **Epic**: `1.9%`
* **Legendary**: `0.1%`
* **Celestial**: `0.0%` (Base rate; can be boosted by nets)

When a Net and a Bait are both active, their multipliers stack **multiplicatively**:
$$\text{Modified Weight} = \text{Base Weight} \times \text{Net Multiplier} \times \text{Bait Multiplier}$$

#### Example Roll
If you have a **Fine Mesh Net** (Rare weight `2.0x`) equipped, and use **Insect Pheromones** (Rare weight `2.0x`), the final probability weight for the Rare tier is:
$$\text{Rare Weight} = 10.0\% \times 2.0 \times 2.0 = 40.0\%$$
*(This significantly increases your chance of catching rare insects during that roll).*

### Durability Depletion Logic
1. A catch is initiated.
2. The bot verifies the user has an active net with `durability > 0`.
3. If a bait is specified, it is verified and deducted from the inventory.
4. The roll processes (including any extra catches).
5. The equipped net's durability is decremented by `1`.
6. If the durability is now `0`, the net is deleted from the database, and a warning is sent to the user that their net broke.
