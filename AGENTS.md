# AGENTS.md

> Instructions for AI coding agents working in this repository.
> Humans: see README.md instead. This file is agent-only context — build commands,
> non-obvious conventions, and hard boundaries the code alone won't tell you.

## Project

Fable — a Discord.js v14 prefix-command bot (Node.js, ESM, `node:sqlite`). Two runtime
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
  spam-guard, bans, insects, sender) lives in `src/services/` as its own file with its own
  exported functions. `src/events/messageCreate.js` only sequences calls — it must never grow
  new util logic inline. If you're about to add a `Map`, a cache, or a new capability directly
  inside an event file, stop and put it in `src/services/` instead.
- **New capability → 2 files, not 1 edit.** Add the new service file, then add one registration
  line in `src/core/Bootstrap.js`. Do not wire new services into `messageCreate.js` directly.
- **Every unbounded in-memory `Map` must self-sweep.** Any cache keyed by user ID, channel ID,
  or guild ID must have an eviction/sweep mechanism (see `util/cooldown.js`'s
  `startCooldownSweeper` for the reference pattern) before it ships. A `Map` that only grows is
  a memory leak — reject it in review, don't just note it.
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
- User-facing replies always go through `util/sender.js` (`reply`, `error`, `embed`) to keep the
  `**emoji | username**, content` format consistent. Never call `message.reply(...)` directly
  from inside a command.

## Testing

- Unit tests live alongside the module they test, or under `test/`, using `node --test`
  (no Jest/Vitest — stdlib only).
- Any change to a service with time-based behavior (sweepers, cooldowns, debounced writes) needs
  a test that simulates time passing, not just a happy-path call.
- Before finishing a task: run `node --test`, then manually smoke-test by running `npm run dev`
  and exercising `ping`, `help`, and whichever command you touched, in a real test guild.

## Boundaries — do not do these unless explicitly asked

- Do not migrate prefix commands to slash commands. This is a deliberate product decision, not
  an oversight.
- Do not introduce sharding, Redis, an ORM, or a bot framework (e.g., Sapphire). The two-dependency
  footprint is intentional.
- Do not change embed copy, emoji, command names, or economy/gameplay numbers as a side effect of
  an infra or refactor task. If a refactor requires touching a command file, preserve its
  user-visible output byte-for-byte unless the task explicitly says otherwise.
- Do not edit `package-lock.json` by hand.

## When stuck

If a task is ambiguous (e.g., "harden the db layer" without specifics), ask a clarifying question
before writing code rather than guessing and producing a large diff. If `node --test` fails
repeatedly for a reason unrelated to your change, stop and report it — don't disable or delete
the failing test to make the suite green.

