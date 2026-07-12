# Fable (`fableBot`)

A zero-bloat, high-performance User-Installable Slash Command Discord bot built on Node.js, ESM, and `node:sqlite`. 

This bot is designed with strict minimalist principles and follows the **Open/Closed Principle (OCP)** architecture, where new capabilities are introduced as decoupled services.

---

## Features

- **Dynamic Slash Command Loading**: Commands are dynamically registered from directories inside `src/commands/` and registered automatically with the Discord API on startup.
- **User-Installable Contexts**: Fully configured for User Installation contexts (`integration_types` + `contexts`), allowing commands to be run anywhere across servers and DMs.
- **Zero-Dependency Structured Logger**: Lightweight color-coded console logs and error stack traces. No third-party loggers needed.
- **Unified Config Service**: Atomic writes (temp-write and rename) to `config.json` with dynamic config debouncing (500ms delay) to prevent disk I/O collision.
- **Nested Database Transactions**: `node:sqlite` transaction compose wrapper equipped with SAVEPOINT counters for nested SQLite transactions.
- **In-Memory Gzip Backups**: Periodically runs WAL checkpoints, reads the database file into memory, compresses it to gzip, and posts it as an attachment to a backup Discord channel.
- **Embed-Only Format**: Safe, clean responses structured solely around modern discord embeds utilizing `sender.js` helper wrappers.

---

## Getting Started

### Prerequisites

- Node.js `v24.0.0` or higher
- SQLite

### Installation

1. Clone the repository and install runtime dependencies (only `discord.js` and `dotenv`):
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

3. Initialize settings in `src/configs/config.json`:
   ```json
   {
     "currencyName": "⌬",
     "statusMessage": "with ? butterflies"
   }
   ```

---

## Commands

```bash
npm start         # Run the bot once (will auto-register slash commands)
npm run dev        # Run with auto-restart on file changes (--watch)
node --test          # Run the built-in Node test suite (infrastructure validation)
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
