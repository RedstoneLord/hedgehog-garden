import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, advance, importGame, newGame, orchardPlots, plotBounds, workerWorkplace } from '../src/game.js';
import { adjustStock, advanceIndustry, COAL_SITES, GOODS, homeStock, housingCapacity, nearestHome, PRODUCTION_PRICE, RECIPES, stockCount } from '../src/industry.js';
import { canServe, marketSite, orderLines } from '../src/trade.js';
import { findRoute } from '../src/routes.js';
import { soilRate } from '../src/siting.js';
import { HOUSE } from '../src/orchard.js';

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
  assert.equal(state.industry.workshops[0].output.compote, RECIPES.compote.amount);
  assert.equal(state.industry.workshops[1].output.slices, RECIPES.slices.amount);
});

test('a maker stays for an active batch when a small amount of output is waiting', () => {
  let state = build(act(ready(), 'unlockProduction'), 'workshop', workshop);
  const site = state.industry.workshops[0];
  const workerId = state.workers[0].id;
  state = act(state, 'assignWorkplace', { id: workerId, place: site.id });
  Object.assign(state.workers[0], workshop);
  state.industry.workshops[0].output.slices = 4;
  state.industry.workshops[0].batch = { key: 'slices', method: 'worker', until: state.time + 5000 };
  const advanced = advance(state, 200);
  assert.equal(advanced.workers[0].x, workshop.x);
  assert.equal(advanced.workers[0].y, workshop.y);
  assert.equal(advanced.industry.workshops[0].output.slices, 4);
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
  state = act(state, 'takeIndustryStock', { id });
  state = act(state, 'upgradeWorkshop', { id });
  state = act(state, 'craft', { id, key: 'pie' });
  state = advance(state, RECIPES.pie.ms);
  assert.equal(stockCount(state, 'flour'), RECIPES.flour.amount - RECIPES.pie.needs.flour);
  assert.equal(state.industry.workshops[0].output.pie, RECIPES.pie.amount);
});

test('coal stays raw until a workshop crafts it, and factory conversion requires all branches', () => {
  let state = build(build(act(ready(), 'unlockProduction'), 'mine', COAL_SITES[1]), 'workshop', workshop);
  const { id: mine } = state.industry.mines[0];
  const { id } = state.industry.workshops[0];
  state = advance(act(state, 'mineCoal', { id: mine }), 7500);
  assert.equal(state.industry.mines[0].coal, 6);
  assert.equal(state.industry.mines[0].fuel, 0);
  state = act(state, 'takeIndustryStock', { id: mine });
  state = advance(act(state, 'craft', { id, key: 'fuel' }), RECIPES.fuel.ms);
  assert.equal(state.industry.workshops[0].output.fuel, RECIPES.fuel.amount);
  state = act(state, 'upgradeWorkshop', { id });
  assert.equal(act(state, 'upgradeWorkshop', { id }), state);
  for (const key of ['speed','yield','buffer']) state = act(state, 'upgradeStation', { id, key });
  state = act(state, 'upgradeWorkshop', { id });
  assert.equal(state.industry.workshops[0].level, 3);
  const shop = state.industry.workshops[0];
  shop.inputs.apples = 12;
  shop.inputs.fuel = 1;
  state = advance(state, 200);
  assert.equal(state.industry.workshops[0].batch.method, 'factory');
  assert.equal(state.industry.workshops[0].inputs.fuel, 0);
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
  for (let n = 0; n < 450 && !state.industry.tractors[0].trip?.loaded; n++) state = advance(state, 200);
  assert.ok(state.industry.tractors[0].trip?.loaded);
  assert.equal(stockCount(state, 'pie'), 2);
  state.trade.stalls[0].spawnAt = 900_000;
  state = importGame(JSON.stringify(state));
  for (let n = 0; n < 100 && !state.industry.deliveries; n++) state = advance(state, 200);
  assert.equal(state.industry.deliveries, 1);
  assert.equal(stockCount(state, 'fuel') + state.industry.tractors[0].tank, 2);
  const destination = state.trade.stalls[0];
  assert.ok(canServe(destination, destination.customers[0].order));
  const coins = state.trade.coins;
  state = act(state, 'fillOrder', { stallId: destination.id, customerId: 617 });
  assert.ok(state.trade.coins > coins + 100);
  assert.equal(state.trade.stalls[0].stock.pie, 0);
});

