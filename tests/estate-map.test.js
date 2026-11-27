import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, advance, importGame, newGame, visibleUpgrades } from '../src/game.js';
import { estateMapAreas, estateMapSites, visibleEstateLinks } from '../src/estate-map.js';
import { adjustStock, discoveredGoods } from '../src/industry.js';
import { tintFoliage } from '../src/terrain.js';

function tradingGarden() {
  let state = act({ ...newGame(23), apples: 10_000 }, 'unlock');
  state = act(state, 'shopUpgrade', { id: 'forestPlot' });
  state = act(state, 'permit');
  return act(state, 'placeMarket', { point: { x: 3090, y: 1350 } });
}

test('estate layers and upgrades only appear after their feature is discovered', () => {
  const state = tradingGarden();
  state.upgrades = ['pantry', 'gardenCrew', 'quickPacking', 'berryBaskets'];
  assert.deepEqual(estateMapAreas(state), {
    home: true, garden: true, stall: true, production: false, research: false, power: false,
  });
  assert.ok(visibleUpgrades(state).includes('tradeCrates'));
  assert.ok(!visibleUpgrades(state).includes('batchCraft'));
  assert.ok(!visibleUpgrades(state).includes('fieldNotes'));
  assert.ok(!visibleUpgrades(state).includes('farmWater'));
  assert.ok(!visibleUpgrades({ ...state, trade: { ...state.trade, permit: false } }).includes('tradeCrates'));

  state.industry.unlocked = true;
  state.research = { projects: ['electricity'] };
  state.scientist = { stage: 'accepted' };
  assert.ok(estateMapAreas(state).production);
  assert.ok(visibleUpgrades(state).includes('batchCraft'));
  assert.ok(!estateMapAreas(state).power);
  state.scientist.stage = 'complete';
  assert.ok(estateMapAreas(state).research);
  assert.ok(estateMapAreas(state).power);
  assert.ok(visibleUpgrades(state).includes('fieldNotes'));
});

test('the warehouse hides undiscovered goods and remembers stock that has been spent', () => {
  const state = tradingGarden();
  assert.deepEqual(discoveredGoods(state), ['apples']);
  state.trade.berryKnown = true;
  assert.deepEqual(discoveredGoods(state), ['apples', 'berries']);
  state.industry.unlocked = true;
  assert.ok(!discoveredGoods(state).includes('biofuel'));
  adjustStock(state, 'flour', 3);
  adjustStock(state, 'flour', -3);
  const restored = importGame(JSON.stringify(state));
  assert.equal(restored.industry.stock.flour, 0);
  assert.ok(discoveredGoods(restored).includes('flour'));
  assert.ok(!discoveredGoods(restored).includes('pie'));
});

test('completed walking routes are saved and hidden when an endpoint is removed', () => {
  let state = tradingGarden();
  const stall = state.trade.stalls[0];
  const worker = state.workers[0];
  const stallId = `stall:${stall.id}`;
  state = act(state, 'assignWorkplace', { id: worker.id, place: stallId, role: 'restock' });
  for (let i = 0; i < 1300 && !state.estateLinks?.some(link => link.to === stallId); i++) state = advance(state, 100);
  const restored = importGame(JSON.stringify(state));
  const links = visibleEstateLinks(restored, estateMapSites(restored));
  assert.ok(links.some(link => link.to === stallId && link.points.length > 2));
  const removed = act(restored, 'removeMarket', { stallId: stall.id });
  assert.ok(!visibleEstateLinks(removed, estateMapSites(removed)).some(link => link.to === stallId || link.from === stallId));
});

test('local ground shifts foliage colors while fruit and bark stay unchanged', () => {
  const palette = { leaves:'#6b935c', fruit:'#e47365', bark:'#75503b' };
  const north = tintFoliage(palette, ['leaves'], { x:2000, y:-900 });
  const south = tintFoliage(palette, ['leaves'], { x:2000, y:3400 });
  assert.notEqual(north.leaves, south.leaves);
  assert.equal(north.fruit, palette.fruit);
  assert.equal(south.bark, palette.bark);
});
