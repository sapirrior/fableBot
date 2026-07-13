import test from 'node:test';
import assert from 'node:assert';
import { highlowService } from '../src/services/HighLowService.js';

test('HighLowService - session tracking and management', (t) => {
  const userId = 'highlow_user_1';

  // 1. Initial state
  assert.strictEqual(highlowService.hasSession(userId), false, 'Initially, user should not have a session');

  // 2. Start session
  highlowService.startSession(userId);
  assert.strictEqual(highlowService.hasSession(userId), true, 'User should have a session after startSession');

  // 3. End session
  highlowService.endSession(userId);
  assert.strictEqual(highlowService.hasSession(userId), false, 'User should not have a session after endSession');
});