test('housing caps hiring and new houses have distinct stock', () => {
  let state = ready();
  while (state.workers.length < 10) state = act(state, 'recruit');
  assert.equal(housingCapacity(state), 10);
  assert.equal(act(state, 'recruit'), state);
  state = build(state, 'house', house);
  assert.equal(housingCapacity(state), 15);
  assert.equal(nearestHome(state, workshop).id, state.industry.houses[0].id);
  const mainApples = state.apples;
  adjustStock(state, 'apples', 25, state.industry.houses[0]);
  assert.equal(homeStock(state, state.industry.houses[0], 'apples'), 25);
  assert.equal(homeStock(state, undefined, 'apples'), mainApples);
  const saved = importGame(JSON.stringify(state));
  assert.equal(homeStock(saved, saved.industry.houses[0], 'apples'), 25);

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
  state.industry.workshops[0].inputs.apples = 12;
  state = advance(state, 100);
  assert.ok(state.industry.mines[0].mineAt);
  assert.equal(state.industry.workshops[0].batch.method, 'worker');
  state = advance(state, 8000);
  assert.equal(state.industry.workshops[0].output.slices, 6);
  state = advance(state, 4600);
  assert.equal(state.industry.mines[0].coal, 6);
  const serial = state.guide.serial;
  assert.equal(act(state, 'dismissGuide', { serial: serial - 1 }), state);
  state = act(state, 'dismissGuide', { serial });
  assert.equal(importGame(JSON.stringify(state)).guide, null);
});

test('a legacy shared stock and unrefined coal survive logistics migration', () => {
  let state = build(build(act(ready(), 'unlockProduction'), 'mine', COAL_SITES[1]), 'house', house);
  delete state.industry.logisticsVersion;
  delete state.industry.houses[0].stock;
  Object.assign(state.industry.mines[0], { coal: 3, fuel: 7, refineAt: 4500 });
  state.industry.stock.fuel = 4;
  const apples = state.apples;
  state = importGame(JSON.stringify(state));
  assert.equal(homeStock(state, undefined, 'apples'), apples);
  assert.deepEqual(state.industry.houses[0].stock, {});
  assert.equal(state.industry.mines[0].coal, 3);
  assert.equal(state.industry.mines[0].fuel, 7);
  assert.equal(state.industry.mines[0].refineAt, null);
  assert.equal(homeStock(state, undefined, 'fuel'), 4);
  assert.deepEqual(importGame(JSON.stringify(state)), state);
});

test('warehouse stock cannot start an automatic recipe until a porter delivers it', () => {
  let state = build(build(act(ready(), 'unlockProduction'), 'workshop', workshop), 'house', house);
  const { id } = state.industry.workshops[0];
  state = act(state, 'assignWorkplace', { id: state.workers[0].id, place: id });
  Object.assign(state.workers[0], workshop);
  state = advance(state, 200);
  assert.equal(state.industry.workshops[0].batch, null);
  state = act(state, 'recruit');
  const worker = state.workers[1].id;
  state = act(state, 'assignWorkplace', { id: worker, place: id });
  state = act(state, 'assignRole', { id: worker, role: 'porter' });
  Object.assign(state.workers[1], house);
  adjustStock(state, 'apples', 24, state.industry.houses[0]);
  state = advance(state, 200);
  assert.ok(state.workers[1].industryCargo);
  assert.equal(state.industry.workshops[0].batch, null);
  state = importGame(JSON.stringify(state));
  for (let i = 0; i < 100 && !state.industry.workshops[0].batch; i++) state = advance(state, 200);
  assert.equal(state.industry.workshops[0].batch?.method, 'worker');
  assert.equal(state.workers[0].x, workshop.x);
});

