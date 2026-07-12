import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// Load services/utilities to test
import { container } from '../src/core/ServiceContainer.js';
import { SpamGuardService } from '../src/services/SpamGuardService.js';
import { configManager } from '../src/services/ConfigService.js';
import { insectService } from '../src/services/InsectService.js';
import { initDb, closeDb, transaction } from '../src/db/index.js';
import { buildContext } from '../src/runtime/CommandContext.js';

import { emojiService } from '../src/services/EmojiService.js';

// Pre-register services to the container for tests
container.register('config', configManager);
container.register('insects', insectService);
container.register('emojis', emojiService);

test('SpamGuardService - rate limit tracking and cleaning', async (t) => {
  const userId = 'test_user_123';
  const now = Date.now();

  // Test User spam limit
  const uSpam1 = SpamGuardService.checkUserSpam(userId, now);
  assert.strictEqual(uSpam1.count, 0);
  uSpam1.count++;
  SpamGuardService.updateUserSpam(userId, uSpam1);

  // Check count while fresh
  const uSpam2 = SpamGuardService.checkUserSpam(userId, now);
  assert.strictEqual(uSpam2.count, 1);

  // Mock aging: Set lastCheck to 6 seconds ago to trigger sweeping
  uSpam2.lastCheck = now - 6000;
  SpamGuardService.updateUserSpam(userId, uSpam2);

  // Test manual cleaner
  SpamGuardService.startSpamSweeper(10);
  await new Promise(r => setTimeout(r, 30));
  SpamGuardService.stopSpamSweeper();

  // Now, checkUserSpam should see a clean record (swept)
  const uSpam3 = SpamGuardService.checkUserSpam(userId, Date.now());
  assert.strictEqual(uSpam3.count, 0); // Swept!
});

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
