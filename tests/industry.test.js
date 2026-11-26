import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, advance, importGame, newGame, orchardPlots, plotBounds, workerWorkplace } from '../src/game.js';
import { COAL_SITES, GOODS, housingCapacity, nearestHome, PRODUCTION_PRICE, RECIPES, stockCount } from '../src/industry.js';
import { canServe, marketSite, orderLines } from '../src/trade.js';
import { findRoute } from '../src/routes.js';
import { soilRate } from '../src/siting.js';

const workshop = { x: 1160, y: 1250 };
const house = { x: 1370, y: 1110 };
const tractor = { x: 1500, y: 1380 };
const roadStall = { x: 1300, y: 1340 };
const farm = { x: 4500, y: 800 };

function ready() {
  let state = act({ ...newGame(17), apples: 100_000 }, 'unlock');
  state = act(state, 'shopUpgrade', { id: 'forestPlot' });
  state = act(state, 'permit');
  state.trade.coins = 100_000;
  return state;
}

const build = (state, kind, point) => act(state, 'buildIndustry', { kind, point });

test('production costs 10,000 coins and multiple workshops keep independent recipes', () => {
  const before = ready();
  assert.equal(build(before, 'workshop', workshop), before);
  let state = act(before, 'unlockProduction');
  assert.equal(state.trade.coins, before.trade.coins - PRODUCTION_PRICE);
  assert.equal(act(state, 'unlockProduction'), state);
  assert.ok(Object.keys(RECIPES).length >= 8);
  state = build(state, 'workshop', workshop);
  state = build(state, 'workshop', { x: 980, y: 1110 });
  const [first, second] = state.industry.workshops;
  assert.equal(act(state, 'chooseRecipe', { id: first.id, key: 'pie' }), state);
  state = act(state, 'craft', { id: first.id, key: 'compote' });
  assert.equal(state.apples, before.apples - RECIPES.compote.needs.apples);
  assert.equal(act(state, 'craft', { id: first.id, key: 'slices' }), state);
  state = act(state, 'craft', { id: second.id, key: 'slices' });
  state = importGame(JSON.stringify(state));
  state = advance(state, RECIPES.compote.ms + 10);
  assert.equal(stockCount(state, 'compote'), RECIPES.compote.amount);
  assert.equal(stockCount(state, 'slices'), RECIPES.slices.amount);
});

test('mixed farms water berries and wheat, and wheat can be processed into flour and pie', () => {
  let state = act(ready(), 'unlockProduction');
  state = act(state, 'placeFarm', { point: farm });
  state = act(state, 'plant', { point: { x: 4480, y: 800 }, variety: 'wheat' });
  state = act(state, 'plant', { point: { x: 4560, y: 800 }, variety: 'berry' });
  const firstCrop = state.trees[0].id;
  state = act(state, 'refillCan');
  state = act(state, 'waterPlant', { id: firstCrop });
  assert.equal(state.trade.canWater, 1);
  assert.ok(state.trees.every(tree => tree.readyAt > state.time));
  state = advance(state, 17000);
  assert.deepEqual(state.trees.map(tree => tree.fruit), [7, 8]);
  state = act(state, 'harvest', { id: firstCrop });
  assert.equal(state.orchards.at(-1).fill.wheat, 7);
  assert.equal(state.trees[0].readyAt, null);

  state = build(state, 'workshop', workshop);
  const id = state.industry.workshops[0].id;
  state.industry.stock.wheat = 10;
  state = act(state, 'craft', { id, key: 'flour' });
  state = advance(state, RECIPES.flour.ms);
  state = act(state, 'upgradeWorkshop', { id });
  state = act(state, 'craft', { id, key: 'pie' });
  state = advance(state, RECIPES.pie.ms);
  assert.equal(stockCount(state, 'flour'), RECIPES.flour.amount - RECIPES.pie.needs.flour);
  assert.equal(stockCount(state, 'pie'), RECIPES.pie.amount);
});

test('inexhaustible coal powers factory automation and workshop staff can buy jars', () => {
  let state = act(ready(), 'unlockProduction');
  state = build(state, 'mine', COAL_SITES[1]);
  state = build(state, 'workshop', workshop);
  const mine = state.industry.mines[0].id;
  const id = state.industry.workshops[0].id;
  const worker = state.workers[0].id;
  for (let cycle = 0; cycle < 2; cycle++) {
    state = act(state, 'makeFuel', { id: mine });
    state = advance(state, 7500);
    assert.equal(state.industry.mines[0].coal, 3);
    state = advance(state, 4500);
    assert.equal(state.industry.mines[0].coal, 0);
  }
  state = act(state, 'takeIndustryStock', { id: mine });
  assert.equal(stockCount(state, 'fuel'), 6);
  state = act(state, 'upgradeWorkshop', { id });
  state = act(state, 'assignWorkplace', { id: worker, place: id });
  assert.equal(workerWorkplace(state.workers[0]), id);
  state = act(state, 'upgradeWorkshop', { id });
  assert.equal(state.workers[0].workRole, 'auto');
  state = act(state, 'chooseRecipe', { id, key: 'jam' });
  state = act(state, 'assignWorkplace', { id: worker, place: id });
  state.trade.berries = 14;
  state.workers[0].x = nearestHome(state, workshop).x;
  state.workers[0].y = nearestHome(state, workshop).y;
  const coins = state.trade.coins;
  state = advance(state, 200);
  assert.ok(state.trade.coins < coins);
  assert.equal(stockCount(state, 'fuel'), 5);
  assert.equal(stockCount(state, 'jars'), 4);
  state = advance(state, RECIPES.jam.ms);
  assert.equal(state.industry.workshops[0].output.jam, RECIPES.jam.amount);
  state = act(state, 'takeIndustryStock', { id });
  assert.equal(stockCount(state, 'jam'), RECIPES.jam.amount);
});

