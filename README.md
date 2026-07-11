# Fable (`fableBot`)

A zero-bloat, high-performance prefix-command Discord bot built on Node.js, ESM, and `node:sqlite`. 

This bot is designed with strict minimalist principles and follows the **Open/Closed Principle (OCP)** architecture, where new capabilities are introduced as decoupled services rather than modifying core routing logic.

---

## Features

- **Dynamic Command & Event Loading**: Commands and events are dynamically registered from directories. Command categories automatically scale based on folders inside `src/commands/`.
- **Zero-Dependency Structured Logger**: Lightweight color-coded console logs and error stack traces. No third-party loggers needed.
- **Unified Config Service**: Atomic writes (temp-write and rename) to `config.json` with dynamic config debouncing (500ms delay) to prevent disk I/O collision.
- **Nested Database Transactions**: `node:sqlite` transaction compose wrapper equipped with SAVEPOINT counters for nested SQLite transactions.
- **Self-Sweeping Memory Caches**: Commands and spam check caches bound memory growth by cleaning inactive user and channel entries periodically.
- **Gateway Rate-Limiter Interceptor**: Catches and blocks spammers directly in the gateway pipeline before running database hooks.
- **Clean Text Formatting**: Supports exact custom embeds and formats responses with status indicators utilizing `|` as the primary divider.

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
   DISCORD_TOKEN=your_bot_token_here
   ```

3. Initialize settings in `src/configs/config.json`:
   ```json
   {
     "prefix": "ah",
     "currencyName": "⌬",
     "statusMessage": "with ? butterflies"
   }
   ```

---

## Commands

```bash
npm start         # Run the bot once
npm run dev        # Run with auto-restart on file changes (--watch)
npm test          # Run the built-in Node test suite (infrastructure validation)
```

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
│   └── utils/             # categorized command modules (e.g., help, ping, prefix)
├── db/
│   └── index.js           # SQLite setup, WAL settings, & nested savepoint transactions
├── events/
│   ├── messageCreate.js   # pipeline routing message commands, rate-limits, and checks
│   └── ready.js           # dynamic streaming status updater
├── handlers/
│   ├── commandHandler.js  # dynamic commands mapper
│   └── eventHandler.js    # dynamic events subscriber
├── services/
│   ├── BanService.js      # DB user ban & channel disabled command checker
│   ├── ConfigService.js   # atomic read/write manager for config.json
│   ├── InsectService.js   # dynamic insets JSON query provider
│   └── SpamGuardService.js# in-memory self-sweeping user & channel spam tracker
└── util/
    ├── constants.js       # configuration constants & embed colors
    ├── cooldown.js        # commands cooldown manager
    ├── logger.js          # zero-dependency structured logger
    └── sender.js          # central message formatting replies helper
```

---

## Development Guidelines

- **For AI Agents**: See [AGENTS.md](AGENTS.md) for strict rules, hard boundaries, code styling, and architectural rules.
- **For Humans**:
  - Always write clean, vanilla ESM JavaScript (`import`/`export` and no bundler).
  - Add new features as independent services under `src/services/` and register them inside `src/core/Bootstrap.js` (Open/Closed Principle). Do not dump utility logic directly into `messageCreate.js`.
  - Always run `npm test` to ensure new changes do not break core database transactions, config savers, or cache sweeping.
