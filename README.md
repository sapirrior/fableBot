# Fable (`fableBot`)

Fable is a zero-bloat, high-performance User-Installable Slash Command Discord bot offering virtual currency economy, daily reward progression, card/coin gambling games, and a full insect-catching collection system.

## Install Anywhere

Fable is fully configured for Discord's **User-Installable Apps** context. Once installed to your account, you can invoke commands in **any server, DM, or private group chat** using slash commands (`/`).

---

## Command Guide

**Economy**
* `/profile` — View catcher level, experience progression, balance, daily streak, and active rank title.
* `/daily` — Claim your daily coin reward (increases in value based on your Catcher Level).
* `/give` — Transfer coins securely to another player.
* `/shop` — Browse catching nets and consumable baits using an interactive dropdown menu.
* `/buy` — Purchase nets (with custom durability/rates) or baits from the shop.
* `/inventory` — View your owned nets, baits, and highlight your currently equipped active net.
* `/equip` — Choose and equip an active catching net from your owned inventory stash.

**Insects**
* `/catch` — Spend coins and use equipped nets/optional baits to capture insects, gain XP, and level up.
* `/collection` — Browse your captured insects cataloged by rarity tier, showing counts and duplicate star ratings.
* `/sell` — Release duplicate insects back to nature for coin payouts scaling logarithmically by rank.

**Gambling**
* `/coinflip` — Gamble coins in a cryptographically secure heads-or-tails flip.
* `/blackjack` — Play a hand of blackjack against the dealer. Hit or stand with buttons. Natural blackjack pays 1.5×.
* `/highlow` — Bet if a hidden number (1-100) is higher, lower, or equal (Jackpot) to a hint number.

**Utility**
* `/help` — Browse available commands by category using an interactive dropdown.
* `/rules` — Display the bot rules, terms of service, and privacy guidelines.
* `/avatar` — View any user's full-resolution avatar.
* `/ping` — Check current gateway latency.

---

## Developer Setup & Self-Hosting

### Prerequisites
* Node.js `v24.0.0` or higher
* No external database required — uses `node:sqlite` (built into Node.js)

### Installation

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/sapirrior/fableBot
   cd fableBot
   npm install
   ```

2. Create a `.env` file:
   ```env
   ENV=TEST
   TEST_TOKEN=your_test_bot_token
   DISCORD_TOKEN=your_production_bot_token
   OWNER_ID=your_discord_id
   ```

3. Review `src/configs/config.json` for tunable values.

4. Run:
   ```bash
   npm start          # run once
   npm run dev        # run with --watch (auto-restart on file change)
   node --test        # run infrastructure test suite
   ```

There is no build step. This is plain ESM JavaScript — no TypeScript, no bundler.

---

## Project Structure

```
docs/
├── colors.md                   # Brand theme color specifications
├── items.md                    # Core distinctions and catalog for nets/baits
├── itemsFunctions.md           # Mermaid system flow for shop, buy, inventory
├── leveling.md                 # Infinite leveling progression and duplicate formulas
└── text_stylings.md            # Text formatting guidelines and rules
src/
├── fable.js                    # thin bot lifecycle orchestrator
├── index.js                    # application entry point & process signal handlers
├── core/
│   ├── Bootstrap.js            # startup sequencing & service registration
│   ├── ServiceContainer.js     # minimal dependency injection map
│   └── Shutdown.js             # graceful shutdown & in-flight drain
├── commands/
│   ├── economy/                # profile, daily, buy, sell, shop, inventory, equip
│   ├── gambling/               # coinflip, blackjack, highlow
│   ├── insects/                # catch, collection
│   └── utils/                  # ping, help, avatar, rules
├── db/
│   └── index.js                # SQLite setup, WAL, nested savepoint transactions
├── services/
│   ├── ItemService.js          # Config parser loader for shop items
│   ├── InsectService.js        # Catcher levels and duplicate multiplier formulas
│   └── ...
└── ...
```

---

## Architecture Notes

* **Services own state.** Any capability that needs a `Map`, cache, or shared object lives in `src/services/`. Event files only sequence calls.
* **Minimal dependencies.** Zero-bloat design utilizing native Node.js libraries (`node:sqlite`, `node:crypto`, `node:zlib`).
* **Micro-memory caching.** Bot caches configured to minimum limits (`0` caching) to guarantee a low memory footprint.
* **Self-Sweeping Caches.** Any cache keyed by Discord parameters sweeps itself on intervals to avoid memory leaks.

---

## Development Guidelines

- **For AI Agents**: See [AGENTS.md](AGENTS.md) for strict formatting rules, hard limits, and folder boundaries.
- **For Humans**: Read the technical manuals under `docs/` to inspect mathematical functions and API styles before contributing.
