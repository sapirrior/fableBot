import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';
import { logger } from '../util/logger.js';

let db;
const stmts = new Map();

export function initDb(dbPath = './src/db/database/fable_data.db') {
  const absolutePath = resolve(dbPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  db = new DatabaseSync(absolutePath);

  // Performance pragmas (WAL mode for concurrent reads, 4MB cache)
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA cache_size = -4000;');

  // Optimize & Vacuum on boot
  try {
    db.exec('PRAGMA optimize;');
    db.exec('VACUUM;');
  } catch (err) {
    logger.error('Failed to optimize/vacuum database', err, 'Database');
  }

  // --- Schema ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id       TEXT    PRIMARY KEY,
      balance       INTEGER NOT NULL DEFAULT 0,
      xp            INTEGER NOT NULL DEFAULT 0,
      level         INTEGER NOT NULL DEFAULT 1,
      last_daily    INTEGER NOT NULL DEFAULT 0,
      daily_streak  INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    ) STRICT;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS collection (
      user_id      TEXT    NOT NULL REFERENCES users(user_id),
      insect_id    TEXT    NOT NULL,
      count        INTEGER NOT NULL DEFAULT 1,
      first_caught INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, insect_id)
    ) STRICT;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_ban (
      user_id      TEXT    NOT NULL,
      command      TEXT    NOT NULL,
      reason       TEXT,
      banned_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, command)
    ) STRICT;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS disabled_commands (
      channel_id   TEXT    NOT NULL,
      command      TEXT    NOT NULL,
      disabled_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (channel_id, command)
    ) STRICT;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_items (
      user_id      TEXT    NOT NULL REFERENCES users(user_id),
      item_id      TEXT    NOT NULL,
      category     TEXT    NOT NULL,
      count        INTEGER NOT NULL DEFAULT 1,
      durability   INTEGER,
      equipped     INTEGER NOT NULL DEFAULT 0,
      acquired_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, item_id)
    ) STRICT;
  `);

  // --- Migrations (idempotent: ignore error if column already exists) ---
  try {
    db.exec('ALTER TABLE users ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0;');
  } catch {
    // Column already present — safe to ignore
  }

  try {
    db.exec('ALTER TABLE users ADD COLUMN rules_accepted INTEGER NOT NULL DEFAULT 0;');
  } catch {
    // Column already present — safe to ignore
  }

  // --- Indices for query performance ---
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_balance  ON users(balance DESC);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_level    ON users(level DESC);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_collection_uid ON collection(user_id);');

  // --- Prepared statements ---

  // Users
  prepare('getUser',           'SELECT * FROM users WHERE user_id = ?');
  prepare('upsertUser',        'INSERT INTO users (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING');
  prepare('updateUserXP',      'UPDATE users SET xp = ?, level = ? WHERE user_id = ?');
  prepare('updateUserBalance', 'UPDATE users SET balance = balance + ? WHERE user_id = ?');
  prepare('claimDaily',        'UPDATE users SET balance = balance + ?, last_daily = ?, daily_streak = ? WHERE user_id = ?');
  prepare('acceptRules',       'UPDATE users SET rules_accepted = 1 WHERE user_id = ?');

  // Collection
  prepare('getCollection',      'SELECT insect_id, count, first_caught FROM collection WHERE user_id = ? ORDER BY first_caught ASC');
  prepare('getCollectionInsect','SELECT count FROM collection WHERE user_id = ? AND insect_id = ?');
  prepare('catchInsect', `
    INSERT INTO collection (user_id, insect_id, count, first_caught)
    VALUES (?, ?, 1, (unixepoch()))
    ON CONFLICT(user_id, insect_id)
    DO UPDATE SET count = count + 1;
  `);
  prepare('removeInsect',    'DELETE FROM collection WHERE user_id = ? AND insect_id = ?');
  prepare('decrementInsect', 'UPDATE collection SET count = count - 1 WHERE user_id = ? AND insect_id = ?');

  // Items
  prepare('getUserItem',              'SELECT * FROM user_items WHERE user_id = ? AND item_id = ?');
  prepare('getUserItems',             'SELECT * FROM user_items WHERE user_id = ?');
  prepare('getUserNet',               'SELECT * FROM user_items WHERE user_id = ? AND equipped = 1 AND category = \'net\'');
  prepare('upsertUserItem',           'INSERT INTO user_items (user_id, item_id, category, count, durability) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET count = count + ?, durability = ?');
  prepare('updateItemDurability',     'UPDATE user_items SET durability = ? WHERE user_id = ? AND item_id = ?');
  prepare('removeItem',               'DELETE FROM user_items WHERE user_id = ? AND item_id = ?');
  prepare('equipNet',                 'UPDATE user_items SET equipped = CASE WHEN item_id = ? THEN 1 ELSE 0 END WHERE user_id = ? AND category = \'net\'');

  // Leaderboards
  prepare('getTopBalance',    'SELECT user_id, balance FROM users ORDER BY balance DESC LIMIT ?');
  prepare('getTopCollection', 'SELECT user_id, SUM(count) as total FROM collection GROUP BY user_id ORDER BY total DESC LIMIT ?');
  prepare('getTopXP',         'SELECT user_id, xp, level FROM users ORDER BY xp DESC LIMIT ?');
  prepare('getUserBalanceRank',    'SELECT COUNT(*) + 1 AS rank FROM users WHERE balance > (SELECT balance FROM users WHERE user_id = ?) AND user_id != ?');
  prepare('getUserXPRank',         'SELECT COUNT(*) + 1 AS rank FROM users WHERE xp > (SELECT xp FROM users WHERE user_id = ?) AND user_id != ?');
  prepare('getUserCollectionRank', 'SELECT COUNT(*) + 1 AS rank FROM (SELECT user_id, SUM(count) as total FROM collection WHERE user_id != ? GROUP BY user_id) WHERE total > (SELECT COALESCE(SUM(count), 0) FROM collection WHERE user_id = ?)');

  // Bans and Disabled Commands
  prepare('checkUserBan',       'SELECT * FROM user_ban WHERE user_id = ? AND (command = ? OR command = \'all\')');
  prepare('banUserCommand',     'INSERT OR IGNORE INTO user_ban (user_id, command, reason) VALUES (?, ?, ?)');
  prepare('liftUserCommandBan', 'DELETE FROM user_ban WHERE user_id = ? AND command = ?');
  
  prepare('checkDisabledCommand', 'SELECT * FROM disabled_commands WHERE channel_id = ? AND (command = ? OR command = \'all\')');
  prepare('disableCommand',       'INSERT OR IGNORE INTO disabled_commands (channel_id, command) VALUES (?, ?)');
  prepare('enableCommand',        'DELETE FROM disabled_commands WHERE channel_id = ? AND command = ?');

  return db;
}

function prepare(name, sql) {
  try {
    stmts.set(name, db.prepare(sql));
  } catch (error) {
    logger.error(`Failed to prepare statement "${name}"`, error, 'Database');
    throw error;
  }
}

/**
 * Returns a prepared statement by name.
 * Call .get(), .all(), or .run() on the result.
 */
export function query(name) {
  const stmt = stmts.get(name);
  if (!stmt) throw new Error(`[DB] Unknown prepared statement: "${name}"`);
  return stmt;
}

let transactionDepth = 0;

/**
 * Runs a function inside a SQLite transaction.
 * Automatically commits on success, rolls back on error.
 * Supports nested transactions via SAVEPOINT.
 */
export function transaction(fn) {
  const depth = transactionDepth;
  transactionDepth++;

  if (depth === 0) {
    db.exec('BEGIN;');
  } else {
    db.exec(`SAVEPOINT sp_${depth};`);
  }

  try {
    const result = fn();
    
    if (depth === 0) {
      db.exec('COMMIT;');
    } else {
      db.exec(`RELEASE SAVEPOINT sp_${depth};`);
    }
    
    return result;
  } catch (error) {
    if (depth === 0) {
      db.exec('ROLLBACK;');
    } else {
      db.exec(`ROLLBACK TO SAVEPOINT sp_${depth};`);
    }
    throw error;
  } finally {
    transactionDepth--;
  }
}

export function closeDb() {
  if (db) {
    db.close();
    logger.warn('Connection closed.', 'Database');
  }
}

/**
 * Performs a WAL checkpoint, flushing any pending WAL writes back into the
 * main database file. Call before creating a file-level backup to ensure
 * the .db file is a fully consistent snapshot.
 */
export function checkpoint() {
  if (db) {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  }
}

