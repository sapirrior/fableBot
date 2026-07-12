# Fable (`fableBot`)

Fable is a zero-bloat, high-performance User-Installable Slash Command Discord bot offering virtual currency economy features, daily reward progression, and coinflip games.

## 🚀 Install Anywhere
Fable is fully configured for Discord's **User-Installable Apps** context. Once installed to your account, you can invoke Fable's commands in **any server, Direct Message (DM), or private group chat** using slash commands (`/`).

---

## 🎮 Command Guide

* **/help**
  -# Displays list of available command groups and detailed descriptions using an interactive selection menu.
* **/balance**
  -# Check your current virtual coin balance or view another user's balance.
* **/daily**
  -# Claim your daily coin reward and progress your streak.
* **/give**
  -# Transfer virtual coins securely to another player.
* **/coinflip**
  -# Gamble virtual coins in a cryptographically secure heads-or-tails flip.
* **/avatar**
  -# Retrieve and view high-resolution profile avatars for any user.
* **/ping**
  -# Inspect current gateway response latency.

---

## 🛠️ Developer Setup & Self-Hosting

If you are a developer looking to host Fable yourself:

### Prerequisites
* Node.js `v24.0.0` or higher
* SQLite

### Installation
1. Clone the repository and install dependencies (only `discord.js` and `dotenv`):
   ```bash
   npm install
   ```
2. Create a `.env` file in the root directory:
   ```env
   ENV=TEST
   TEST_TOKEN=your_test_bot_token
   DISCORD_TOKEN=your_production_bot_token
   OWNER_ID=your_discord_id_here
   ```
3. Initialize configuration values in `src/configs/config.json`:
   ```json
   {
     "currencyName": "⌬"
   }
   ```
4. Startup scripts:
   ```bash
   npm start         # Run Fable (automatically registers slash commands dynamically)
   npm run dev        # Run with hot-reloading active (--watch)
   node --test          # Execute infrastructure validation tests
   ```

There is no build step. This is plain ESM JavaScript, no TypeScript, no bundler.

---

## Project Structure

```
src/
├── fable.js               # thin bot lifecycle orchestrator
├── index.js               # application entry point & process guard listeners
├── core/
│   ├── Bootstrap.js       # startup sequencing & ServiceContainer initialization
│   ├── ServiceContainer.js# dependency injector map
│   └── Shutdown.js        # graceful process shutdowns & in-flight connection drains
├── commands/
│   ├── economy/           # user-installable economy slash commands
│   ├── gambling/          # user-installable gambling slash commands
│   └── utils/             # user-installable utility slash commands (ping, help, avatar)
├── db/
│   └── index.js           # SQLite setup, WAL settings, & nested savepoint transactions
├── events/
│   ├── interactionCreate.js # dynamic router for slash commands and autocomplete
│   └── ready.js           # dynamic streaming status updater & command registration
├── handlers/
│   ├── eventHandler.js    # dynamic events subscriber
│   └── slashCommandHandler.js # dynamic slash commands mapper
├── configs/
│   ├── categories.js      # category metadata configuration helper
│   ├── config.json        # bot configuration settings
│   └── insets.json        # insect database definitions
├── services/
│   ├── BackupService.js   # in-memory database zip backup scheduler
│   ├── ConfigService.js   # atomic read/write manager for config.json
│   ├── EmojiService.js    # application custom emoji dynamic sync manager
│   └── InsectService.js   # dynamic insets JSON query provider
└── util/
    ├── constants.js       # configuration constants & embed colors
    ├── cooldown.js        # commands cooldown manager
    ├── logger.js          # zero-dependency structured logger
    └── sender.js          # interaction-aware embed response helper
```

---

## Development Guidelines

- **For AI Agents**: See [AGENTS.md](AGENTS.md) for strict rules, hard boundaries, code styling, and architectural rules.
- **For Humans**:
  - Always write clean, vanilla ESM JavaScript (`import`/`export` and no bundler).
  - Add new features as independent services under `src/services/` and register them inside `src/core/Bootstrap.js`.
  - Always run `node --test` to ensure new changes do not break database transactions, config savers, or cache sweeping.
