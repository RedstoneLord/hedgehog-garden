import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, advance, crewAssignmentPlan, importGame, newGame, workerCharacteristics } from '../src/game.js';
import { gardenGoals } from '../src/garden-goals.js';
import { adjustStock, homeStock, housingCapacity, nearestHome, stockCount } from '../src/industry.js';
import { shelfRoom, stallCapacity } from '../src/market-storage.js';
import { HOUSE } from '../src/orchard.js';
import { uniqueWork } from '../src/perks.js';
import { marketDemand } from '../src/siting.js';

function tradingGarden() {
  let state = act({ ...newGame(23), apples:15000 }, 'unlock');
  state = act(state, 'shopUpgrade', { id:'forestPlot' });
  return act(act(state, 'permit'), 'placeMarket', { point:{ x:3090, y:1350 } });
}

test('a supply hedgehog fills independent fruit buffers with an empty customer queue', () => {
  let state = tradingGarden();
  const stall = state.trade.stalls[0];
  const worker = state.workers[0];
  state.trade.berryKnown = true;
  adjustStock(state, 'berries', 150);
  stall.spawnAt = state.time + 300000;
  stall.stock.apples = stallCapacity(stall);
  assert.equal(shelfRoom(state, stall, 'apples'), 0);
  assert.equal(shelfRoom(state, stall, 'berries'), stallCapacity(stall));
  state = act(state, 'assignWorkplace', { id:worker.id, place:`stall:${stall.id}` });
  for (let i = 0; i < 650 && state.trade.stalls[0].stock.berries < 60; i++) state = advance(state, 100);
  let current = state.trade.stalls[0];
  assert.deepEqual(current.customers, []);
  assert.equal(current.stock.apples, stallCapacity(stall));
  assert.equal(current.stock.berries, 60);
  assert.equal(state.trade.berries, 90);

  state = act(state,'toggleStallStocking',{ stallId:stall.id });
  state = act(state,'returnStock',{ stallId:stall.id });
  state = advance(state,5000);
  current = state.trade.stalls[0];
  assert.equal(current.stock.apples,0);
  assert.equal(current.stock.berries,0);
});

test('competition matches the placement score and lowers actual customer frequency', () => {
  const isolated = tradingGarden();
  const stall = isolated.trade.stalls[0];
  isolated.time = stall.spawnAt;
  const crowded = structuredClone(isolated);
  crowded.trade.stalls.push({ ...stall, id:12345, x:stall.x + 200, spawnAt:isolated.time + 900000, customers:[] });
  const solo = marketDemand(isolated, stall, stall.road, stall.id);
  const overlap = marketDemand(crowded, stall, stall.road, stall.id);
  assert.equal(solo.rivals.length, 0);
  assert.equal(overlap.rivals.length, 1);
  assert.ok(overlap.score < solo.score);
  const original = advance(isolated,100);
  const withNeighbor = advance(crowded,100);
  assert.ok(withNeighbor.trade.stalls[0].spawnAt > original.trade.stalls[0].spawnAt);
});

test('the quest checklist follows market milestones and opens production without requiring a farm', () => {
  let state = tradingGarden();
  assert.deepEqual(gardenGoals(state).map(goal => goal.id), ['market-upgrades']);
  state.trade.marketUpgrades = 2;
  assert.deepEqual(gardenGoals(state).map(goal => goal.id), ['berry-order','production-coins']);
  state.trade.berryKnown = true;
  assert.deepEqual(gardenGoals(state).map(goal => goal.id), ['farm','production-coins']);
  state.trade.coins = 11000;
  assert.equal(gardenGoals(state)[0].id,'production');
  state = act(state,'unlockProduction');
  assert.ok(gardenGoals(state).some(goal => goal.id === 'warehouse'));
  assert.ok(!gardenGoals(state).some(goal => goal.id === 'production'));
});

test('warehouses receive workshop cargo and share stock without increasing housing capacity', () => {
  let state = tradingGarden();
  state.trade.coins = 25000;
  state = act(state,'unlockProduction');
  state = act(state,'buildIndustry',{kind:'workshop',point:{x:1100,y:1250}});
  state = act(state,'buildIndustry',{kind:'warehouse',point:{x:1310,y:1210}});
  const [warehouse] = state.industry.warehouses;
  const [workshop] = state.industry.workshops;
  assert.ok(warehouse && workshop);
  assert.equal(nearestHome(state,workshop).id,warehouse.id);
  assert.equal(nearestHome(state,workshop,undefined,0,true),HOUSE);
  assert.equal(housingCapacity(state),10);
  workshop.output.slices = 6;
  state = act(state,'takeIndustryStock',{id:workshop.id});
  assert.equal(stockCount(state,'slices'),6);
  assert.equal(homeStock(state,state.industry.warehouses[0],'slices'),6);
  assert.equal(homeStock(state,HOUSE,'slices'),0);
  assert.deepEqual(state.resourceReceipts, [{ anchor:warehouse.id, icon:'slices', amount:6, at:state.time }]);
  assert.deepEqual(importGame(JSON.stringify(state)),state);
});

test('the assignment preview distinguishes workers who can move now and those finishing a job', () => {
  let state = act(tradingGarden(),'recruit');
  const [busy, available] = state.workers;
  state.jobs = [{ kind:'transfer', workers:[busy.id] }];
  const selection = { ids:[busy.id,available.id], place:`stall:${state.trade.stalls[0].id}`, role:'restock' };
  assert.deepEqual(crewAssignmentPlan(state, selection).rows.map(row => row.status), ['pending','now']);
  state = act(state,'assignCrew',selection);
  assert.equal(state.workers[0].pendingAssignment.place,selection.place);
  assert.equal(state.workers[1].workRole,'restock');
  assert.equal(state.jobs[0].workers[0],busy.id);
});

test('orchard-eye only rolls below its new threshold and stronger stats widen worker differences', () => {
  const beforeRoll = result => Number((BigInt(result - 1013904223) * 4276115653n) & 0xffffffffn);
  const state = tradingGarden();
  const worker = state.workers[0];
  state.perkRandom = beforeRoll(Math.floor(.000014 * 2 ** 32));
  uniqueWork(state,worker,'harvest');
  assert.ok(!state.perkReveals?.length);
  state.perkRandom = beforeRoll(Math.floor(.000012 * 2 ** 32));
  uniqueWork(state,worker,'harvest');
  assert.equal(state.perkReveals[0].perk,'orchardEye');

  const quality = value => workerCharacteristics(state, { ...worker, stats:{...worker.stats,speed:value,endurance:value,foraging:value} });
  assert.ok(quality(10).speed / quality(5).speed > 1.225);
  assert.equal(quality(10).maxStamina - quality(5).maxStamina,45);
  assert.equal(quality(10).detection - quality(5).detection,100);
});
