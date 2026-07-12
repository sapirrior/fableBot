import test from 'node:test';
import assert from 'node:assert';
import { checkCooldown, startCooldownSweeper } from '../src/util/cooldown.js';

test('cooldown checks and increments', (t) => {
  const userId = 'cool_user_1';
  const command = 'catch';

  // First check should return 0 (not on cooldown) and set cooldown
  const left1 = checkCooldown(userId, command, 5000);
  assert.strictEqual(left1, 0);

  // Immediate second check should return remaining cooldown time (>0)
  const left2 = checkCooldown(userId, command, 5000);
  assert.ok(left2 > 0);
  assert.ok(left2 <= 5000);
});