test('one tractor takes a reserved shipment to two nearby stalls without spending fuel twice', () => {
  let state = build(act(ready(), 'unlockProduction'), 'tractor', tractor);
  state = act(state, 'placeMarket', { point: roadStall });
  state = act(state, 'placeMarket', { point: { x: 1660, y: 1320 } });
  assert.equal(state.trade.stalls.length, 2);
  const vehicle = state.industry.tractors[0];
  state = act(state, 'assignWorkplace', { id: state.workers[0].id, place: vehicle.id });
  Object.assign(state.workers[0], tractor);
  state.industry.tractors[0].tank = 2;
  state.industry.stock.pie = 10;
  for (const stall of state.trade.stalls) {
    stall.spawnAt = 900_000;
    stall.customers.push({ id: state.nextId++, kind: 'bobby', gate: 0, phase: 'queue', x: stall.x, y: stall.y,
      order: { pie: 5, accepted: true, coins: 160 } });
  }
  for (let n = 0; n < 100 && !state.industry.tractors[0].trip?.loaded; n++) state = advance(state, 200);
  assert.ok(state.industry.tractors[0].trip?.nextDrop);
  state = importGame(JSON.stringify(state));
  for (let n = 0; n < 150 && state.industry.deliveries < 2; n++) state = advance(state, 200);
  assert.deepEqual(state.trade.stalls.map(stall => stall.stock.pie), [5, 5]);
  assert.equal(state.industry.tractors[0].tank, 1);
});

test('crafting perks carry from workshops into optional factory tuning and respect their output buffer', () => {
  let state = build(act(ready(),'unlockProduction'),'workshop',workshop);
  const id = state.workers[0].id;
  const siteId = state.industry.workshops[0].id;
  state = act(state,'assignWorkplace',{id,place:siteId});
  Object.assign(state.workers[0],workshop,{perks:['steady','batchMaster']});
  state.industry.workshops[0].inputs.apples = 48;
  state = advance(state,85);
  let shop = state.industry.workshops[0];
  assert.equal(shop.batch.amount,RECIPES.slices.amount + 1);
  assert.ok(Math.abs((shop.batch.until - state.time) - RECIPES.slices.ms * .92 / 1.18) < 1e-7);
  shop.level = 3;
  shop.inputs.fuel = 6;
  shop.batch = null;
  state = advance(state,85);
  shop = state.industry.workshops[0];
  assert.equal(shop.batch.method,'factory');
  assert.equal(shop.batch.workerId,id);
  assert.equal(shop.batch.amount,RECIPES.slices.amount + 1);
  assert.equal(shop.batch.until - state.time,RECIPES.slices.ms * .92 / 2);
  assert.ok(importGame(JSON.stringify(state)));

  shop.batch = null;
  shop.output.slices = 48 - RECIPES.slices.amount;
  state = advance(state,85);
  assert.equal(state.industry.workshops[0].batch.amount,RECIPES.slices.amount);
  state.industry.workshops[0].batch = null;
  state.industry.workshops[0].output = {};
  state.workers[0].siteId = null;
  state = advance(state,85);
  assert.equal(state.industry.workshops[0].batch.workerId,undefined);
  assert.equal(state.industry.workshops[0].batch.until - state.time,RECIPES.slices.ms / 2);
});

test('mining perks are applied at the start and survive a rest or reload before payout', () => {
  let state = build(act(ready(),'unlockProduction'),'mine',COAL_SITES[1]);
  const siteId = state.industry.mines[0].id;
  const id = state.workers[0].id;
  state = act(state,'assignWorkplace',{id,place:siteId});
  Object.assign(state.workers[0],COAL_SITES[1],{perks:['iron','stoneListener'],stamina:1});
  state = advance(state,85);
  assert.equal(state.industry.mines[0].mineAt - state.time,6750);
  assert.equal(state.industry.mines[0].pendingCoal,8);
  assert.equal(state.workers[0].stamina,0);
  state = importGame(JSON.stringify(state));
  assert.ok(state);
  state = advance(state,6750);
  assert.equal(state.industry.mines[0].coal,8);
  assert.equal(state.industry.mines[0].pendingCoal,undefined);
});

test('the tractor driver perk increases fuel collected without spending additional fuel', () => {
  const state = build(act(ready(),'unlockProduction'),'tractor',tractor);
  const vehicle = state.industry.tractors[0];
  const driver = state.workers[0];
  Object.assign(vehicle,HOUSE,{tank:0});
  Object.assign(driver,HOUSE,{workRole:'driver',siteId:vehicle.id,perk:'roadCaptain'});
  state.industry.stock.fuel = 12;
  advanceIndustry(state,.1,()=>{});
  assert.equal(vehicle.tank,6);
  assert.equal(stockCount(state,'fuel'),6);
});
