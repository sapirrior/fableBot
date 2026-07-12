import test from 'node:test';
import assert from 'node:assert';
import { check } from '../src/util/ban.js';
import { SpamGuardService } from '../src/services/SpamGuardService.js';
import { initDb, closeDb } from '../src/db/index.js';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

test('ban check - channel spam rate limit', async (t) => {
  const channelId = 'spam_chan_1';
  const commandObj = { name: 'ping', adminBypass: false };
  const mockMessage = {
    author: { id: 'user_1', username: 'tester' },
    channel: { id: channelId },
    reply: async (opts) => mockMessage
  };

  // Reset/seed SpamGuard state
  const now = Date.now();
  const cSpam = SpamGuardService.checkChannelSpam(channelId, now);
  cSpam.count = 5; // next hit will trigger limit (>=6)
  cSpam.blockedUntil = 0;
  SpamGuardService.updateChannelSpam(channelId, cSpam);

  // Sixth hit should be blocked
  const res = await check(mockMessage, commandObj);
  assert.strictEqual(res, false);
});

test('ban check - user spam rate limit', async (t) => {
  const userId = 'user_spam_1';
  const commandObj = { name: 'ping', adminBypass: false };
  const mockMessage = {
    author: { id: userId, username: 'tester' },
    channel: { id: 'chan_1' },
    reply: async (opts) => mockMessage
  };

  const now = Date.now();
  const uSpam = SpamGuardService.checkUserSpam(userId, now);
  uSpam.count = 2; // next hit will trigger limit (>=3)
  uSpam.blockedUntil = 0;
  SpamGuardService.updateUserSpam(userId, uSpam);

  const res = await check(mockMessage, commandObj);
  assert.strictEqual(res, false);
});

test('ban check - adminBypass bypasses channel disabled check', async (t) => {
  // Initialize test DB for DB queries
  const testDbPath = './src/db/database/test_ban_data.db';
  try {
    initDb(testDbPath);
  } catch (err) {}

  const channelId = 'chan_disabled_1';
  const commandObj = { name: 'help', adminBypass: true };
  const mockMessage = {
    author: { id: 'admin_1', username: 'admin' },
    channel: { id: channelId },
    reply: async (opts) => mockMessage
  };

  // Even if channel disabled command is set, adminBypass should let it pass
  const res = await check(mockMessage, commandObj);
  assert.strictEqual(res, true);

  closeDb();
  if (existsSync(resolve(testDbPath))) {
    try {
      unlinkSync(resolve(testDbPath));
      unlinkSync(resolve(testDbPath + '-wal'));
      unlinkSync(resolve(testDbPath + '-shm'));
    } catch (_) {}
  }
});
