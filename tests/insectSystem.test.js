import test from 'node:test';
import assert from 'node:assert';
import { insectService } from '../src/services/InsectService.js';
import { itemService } from '../src/services/ItemService.js';

test('InsectSystem - ItemService loads correctly', (t) => {
  const shopItems = itemService.getShopItems();
  assert.ok(shopItems.length > 0, 'Shop must contain items');

  const basicNet = itemService.getItem('basic_net');
  assert.ok(basicNet, 'Must be able to retrieve basic_net');
  assert.strictEqual(basicNet.name, 'Basic Net');
  assert.strictEqual(basicNet.category, 'net');
  assert.strictEqual(basicNet.price, 100);

  const sweetHoney = itemService.getItem('sweet_honey');
  assert.ok(sweetHoney, 'Must be able to retrieve sweet_honey');
  assert.strictEqual(sweetHoney.category, 'bait');
  assert.strictEqual(sweetHoney.price, 150);
});

test('InsectSystem - computeLevel calculates correctly for infinite curve', (t) => {
  // Test Level 1 edge
  const lvl1 = insectService.computeLevel(0);
  assert.strictEqual(lvl1.level, 1);
  assert.strictEqual(lvl1.currentXp, 0);

  // Test progression boundaries
  // Level 1 boundary is under 120 XP
  const lvl1Mid = insectService.computeLevel(100);
  assert.strictEqual(lvl1Mid.level, 1);

  // Level 2 boundary starts at 120 XP
  const lvl2Start = insectService.computeLevel(120);
  assert.strictEqual(lvl2Start.level, 2);
  assert.strictEqual(lvl2Start.currentXp, 0);

  // Deep level checks for infinite progression
  const massiveLvl = insectService.computeLevel(50000);
  assert.ok(massiveLvl.level > 20, 'Level should scale up to large values');
  assert.ok(massiveLvl.title, 'Must yield a catcher title');
});

test('InsectSystem - computeSellValue calculates duplicate bonus correctly', (t) => {
  const mockInsect = { id: 'ladybug', name: 'Ladybug', value: 10 };

  // 1 copy sells for base value
  const val1 = insectService.computeSellValue(mockInsect, 1);
  assert.strictEqual(val1, 10);

  // 5 copies have duplicate multiplier applied
  const val5 = insectService.computeSellValue(mockInsect, 5);
  // multiplier: 1 + 0.12 * log2(6) = 1 + 0.12 * 2.58 = 1.31
  // base * 1.31 = 13.1 -> 13
  assert.strictEqual(val5, 13);

  // 100 copies have duplicate multiplier applied
  const val100 = insectService.computeSellValue(mockInsect, 100);
  // multiplier: 1 + 0.12 * log2(101) = 1 + 0.12 * 6.658 = 1.7989
  // base * 1.79 = 17.9 -> 17
  assert.strictEqual(val100, 17);
});
