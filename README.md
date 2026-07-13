# Fable (`fableBot`)

Fable is a zero-bloat, high-performance User-Installable Slash Command Discord bot offering virtual currency economy, daily reward progression, and card/coin gambling games.

## Install Anywhere

Fable is fully configured for Discord's **User-Installable Apps** context. Once installed to your account, you can invoke commands in **any server, DM, or private group chat** using slash commands (`/`).

---

## Command Guide

**Economy**
* `/balance` — Check your coin balance or view another user's balance.
* `/daily` — Claim your daily coin reward and progress your streak.
* `/give` — Transfer coins securely to another player.

**Gambling**
* `/coinflip` — Gamble coins in a cryptographically secure heads-or-tails flip.
* `/blackjack` — Play a hand of blackjack against the dealer. Hit or stand with buttons. Natural blackjack pays 1.5×.

**Utility**
* `/help` — Browse available commands by category using an interactive dropdown.
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

3. Review `src/configs/config.json` for tunable values:
   ```json
   {
     "currencyName": "⌬",
     "dailyRewardCoins": 250,
     "dailyCooldownMs": 86400000,
     "backupChannelId": "your_channel_id"
   }
   ```

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
src/
├── fable.js                    # thin bot lifecycle orchestrator
├── index.js                    # application entry point & process signal handlers
├── core/
│   ├── Bootstrap.js            # startup sequencing & service registration
│   ├── ServiceContainer.js     # minimal dependency injection map
│   └── Shutdown.js             # graceful shutdown & in-flight drain
├── commands/
│   ├── economy/                # balance, daily, give
│   ├── gambling/               # coinflip, blackjack
│   └── utils/                  # ping, help, avatar
├── db/
│   └── index.js                # SQLite setup, WAL, nested savepoint transactions
├── events/
│   ├── interactionCreate.js    # slash command router
│   └── ready.js                # emoji sync & command registration
├── handlers/
│   ├── eventHandler.js         # dynamic event loader
│   └── slashCommandHandler.js  # dynamic command loader & JSON serializer
├── configs/
│   ├── categories.js           # help menu category metadata
│   ├── config.json             # runtime configuration
│   └── insets.json             # insect pool definitions
├── services/
│   ├── BackupService.js        # in-memory gzip DB backup scheduler
│   ├── BlackjackService.js     # in-memory BJ session store, card logic & embed builder
│   ├── ConfigService.js        # atomic read/write manager for config.json
│   ├── EmojiService.js         # application emoji sync & local cache
│   └── InsectService.js        # tier-first weighted insect roll provider
└── util/
    ├── colors.js               # named embed color palette (COLORS.BRAND, GOLD, ROSE…)
    ├── constants.js            # rarity colors, emoji indicators, helpers
    ├── cooldown.js             # per-user command cooldown map with sweeper
    ├── logger.js               # zero-dependency structured console logger
    ├── parse.js                # amount parsing, user mention, time formatting
    └── sender.js               # interaction-aware embed reply helper
```

---

## Architecture Notes

- **Services own state.** Any capability that needs a `Map`, cache, or shared object lives in `src/services/`. Event files only sequence calls.
- **Two dependencies.** `discord.js` and `dotenv`. Node's stdlib (`node:sqlite`, `node:crypto`, `node:zlib`) handles everything else.
- **No memory leaks.** Every unbounded in-memory `Map` has a self-sweeping interval (cooldowns, blackjack sessions).
- **Atomic config writes.** All config mutations go through `ConfigService` which writes to a temp file then renames — no partial writes.
- **Embed color palette.** All colors are defined in `src/util/colors.js` as named constants matched to the bot's avatar palette.

---

## Development Guidelines

- **For AI Agents**: See [AGENTS.md](AGENTS.md) for strict rules, hard limits, and conventions.
- **For Humans**: Write clean ESM JavaScript. Add new features as services under `src/services/` and register them in `Bootstrap.js`. Always run `node --test` before pushing.