test('a red tractor delivers finished goods to an accepted order and a save preserves its cargo', () => {
  let state = act(ready(), 'unlockProduction');
  state = act(state, 'placeMarket', { point: roadStall });
  state = build(state, 'tractor', tractor);
  const { id: vehicle } = state.industry.tractors[0];
  const id = state.workers[0].id;
  state = act(state, 'assignWorkplace', { id, place: vehicle });
  Object.assign(state.workers[0], tractor);
  state.industry.stock.fuel = 3;
  state.industry.stock.pie = 7;
  const stall = state.trade.stalls[0];
  stall.spawnAt = Infinity;
  stall.customers.push({ id: 617, kind: 'bobby', gate: 0, phase: 'queue', ...roadStall,
    order: { pie: 5, accepted: true, coins: 100 + 5 * GOODS.pie.value } });
  assert.deepEqual(orderLines(stall.customers[0].order).map(line => line.key), ['pie']);
  for (let n = 0; n < 100 && !state.industry.tractors[0].trip?.loaded; n++) state = advance(state, 200);
  assert.ok(state.industry.tractors[0].trip?.loaded);
  assert.equal(stockCount(state, 'pie'), 2);
  state.trade.stalls[0].spawnAt = 900_000;
  state = importGame(JSON.stringify(state));
  for (let n = 0; n < 100 && !state.industry.deliveries; n++) state = advance(state, 200);
  assert.equal(state.industry.deliveries, 1);
  assert.equal(stockCount(state, 'fuel'), 2);
  const destination = state.trade.stalls[0];
  assert.ok(canServe(destination, destination.customers[0].order));
  const coins = state.trade.coins;
  state = act(state, 'fillOrder', { stallId: destination.id, customerId: 617 });
  assert.ok(state.trade.coins > coins + 100);
  assert.equal(state.trade.stalls[0].stock.pie, 0);
});

test('housing caps hiring and new houses share storage with the original home', () => {
  let state = ready();
  while (state.workers.length < 10) state = act(state, 'recruit');
  assert.equal(housingCapacity(state), 10);
  assert.equal(act(state, 'recruit'), state);
  state = build(state, 'house', house);
  assert.equal(housingCapacity(state), 15);
  assert.equal(nearestHome(state, workshop).id, state.industry.houses[0].id);
  assert.equal(act(state, 'recruit').workers.length, 11);
});

test('crowded plots immediately lose growth and recover after a move, and nearby housing lowers demand', () => {
  let state = act(ready(), 'placeGarden', { point: { x: 4950, y: 2100 } });
  state = act(state, 'plant', { point: { x: 5000, y: 2060 } });
  state = act(state, 'harvest', { id: state.trees[0].id });
  state = act(state, 'placeGarden', { point: { x: 5510, y: 2110 } });
  const first = plotBounds(state, 'apple-1');
  assert.ok(soilRate(first, orchardPlots(state)) < .5);
  state = advance(state, 5501);
  assert.equal(state.trees[0].fruit, 0);
  state = act(state, 'moveGarden', { orchardId: 'apple-2', point: { x: 4950, y: 2730 } });
  assert.equal(soilRate(plotBounds(state, 'apple-1'), orchardPlots(state)), 1);
  state = advance(state, 5501);
  assert.ok(state.trees[0].fruit);
  const plots = orchardPlots(state);
  assert.equal(marketSite(state, roadStall, plots).traffic, 'high');
  state = build(state, 'house', house);
  assert.equal(marketSite(state, roadStall, plots).traffic, 'low');
});

test('player roads improve routing, and paving speeds the same segment again', () => {
  let state = act(ready(), 'unlockProduction');
  const from = { x: 1000, y: 850 }, to = { x: 1500, y: 850 };
  const before = findRoute(from, to).cost;
  state = act(state, 'buildRoad', { from, to });
  const dirt = findRoute(from, to, state.industry.roads).cost;
  assert.ok(dirt < before);
  state = act(state, 'upgradeRoad', { id: state.industry.roads[0].id });
  assert.ok(findRoute(from, to, state.industry.roads).cost < dirt);
});

test('assigned workers operate a coal mine and workshop, and dismissed help stays dismissed in a save', () => {
  let state = act(ready(), 'unlockProduction');
  state = build(build(state, 'mine', COAL_SITES[1]), 'workshop', workshop);
  const [miner] = state.workers;
  state = act(state, 'recruit');
  const maker = state.workers[1];
  const { id: mine } = state.industry.mines[0];
  const { id: shop } = state.industry.workshops[0];
  state = act(state, 'assignWorkplace', { id: miner.id, place: mine });
  state = act(state, 'assignWorkplace', { id: maker.id, place: shop });
  Object.assign(state.workers[0], COAL_SITES[1]);
  Object.assign(state.workers[1], workshop);
  state = advance(state, 100);
  assert.ok(state.industry.mines[0].mineAt);
  assert.equal(state.industry.workshops[0].batch.method, 'worker');
  state = advance(state, 8000);
  assert.equal(state.industry.workshops[0].output.slices, 6);
  state = advance(state, 4600);
  assert.equal(state.industry.mines[0].fuel, 3);
  const serial = state.guide.serial;
  assert.equal(act(state, 'dismissGuide', { serial: serial - 1 }), state);
  state = act(state, 'dismissGuide', { serial });
  assert.equal(importGame(JSON.stringify(state)).guide, null);
});
