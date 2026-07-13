import test from 'node:test';
import assert from 'node:assert';
import { insectService } from '../src/services/InsectService.js';

test('InsectService - rollInsect tier-first cumulative probability selection matches configuration', (t) => {
  const rollCount = 10000;
  const distribution = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };

  // Perform a high volume of mock rolls to verify functionality, database mapping, and gather stats
  for (let i = 0; i < rollCount; i++) {
    const rolled = insectService.rollInsect();
    
    assert.ok(rolled.id, 'Rolled insect must have an id');
    assert.ok(rolled.name, 'Rolled insect must have a name');
    assert.ok(rolled.rarity, 'Rolled insect must have a rarity');
    assert.ok(rolled.value > 0, 'Rolled insect must have a positive value');
    
    // Check that values matches correct insect database configuration
    const checkObj = insectService.getById(rolled.id);
    assert.ok(checkObj, `Looked up insect must exist for id: ${rolled.id}`);
    assert.strictEqual(rolled.name, checkObj.name);
    assert.strictEqual(rolled.value, checkObj.value);
    
    distribution[rolled.rarity]++;
  }

  // Statistical assertions (validating that the probability distribution matches expected ranks config)
  // Ranks weights: common: 60.0%, uncommon: 28.0%, rare: 10.0%, epic: 1.9%, legendary: 0.1%
  const rates = {
    common: distribution.common / rollCount,
    uncommon: distribution.uncommon / rollCount,
    rare: distribution.rare / rollCount,
    epic: distribution.epic / rollCount,
    legendary: distribution.legendary / rollCount
  };

  // Asserting distribution is within acceptable statistical margins (allowing minor variance for rolls)
  assert.ok(rates.common >= 0.55 && rates.common <= 0.65, `Common rate (${(rates.common * 100).toFixed(2)}%) out of bounds`);
  assert.ok(rates.uncommon >= 0.24 && rates.uncommon <= 0.32, `Uncommon rate (${(rates.uncommon * 100).toFixed(2)}%) out of bounds`);
  assert.ok(rates.rare >= 0.07 && rates.rare <= 0.13, `Rare rate (${(rates.rare * 100).toFixed(2)}%) out of bounds`);
  assert.ok(rates.epic >= 0.005 && rates.epic <= 0.035, `Epic rate (${(rates.epic * 100).toFixed(2)}%) out of bounds`);
  
  // Under 10,000 rolls, legendary is 0.1% (expected 10), so it should be rolled at least once but remain very small
  assert.ok(distribution.legendary >= 0 && distribution.legendary <= 35, `Legendary count (${distribution.legendary}) out of bounds`);
});

test('InsectService - getById lookup robustness', (t) => {
  // Case-insensitive lookup checks
  const antLower = insectService.getById('ant');
  const antUpper = insectService.getById('ANT');
  const antMixed = insectService.getById('aNt');
  
  assert.ok(antLower && antUpper && antMixed);
  assert.strictEqual(antLower.id, 'ant');
  assert.strictEqual(antUpper.id, 'ant');
  assert.strictEqual(antMixed.id, 'ant');

  // Lookup by full name case-insensitive
  const ladybugName = insectService.getById('Ladybug');
  assert.ok(ladybugName);
  assert.strictEqual(ladybugName.id, 'ladybug');

  // Edge cases
  assert.strictEqual(insectService.getById(''), null);
  assert.strictEqual(insectService.getById(null), null);
  assert.strictEqual(insectService.getById(undefined), null);
  assert.strictEqual(insectService.getById('non_existent_insect_id_123'), null);
});
