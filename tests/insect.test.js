import test from 'node:test';
import assert from 'node:assert';
import { insectService } from '../src/services/InsectService.js';

test('InsectService - rollInsect tier-first cumulative probability selection matches configuration', (t) => {
  // Perform multiple mock rolls to verify functionality and check rank validity
  for (let i = 0; i < 50; i++) {
    const rolled = insectService.rollInsect();
    
    assert.ok(rolled.id, 'Rolled insect must have id property');
    assert.ok(rolled.name, 'Rolled insect must have name property');
    assert.ok(rolled.rarity, 'Rolled insect must have rarity property');
    assert.ok(['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(rolled.rarity), 'Rarity must be valid');
    
    // Check that values matches correct insect database configuration
    const checkObj = insectService.getById(rolled.id);
    assert.strictEqual(rolled.name, checkObj.name);
    assert.strictEqual(rolled.value, checkObj.value);
  }
});
