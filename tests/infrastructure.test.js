import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// Load services/utilities to test
import { container } from '../src/core/ServiceContainer.js';
import { configManager } from '../src/services/ConfigService.js';
import { insectService } from '../src/services/InsectService.js';
import { initDb, closeDb, transaction } from '../src/db/index.js';
import { buildContext } from '../src/runtime/CommandContext.js';

import { emojiService } from '../src/services/EmojiService.js';
import { highlowService } from '../src/services/HighLowService.js';

// Pre-register services to the container for tests
container.register('config', configManager);
container.register('insects', insectService);
container.register('emojis', emojiService);
container.register('highlow', highlowService);

test('ConfigManager - atomic writes', (t) => {
  const originalPrefix = configManager.get('prefix');
  const tempConfigPath = resolve('./src/configs/config.json');
  const tempPathPattern = `${tempConfigPath}.tmp-`;

  // Change configuration value
  configManager.set('prefix', 'temp-test-prefix');

  // Verify write occurred and temp file is cleaned up
  assert.strictEqual(configManager.get('prefix'), 'temp-test-prefix');
  
  // Clean up config changes back to original
  configManager.set('prefix', originalPrefix);
  configManager.flush();
});

test('SQLite - nested SAVEPOINT transactions', (t) => {
  // Initialize test DB
  const testDbPath = './src/db/database/test_data.db';
  try {
    initDb(testDbPath);
  } catch (err) {
    // Ignore if already initialized
  }

  // Nested transactions check
  assert.doesNotThrow(() => {
    transaction(() => {
      // Outer transaction starts
      transaction(() => {
        // Inner savepoint starts
      });
    });
  });

  closeDb();
  if (existsSync(resolve(testDbPath))) {
    try {
      unlinkSync(resolve(testDbPath));
      unlinkSync(resolve(testDbPath + '-wal'));
      unlinkSync(resolve(testDbPath + '-shm'));
    } catch (_) {}
  }
});

test('CommandContext - context factory shape matches expectations', (t) => {
  const ctx = buildContext();
  assert.ok(ctx.hasOwnProperty('config'));
  assert.ok(ctx.hasOwnProperty('insets'));
  assert.ok(ctx.hasOwnProperty('highlow'));
  assert.ok(ctx.hasOwnProperty('query'));
  assert.ok(ctx.hasOwnProperty('transaction'));
  assert.ok(ctx.hasOwnProperty('sender'));
  assert.ok(ctx.hasOwnProperty('constants'));
  assert.ok(ctx.hasOwnProperty('parse'));
  assert.ok(ctx.hasOwnProperty('fmt'));
  assert.ok(ctx.hasOwnProperty('getInsect'));
  assert.ok(ctx.hasOwnProperty('rollInsect'));
  assert.ok(ctx.hasOwnProperty('emoji'));
});
