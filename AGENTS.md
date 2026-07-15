# AGENTS.md

> Instructions for AI coding agents working in this repository.
> Humans: see README.md instead. This file is agent-only context — build commands,
> non-obvious conventions, and hard boundaries the code alone won't tell you.

## Project

Fable — a User-Installable Slash Command bot built using Discord.js v14 (Node.js, ESM, `node:sqlite`). Two runtime
dependencies only: `discord.js`, `dotenv`. Zero-bloat is a deliberate architectural choice,
not an oversight — do not add dependencies to solve problems Node's stdlib already solves.

## Commands

```bash
npm start         # run once
npm run dev        # run with --watch (auto-restart on file change)
node --test         # run test suite (Node built-in runner, no test framework dependency)
```

There is no build step. This is plain ESM JavaScript, no TypeScript, no bundler.

## Architecture rules (non-negotiable)

- **Services own state, events own sequencing.** Any cross-cutting capability (config,
  insects, blackjack sessions, sender) lives in `src/services/` as its own file with its own
  exported functions. `src/events/interactionCreate.js` only sequences calls — it must never grow
  new util logic inline. If you're about to add a `Map`, a cache, or a new capability directly
  inside an event file, stop and put it in `src/services/` instead.
- **New capability → 2 files, not 1 edit.** Add the new service file, then add one registration
  line in `src/core/Bootstrap.js`. Do not wire new services into `interactionCreate.js` directly.
- **Every unbounded in-memory `Map` must self-sweep.** Any cache keyed by user ID, channel ID,
  or guild ID must have an eviction/sweep mechanism (see `util/cooldown.js`'s
  `startCooldownSweeper` and `services/BlackjackService.js`'s `startBlackjackSweeper` for the
  reference pattern) before it ships. A `Map` that only grows is a memory leak — reject it in
  review, don't just note it.
- **DB writes go through `db/index.js`'s `query()` / `transaction()` exports.** Never call
  `db.prepare()` or open a second `DatabaseSync` instance elsewhere. `transaction()` supports
  nesting via savepoints — safe to call from inside another `transaction()`.
- **Config changes go through `ConfigManager` (`services/ConfigService.js`), never
  `readFileSync`/`writeFileSync` directly on `config.json`.** Writes must be atomic (write to
  temp file, then rename) — never write the real config path in place.

## Code style

- ESM only (`import`/`export`), no `require`.
- JSDoc on every exported function: one-line description + `@param`/`@returns`. Match the
  existing style in `util/parse.js` and `util/cooldown.js` — copy that format exactly.
- Errors always go through `util/logger.js` (`logger.error(msg, err, tag)`), never bare
  `console.log`/`console.error`.
- User-facing replies always go through `util/sender.js` (`reply`, `error`, `defer`) to maintain
  consistent embed formats. All responses are embed-only and support flag 64
  (MessageFlags.Ephemeral) for private responses. Never call `interaction.reply(...)` or
  `interaction.followUp(...)` directly from inside a command unless referencing sender.js wrappers.
- **Defer before async work.** Any command that performs a DB transaction or significant async
  work before replying must call `await ctx.sender.defer(interaction)` first to prevent Discord's
  3-second timeout from expiring silently. Only defer after all synchronous early-return
  validation (so ephemeral errors still work without deferral).

## Embed colors & text style

All embed colors are defined as named constants in `src/util/colors.js`. **Never hardcode a hex
color inside a command file.** Import `COLORS` and use the appropriate constant:

| Constant | Use case |
|---|---|
| `COLORS.BRAND` | Default / neutral (auto-applied by `sender.reply`) |
| `COLORS.SOFT` | Secondary info (ping, avatar) |
| `COLORS.MINT` | Positive economy actions (daily, give) |
| `COLORS.GOLD` | Gambling win, natural blackjack |
| `COLORS.ROSE` | Gambling loss |
| `COLORS.SLATE` | Tie / push / neutral game outcome |
| `COLORS.CRIMSON` | Errors (auto-applied by `sender.error`) |
| `COLORS.VOID` | Reserved for lore / dramatic embeds |

Text formatting rules (enforced across all commands):
- **No `emoji | text` prefix pattern.** Leading `🔹 | text` is banned — it is visual noise.
- **Dynamic values in bold**: `**500 ⌬**`, not plain text.
- **Command names in inline code**: `` `/daily` ``, not plain text.
- **Balance and secondary data in footer**, not cluttering description.
- **No markdown in embed author or footer fields**: Discord does not render formatting (like `**` or `_`) in author names and footer texts; keep them plain text.
- **` · ` (middot) as separator** for inline metadata — never `|`.
- Emoji use is capped at one per line, only where it adds semantic value.

## Interaction lifetime rules

- Commands with multi-step flows (e.g. blackjack) use Button collectors, not reaction collectors.
  Collectors must have a finite `time` option — never open-ended.
- On collector timeout: disable components, apply forfeit if applicable, do not prompt retry.
- Settle order for gambling commands: **DB write → editReply → endSession** — never mark a
  session done before the reply succeeds, or state can be lost on a transient Discord API error.

## Owner and Admin Commands

- **Owner-only flag**: Gated commands must set `ownerOnly: true` in their export module.
- **Dynamic guild-scoped registration**: Owner-only commands are filtered out of global registrations and instead registered only to the `ownerGuildId` server configured in `config.json`.
- **Graceful Shutdown**: The `/stop` command gates execution, waits up to 60 seconds for active database-based commands to resolve, merges SQLite WAL logs via a checkpoint, flushes atomic configurations, generates a final gzipped backup, disconnects the gateway, closes the database, and terminates cleanly.

## Testing

- Unit tests live alongside the module they test, or under `tests/`, using `node --test`
  (no Jest/Vitest — stdlib only).
- Any change to a service with time-based behavior (sweepers, cooldowns, debounced writes) needs
  a test that simulates time passing, not just a happy-path call.
- Before finishing a task: run `node --test`, then manually smoke-test by running `npm run dev`
  and exercising `/ping`, `/help`, and whichever command you touched in a test server or DM.

## Boundaries — do not do these unless explicitly asked

- Do not migrate slash commands back to prefix commands.
- Do not introduce sharding, Redis, an ORM, or a bot framework (e.g., Sapphire). The two-dependency footprint is intentional.
- Do not use `dynamic: true` in `displayAvatarURL()` — it was removed in discord.js v14.
- Do not increase the client cache limits: all Managers (Message, User, GuildMember, etc.) are strictly capped at `0` for minimal memory bounds.
- All dynamic dropdown component collectors (e.g. `/shop` select menus) must expire cleanly (e.g., set to `60000ms` / 1 minute) and disable components on finish to prevent dead UI state.

## When stuck

If a task is ambiguous (e.g., "harden the db layer" without specifics), ask a clarifying question
before writing code rather than guessing and producing a large diff. If `node --test` fails
repeatedly for a reason unrelated to your change, stop and report it — don't disable or delete
the failing test to make the suite green.
