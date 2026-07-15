# Fable Bot — Catcher Leveling & Progression System

This document outlines the formulas and parameters governing Fable's infinite leveling curve, rank titles, and duplicate sell multipliers.

---

## 1. Catcher Levels (Infinite Curve)

Catcher levels scale infinitely using a non-linear power curve. This design slows down early-game progression while ensuring that high-level achievements require sustained player activity.

### A. Experience (XP) to Level Formula
To calculate a player's level from their total accumulated experience points ($xp$):
$$\text{Level} = \left\lfloor \left( \frac{xp}{120} \right)^{\frac{1}{1.8}} \right\rfloor + 1$$

### B. Level to XP Threshold Formula
To calculate the total cumulative experience points required to reach a specific level ($L$):
$$\text{Cumulative XP Target} = 120 \times (L - 1)^{1.8}$$

### C. XP Progression Metrics Example Table
| Target Level | Cumulative XP Required | Delta XP from Previous |
| :--- | :--- | :--- |
| **Level 1** | `0` | `0` |
| **Level 2** | `120` | `120` |
| **Level 5** | `1,459` | `611` |
| **Level 10** | `6,252` | `1,529` |
| **Level 25** | `37,015` | `3,981` |
| **Level 50** | `132,678` | `8,145` |
| **Level 100** | `482,239` | `16,420` |

---

## 2. Dynamic Level-Up "Growup" daily payouts

Daily claim coins (`/daily`) scale up dynamically as a benefit of increasing the player's Catcher Level. The formula is:
$$\text{Daily Payout} = \text{Base Daily} \ (250\⌬) + (\text{Catcher Level} \times 25\⌬)$$

---

## 3. Catcher Titles & Rank Milestones

As users level up, they receive active titles and custom emojis representing their Catcher Rank:

| Level Boundary | Title Name | Title Emoji |
| :--- | :--- | :--- |
| **Levels 1–5** | Novice Catcher | 🪱 |
| **Levels 6–11** | Apprentice Entomologist | 🦗 |
| **Levels 12–19** | Insect Enthusiast | 🐌 |
| **Levels 20–29** | Skilled Collector | 🪲 |
| **Levels 30–44** | Expert Tracker | 🐜 |
| **Levels 45–59** | Master Catcher | 🦋 |
| **Levels 60–79** | Grand Entomologist | 🦂 |
| **Levels 80–99** | Lord of the Swarm | 🐝 |
| **Levels 100–149** | Celestial Warden | ✨ |
| **Levels 150–199** | Astral Hunter | ☄️ |
| **Levels 200–299** | Void Walker | 🌑 |
| **Levels 300–499** | Cosmos Monarch | 🌌 |
| **Levels 500+** | Keeper of the Eternal Hive | 👑 |

---

## 4. Duplicate Sell Value Scaling

Releasing duplicate insects back to nature via `/sell` rewards active collectors. If a player owns multiple copies of the same insect species, Fable calculates a logarithmic bonus to scale up the sell rate:

### Sell Value Formula
$$\text{Sell Value} = \lfloor \text{Base Value} \times (1 + 0.12 \times \log_2(N + 1)) \rfloor$$
*Where $N$ represents the duplicate count currently owned by the user, and $\text{Base Value}$ is the insect's configured raw tier value.*

### Duplicate Scaling Table Example
For a Rare insect with a **Base Value of 60 ⌬**:

| Quantity Owned ($N$) | Logarithmic Multiplier | Individual Sell Value | Total Payout (Release All) |
| :--- | :--- | :--- | :--- |
| **1 copy** | `1.000x` | **60 ⌬** | **60 ⌬** |
| **2 copies** | `1.190x` | **71 ⌬** | **131 ⌬** |
| **4 copies** | `1.278x` | **76 ⌬** | **283 ⌬** |
| **8 copies** | `1.380x` | **82 ⌬** | **617 ⌬** |
| **16 copies** | `1.490x` | **89 ⌬** | **1,332 ⌬** |
| **32 copies** | `1.605x` | **96 ⌬** | **2,836 ⌬** |
