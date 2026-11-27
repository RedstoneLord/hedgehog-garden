import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, advance, canPlaceSprinkler, constructionPlots, FOREST_WORKPLACE, importGame, loadGame, newGame, orchardPlots, plotBounds, stallWorkplace, workerCharacteristics, workerWorkplace, workplaces } from '../src/game.js';
import { hairstyles, looks } from '../src/customer-looks.js';
import { CUSTOMERS } from '../src/customers.js';
import { basketLimit, berryBounds, BERRY_ORCHARD, FOREST_BASKET, FOREST_ORCHARD, HOUSE } from '../src/orchard.js';
import { advanceCustomers, BERRY_OFFER_DELAY, canServe, farmAvailable, farmSite, frontCustomer, GLOBAL_UPGRADES, globalUpgradePrice, landPrice, landSite, marketSite, moveTradeJob, orderPayment, PERMIT_PRICE, queueCapacity, stallPrice } from '../src/trade.js';
import { FOREST_CLEARING, riverDistance, terrainKind, TRADE_GATES, TRADE_ROADS } from '../src/terrain.js';

const stallSpot = { x: 3090, y: 1350 };
const secondSpot = { x: 1300, y: 1340 };
const farmSpot = { x: 4500, y: 800 };
const secondFarm = { x: 4950, y: 2100 };
const secondGarden = { x: 4450, y: 2800 };
function until(state, condition, steps = 2500) {
  for (let i = 0; i < steps && !condition(state); i++) state = advance(state, 200);
  assert.ok(condition(state), 'expected condition before timeout');
  return state;
}
function withStall() {
  let state = act({ ...newGame(7), apples: 20000 }, 'unlock');
  state = act(state, 'shopUpgrade', { id: 'forestPlot' });
  state = act(state, 'permit');
  state = act(state, 'placeMarket', { point: stallSpot });
  assert.ok(state.trade.stalls[0]);
  return state;
}
function fulfill(state) {
  const stall = state.trade.stalls[0];
  const customer = frontCustomer(stall);
  state = act(state, 'acceptOrder', { stallId: stall.id, customerId: customer.id });
  state = until(state, current => canServe(current.trade.stalls[0], customer.order));
  return act(state, 'fillOrder', { stallId: stall.id, customerId: customer.id });
}

test('repeat land purchases charge coins by plot type and reject overlapping or occupied sites', () => {
  let state = withStall();
  const garden = { x: 4200, y: 700 };
  assert.equal(act(state, 'placeGarden', { point: garden }), state);
  state.trade.coins = 20_000;
  assert.equal(act(state, 'placeFarm', { point: farmSpot }), state);
  assert.equal(act(state, 'placeGarden', { point: stallSpot }), state);
  assert.equal(landPrice(state, false), 2000);
  state = act(state, 'placeGarden', { point: garden });
  assert.equal(state.trade.coins, 18_000);
  assert.equal(landPrice(state, false), 5000);
  assert.equal(landSite(state, farmSpot, constructionPlots(state)), null);
  assert.equal(act(state, 'placeGarden', { point: garden }), state);
  state = act(state, 'placeGarden', { point: secondGarden });
  assert.equal(landPrice(state, false), 12_500);
  assert.deepEqual(state.orchards.slice(-2).map(orchard => orchard.id), ['apple-1', 'apple-2']);
  state = act(state, 'plant', { point: garden });
  assert.equal(state.trees[0].orchardId, 'apple-1');
  assert.ok(canPlaceSprinkler(state, secondGarden, 'apple-2'));
  state = act(state, 'assignWorkplace', { id: state.workers[0].id, place: 'apple-2' });
  assert.equal(workerWorkplace(state.workers[0]), 'apple-2');
  assert.deepEqual(importGame(JSON.stringify(state)), state);
});

test('each additional berry farm has its own bushes, water source, and workplace', () => {
  let state = withStall();
  state.trade.coins = 20_000;
  state.trade.berryKnown = true;
  state.trade.marketUpgrades = 2;
  state = act(state, 'placeFarm', { point: farmSpot });
  assert.equal(landPrice(state, true), 2500);
  assert.equal(act(state, 'placeFarm', { point: farmSpot }), state);
  state = act(state, 'placeFarm', { point: secondFarm });
  assert.equal(state.trade.coins, 16_500);
  assert.equal(landPrice(state, true), 6250);
  assert.equal(state.trade.berrySeeds, 4);
  state = act(state, 'plant', { point: farmSpot, variety: 'berry' });
  state = act(state, 'plant', { point: secondFarm, variety: 'berry' });
  assert.deepEqual(state.trees.map(tree => tree.orchardId), ['berry', 'berry-2']);
  assert.equal(canPlaceSprinkler(state, { x: secondFarm.x + 100, y: secondFarm.y }, 'berry-2'), false);
  const id = state.workers[0].id;
  state = act(state, 'assignWorkplace', { id, place: 'berry-2' });
  state = act(state, 'assignRole', { id, role: 'water' });
  state = importGame(JSON.stringify(state));
  assert.equal(workerWorkplace(state.workers[0]), 'berry-2');
  assert.ok(workplaces(state).find(place => place.id === 'berry-2').roles.includes('water'));
  state = advance(state, 200);
  assert.equal(state.jobs.find(job => job.kind === 'water').treeId, state.trees[1].id);
  state = advance(state, 200);
  const secondSource = berryBounds(state, 'berry-2').water;
  const { route } = state.jobs.find(job => job.kind === 'water');
  assert.deepEqual({ x: route.x, y: route.y }, secondSource);
  state = until(state, current => current.trees[1].readyAt !== null);
  assert.equal(state.trees[0].readyAt, null);
  const firstPlot = plotBounds(state, 'berry');
  const movedFarm = { x: 4450, y: 2800 };
  state = act(state, 'placeFarm', { point: movedFarm, moving: true, orchardId: 'berry-2' });
  assert.deepEqual(plotBounds(state, 'berry'), firstPlot);
  assert.deepEqual({ x: state.trees[1].x, y: state.trees[1].y }, movedFarm);
  assert.equal(landPrice(state, true), 6250);
  assert.deepEqual(importGame(JSON.stringify(state)), state);
});

test('global coin upgrades apply across the map and persist separately from stall improvements', () => {
  let state = withStall();
  state.trade.coins = 5000;
  const worker = state.workers[0];
  const speed = workerCharacteristics(state, worker).speed;
  assert.equal(act(state, 'buyGlobalUpgrade', { key: 'greenhouse' }), state);
  assert.equal(act(state, 'buyGlobalUpgrade', { key: 'fake' }), state);
  const initialCoins = state.trade.coins;
  let spent = 0;
  for (let rank = 0; rank < GLOBAL_UPGRADES.boots.max; rank++) {
    spent += globalUpgradePrice(state, 'boots');
    state = act(state, 'buyGlobalUpgrade', { key: 'boots' });
  }
  assert.equal(state.trade.coins, initialCoins - spent);
  assert.equal(act(state, 'buyGlobalUpgrade', { key: 'boots' }), state);
  assert.ok(Math.abs(workerCharacteristics(state, state.workers[0]).speed / speed - 1.12) < .0001);
  state = act(state, 'buyGlobalUpgrade', { key: 'guild' });
  assert.equal(orderPayment(state, state.trade.stalls[0], { coins: 100 }), 105);
  assert.equal(state.trade.marketUpgrades, 0);
  assert.deepEqual(importGame(JSON.stringify(state)).trade.globalUpgrades, { boots:3, guild:1 });
  const old = structuredClone(state);
  delete old.trade.globalUpgrades;
  assert.deepEqual(importGame(JSON.stringify(old)).trade.globalUpgrades, {});
});

test('the larger roster yields distinct walking visitors before the first berry commission', () => {
  const common = Object.keys(CUSTOMERS).filter(id => !CUSTOMERS[id].regular && !CUSTOMERS[id].unique);
  assert.equal(common.length, 25);
  assert.ok(common.every(id => looks[CUSTOMERS[id].look]));
  for (const [index, id] of common.entries()) {
    const state = withStall();
    const stall = state.trade.stalls[0];
    state.trade.sales = 1;
    state.time = stall.spawnAt;
    const rolls = [.99, (index + .5) / (common.length + 2)];
    advanceCustomers(state, 0, () => rolls.shift() ?? .99);
    assert.equal(stall.customers[0].kind, id);
    assert.equal(stall.customers[0].order.berries, 0);
  }
  const guests = Object.keys(CUSTOMERS).filter(id => CUSTOMERS[id].unique);
  for (const id of ['tsoi', 'bomshtein', 'kharinov', 'butusov', 'voldemar']) {
    const guest = CUSTOMERS[id];
    assert.ok(hairstyles[looks[guest.look].hairStyle]);
    const state = withStall();
    const stall = state.trade.stalls[0];
    state.trade.sales = 1;
    state.time = stall.spawnAt;
    const rolls = [.01, (guests.indexOf(id) + .5) / guests.length];
    advanceCustomers(state, 0, () => rolls.shift() ?? .99);
    assert.equal(stall.customers[0].kind, id);
  }
});

test('regular travelers and special guests offer berry orders after discovery even with empty stock', () => {
  const normal = Object.keys(CUSTOMERS).filter(id => !CUSTOMERS[id].regular && !CUSTOMERS[id].unique);
  const special = Object.keys(CUSTOMERS).filter(id => CUSTOMERS[id].unique);
  for (const [id, roster, added, roll, apples, berries] of [
    ['baker', normal, 4, .99, 40, 20],
    ['postwoman', normal, 4, .99, 0, 15],
    ['bomshtein', special, 0, .01, 0, 18],
    ['butusov', special, 0, .01, 35, 16],
    ['voldemar', special, 0, .01, 0, 16],
  ]) {
    for (const known of [false, true]) {
      const state = withStall();
      state.trade.sales = 1;
      state.trade.berryKnown = known;
      const stall = state.trade.stalls[0];
      state.time = stall.spawnAt;
      const eligibleCount = roster.length + added - (!known && added ? 2 : 0);
      const rolls = [roll, (roster.indexOf(id) + .5) / eligibleCount, .99];
      advanceCustomers(state, 0, () => rolls.shift() ?? .99);
      const guest = stall.customers[0];
      assert.equal(guest.kind, id);
      assert.equal(guest.order.berries, known ? berries : 0);
      if (known) assert.equal(guest.order.apples, apples);
      assert.equal(guest.order.commission, false);
    }
  }
});

test('forest orchard costs 1750, uses larger baskets, and unlocks a permit and a single included stall', () => {
  const start = act({ ...newGame(202), apples: 12000 }, 'unlock');
  assert.equal(act(start,'permit'), start);
  let state = act(start,'shopUpgrade',{id:'forestPlot'});
  assert.equal(state.apples, start.apples - 1750);
  assert.equal(state.forestSeeds, 3);
  const forest = state.orchards.find(item => item.id === FOREST_ORCHARD);
  assert.equal(basketLimit(forest),18);
  const orchardPoint = { x:FOREST_CLEARING.x + 240, y:FOREST_CLEARING.y + 355 };
  assert.equal(act(state,'plant',{point:{x:2220,y:1550},variety:'forest'}),state);
  state = act(state,'plant',{point:orchardPoint,variety:'forest'});
  assert.equal(state.trees[0].fruit,9);
  state = act(state,'shopUpgrade',{id:'basket',orchardId:FOREST_ORCHARD});
  assert.equal(basketLimit(state.orchards.at(-1)),26);
  state = act(state,'assignOrchard',{id:state.workers[0].id,orchardId:FOREST_ORCHARD});
  const balance = state.apples;
  state = until(state, current => current.apples > balance, 3000);
  assert.equal(state.apples - balance,78);
  assert.equal(PERMIT_PRICE, 2500);
  const before = state.apples;
  assert.equal(act({ ...state, apples: PERMIT_PRICE - 1 }, 'permit').trade.permit, false);
  state = act(state,'permit');
  assert.equal(state.apples,before-2500);
  assert.equal(stallPrice(state),0);
  assert.equal(act(state,'placeMarket',{point:{x:3100,y:1470}}),state);
  state = act(state,'placeMarket',{point:stallSpot});
  assert.equal(state.trade.stalls.length,1);
  assert.equal(state.apples,before-2500);
  assert.ok(stallPrice(state) >= 1000);
});

test('the new riverside road connects the eastern junction to a southern customer entrance', () => {
  const road = TRADE_ROADS.at(-1);
  assert.ok(TRADE_ROADS[0].some(([x,y]) => x === road[0][0] && y === road[0][1]));
  for (const [index, [x,y]] of road.slice(1).entries()) {
    const [prevX,prevY] = road[index];
    for (let step = 0; step <= 10; step++) {
      const point = { x:prevX + (x-prevX)*step/10, y:prevY + (y-prevY)*step/10 };
      assert.equal(terrainKind(point),'road');
    }
  }
  assert.equal(terrainKind(TRADE_GATES.at(-1)),'road');
  assert.ok(riverDistance({ x:road[5][0], y:road[5][1] }) < 340);
  let state = withStall();
  state.trade.coins = 4000;
  state = act(state,'placeMarket',{point:{x:4210,y:3050}});
  assert.equal(state.trade.stalls.length,2);
  state = until(state,current => current.trade.stalls[1].customers.some(customer => customer.gate === TRADE_GATES.length - 1));
  const visitor = state.trade.stalls[1].customers.find(customer => customer.gate === TRADE_GATES.length - 1);
  assert.ok(visitor.route.points.every(point => terrainKind(point) === 'road'));
});

test('old forest plots relocate once, preserving planted trees, equipment and fruit in transit', () => {
  let state = withStall();
  const forest = state.orchards.find(item => item.id === FOREST_ORCHARD);
  const point = { x:FOREST_CLEARING.x + 240, y:FOREST_CLEARING.y + 355 };
  state = act(state,'plant',{point,variety:'forest'});
  state = act(state,'placeSprinkler',{point:{x:point.x+50,y:point.y-60},orchardId:forest.id});
  state = act(state,'assignOrchard',{id:state.workers[0].id,orchardId:forest.id});
  state = until(state,current => current.jobs.some(job => job.kind === 'pick' && job.phase === 'basket'));
  const workerSpot = { x:state.workers[0].x, y:state.workers[0].y };
  const expectedSprinkler = state.orchards.find(item => item.id === forest.id).sprinklers[0];
  const cargo = state.jobs[0].load;
  const old = structuredClone(state);
  old.mapVersion = 2;
  const oldForest = old.orchards.find(item => item.id === forest.id);
  for (const item of [oldForest.basket, ...oldForest.sprinklers, old.trees[0], old.workers[0]]) {
    item.x += 4860 - FOREST_CLEARING.x;
    item.y += 870 - FOREST_CLEARING.y;
  }
  const migrated = importGame(JSON.stringify(old));
  const migratedForest = migrated.orchards.find(item => item.id === forest.id);
  assert.deepEqual(migratedForest.basket,FOREST_BASKET);
  assert.deepEqual(migratedForest.sprinklers,[expectedSprinkler]);
  assert.deepEqual({x:migrated.workers[0].x,y:migrated.workers[0].y},workerSpot);
  assert.deepEqual({x:migrated.trees[0].x,y:migrated.trees[0].y},point);
  assert.equal(migrated.jobs[0].load,cargo);
  assert.deepEqual(importGame(JSON.stringify(migrated)),migrated);
  const delivered = until(migrated,current => current.apples > migrated.apples);
  assert.equal(delivered.apples - migrated.apples,54);
});

test('a saved berry farm overlapping the new clearing moves with its bushes and stock', () => {
  const old = withStall();
  old.trade.coins = 2000;
  old.trade.berryKnown = true;
  old.trade.marketUpgrades = 2;
  const center = {x:2550,y:3250};
  assert.equal(act(old,'placeFarm',{point:center}),old);
  const legacyFarm = farmSite(old,center,[]);
  assert.ok(legacyFarm);
  old.mapVersion = 2;
  old.trade.berryFarm = legacyFarm;
  old.orchards.push({ ...structuredClone(old.orchards[0]), id:'berry', basket:{x:legacyFarm.x+68,y:legacyFarm.y+legacyFarm.height-62}, fill:{red:0,gold:0,berry:3} });
  old.trees.push({ id:old.nextId++, x:center.x, y:center.y, orchardId:'berry', variety:'berry', readyAt:null, fruit:0 });
  const migrated = importGame(JSON.stringify(old));
  const farm = migrated.trade.berryFarm;
  const newCenter = {x:farm.x+farm.width/2,y:farm.y+farm.height/2};
  assert.notDeepEqual(newCenter,center);
  assert.ok(farmSite(migrated,newCenter,constructionPlots(migrated),true));
  assert.deepEqual({x:migrated.trees[0].x,y:migrated.trees[0].y},newCenter);
  assert.equal(migrated.orchards.at(-1).fill.berry,3);
  assert.equal(migrated.trade.coins,old.trade.coins);
});

test('a saved stall on the new road moves off the roadway with its stock and accepted order', () => {
  const old = until(withStall(),state => frontCustomer(state.trade.stalls[0]));
  old.mapVersion = 2;
  const stall = old.trade.stalls[0];
  const customer = frontCustomer(stall);
  customer.order.accepted = true;
  stall.stock.apples = 203;
  Object.assign(stall,{x:4227,y:1771});
  assert.equal(terrainKind(stall),'road');
  const migrated = importGame(JSON.stringify(old));
  const moved = migrated.trade.stalls[0];
  assert.equal(terrainKind(moved),'ground');
  assert.ok(marketSite(migrated,moved,constructionPlots(migrated),moved.id));
  assert.equal(moved.stock.apples,203);
  assert.deepEqual(frontCustomer(moved).order,customer.order);
  assert.equal(migrated.trade.coins,old.trade.coins);
});

test('customers enter from path endpoints and each accepted order pays once', () => {
  let state = withStall();
  assert.equal(advance(state, 13_999).trade.stalls[0].customers.length, 0);
  state = advance(state,14_000);
  const customer = state.trade.stalls[0].customers[0];
  assert.deepEqual(state.trade.visitorsSeen, []);
  assert.equal(customer.kind,'bobby');
  assert.equal(customer.order.apples,200);
  assert.equal(customer.order.coins,90);
  assert.equal(state.trade.stalls[0].spawnAt - state.time, 55_000);
  assert.deepEqual({x:customer.x,y:customer.y}, TRADE_GATES[customer.gate]);
  assert.ok(customer.route.points.every(point => terrainKind(point) === 'road'));
  state = until(state, current => frontCustomer(current.trade.stalls[0]));
  assert.deepEqual(state.trade.visitorsSeen, ['bobby']);
  const stall = state.trade.stalls[0];
  const action = { stallId:stall.id,customerId:customer.id };
  assert.equal(act(state,'fillOrder',action),state);
  state = fulfill(state);
  assert.equal(state.trade.coins,90);
  assert.equal(state.trade.sales,1);
  assert.deepEqual(state.trade.stalls[0].recentSales, [
    { id: customer.id, guest: 'bobby', items: [{ key: 'apples', quantity: 200 }], earned: 90 },
  ]);
  assert.equal(act(state,'fillOrder',action),state);
  assert.ok(state.trade.stalls[0].customers.filter(item => item.phase !== 'leave').length <= queueCapacity(stall));
  assert.deepEqual(importGame(JSON.stringify(state)),state);
  const old = structuredClone(state);
  delete old.trade.visitorsSeen;
  assert.deepEqual(importGame(JSON.stringify(old)).trade.visitorsSeen, ['bobby']);
  old.trade.stalls[0].spawnAt = old.time + 90_000;
  const migrated = importGame(JSON.stringify(old));
  assert.equal(migrated.trade.stalls[0].spawnAt, old.time + 55_000);
  const removed = act(state, 'removeMarket', { stallId: stall.id });
  assert.deepEqual(importGame(JSON.stringify(removed)).trade.visitorsSeen, ['bobby']);
});

test('supply jobs honor selected destination and reserves and preserve stock when a stall is removed', () => {
  let state = withStall();
  state.trade.coins = 4000;
  assert.ok(marketSite(state,secondSpot,orchardPlots(state)));
  state = act(state,'placeMarket',{point:secondSpot});
  const [first,second] = state.trade.stalls;
  const worker = state.workers[0];
  assert.equal(act(state, 'assignRole', { id: worker.id, role: 'restock' }), state);
  state = act(state,'assignStall',{id:worker.id,stallId:second.id});
  assert.equal(workerWorkplace(state.workers[0]), stallWorkplace(second.id));
  assert.equal(state.workers[0].workRole, 'restock');
  assert.equal(act(state, 'assignRole', { id: worker.id, role: 'haul' }), state);
  state = act(state,'setReserve',{stallId:second.id,amount:state.apples-15});
  state = until(state, current => current.jobs.some(job => job.kind === 'restock' && job.cargo));
  assert.equal(state.jobs.find(job => job.kind === 'restock').cargo.amount,15);
  assert.equal(state.trade.stalls[0].stock.apples,0);
  const moving = act(state,'placeMarket',{stallId:second.id,point:{x:secondSpot.x,y:secondSpot.y+16}});
  assert.equal(moving.trade.stalls[1].y,secondSpot.y+16);
  assert.equal(moving.trade.coins,state.trade.coins-80);
  assert.equal(moving.jobs.find(job => job.kind === 'restock').cargo.amount,15);
  state = importGame(JSON.stringify(moving));
  const spentBalance = state.apples;
  state = act(state,'removeMarket',{stallId:second.id});
  assert.equal(state.apples,spentBalance+15);
  assert.equal(state.workers[0].stallId,first.id);
  assert.equal(state.jobs.some(job => job.stallId === second.id),false);
});

test('accepting an apple order sends an available orchard hedgehog to supply it in trips', () => {
  let state = until(withStall(), current => frontCustomer(current.trade.stalls[0]));
  const stall = state.trade.stalls[0];
  const customer = frontCustomer(stall);
  const action = { stallId: stall.id, customerId: customer.id };
  assert.ok(customer.order.apples > 68);
  assert.equal(state.jobs.some(job => job.kind === 'restock'), false);
  state = act(state, 'acceptOrder', action);
  const apples = state.apples;

  state = until(state, current => current.jobs.some(job => job.commissionId === customer.id && job.cargo));
  const cargo = state.jobs.find(job => job.commissionId === customer.id).cargo.amount;
  assert.ok(cargo > 0 && cargo < customer.order.apples);
  assert.equal(state.trade.stalls[0].stock.apples, 0);
  assert.equal(state.apples, apples - cargo);
  state = importGame(JSON.stringify(state));
  state = until(state, current => current.trade.stalls[0].stock.apples === customer.order.apples);
  assert.equal(state.apples, apples - customer.order.apples);
  assert.equal(state.workers[0].workRole, 'auto');
  assert.equal(state.jobs.some(job => job.kind === 'restock'), false);
  assert.equal(act(state, 'fillOrder', action).trade.sales, 1);
});

test('a vendor serves automatically only after reaching the selected stall and handling the order', () => {
  let state = withStall();
  state = until(state, current => frontCustomer(current.trade.stalls[0]));
  const stallId = state.trade.stalls[0].id;
  state = act(state,'recruit');
  state = act(state,'assignStall',{id:state.workers[0].id,stallId});
  state = act(state,'assignRole',{id:state.workers[0].id,role:'vendor'});
  state = until(state,current => current.jobs.some(job => job.kind === 'vendor' && job.phase === 'serve'));
  assert.equal(state.trade.sales,0);
  state = until(state, current => frontCustomer(current.trade.stalls[0])?.order.accepted);
  assert.equal(state.trade.stalls[0].stock.apples, 0);
  assert.equal(state.trade.sales, 0);
  state = until(state,current => current.trade.sales > 0);
  assert.equal(state.trade.coins,90);
});

test('accepted mixed orders wait for both apples and berries to be brought from the house', () => {
  let state = until(withStall(), current => frontCustomer(current.trade.stalls[0]));
  const stall = state.trade.stalls[0];
  const customer = frontCustomer(stall);
  state.trade.berryKnown = true;
  state.trade.berries = 32;
  customer.order.berries = 20;
  const fields = { stallId: stall.id, customerId: customer.id };
  const originalApples = state.apples;
  state = act(state, 'acceptOrder', fields);
  assert.deepEqual(state.trade.stalls[0].stock, { apples:0, berries:0 });
  assert.equal(act(state, 'moveStock', { stallId:stall.id, key:'berries', amount:20 }), state);
  assert.equal(act(state, 'fillOrder', fields), state);
  state = until(state, current => canServe(current.trade.stalls[0], customer.order));
  assert.deepEqual(state.trade.stalls[0].stock, { apples:customer.order.apples, berries:20 });
  assert.equal(state.trade.berries, 12);
  assert.equal(state.apples, originalApples - customer.order.apples);
  assert.equal(act(state, 'fillOrder', fields).trade.sales, 1);
});

test('a real berry commission reveals wild sites, upgrades unlock the farm, and watering precedes harvest', () => {
  let state = withStall();
  assert.equal(state.trade.wild.length,0);
  state = advance(state, BERRY_OFFER_DELAY - 1);
  assert.ok(state.trade.stalls[0].customers.every(customer => customer.order.berries === 0));
  assert.equal(state.trade.berryKnown, false);
  state = until(state, current => frontCustomer(current.trade.stalls[0]));
  state = fulfill(state);
  state = until(state, current => frontCustomer(current.trade.stalls[0])?.order.berries);
  const commission = frontCustomer(state.trade.stalls[0]);
  assert.equal(commission.kind,'agatha');
  assert.equal(commission.order.berries,50);
  assert.equal(state.trade.berryKnown,false);
  assert.equal(state.trade.wild.length,0);
  const stallId = state.trade.stalls[0].id;
  state = act(state,'acceptOrder',{stallId,customerId:commission.id});
  assert.equal(state.guide.key,'wildBerries');
  assert.ok(state.trade.wild.length);
  const worker = state.workers[0];
  state = act(state,'assignWorkplace',{id:worker.id,place:FOREST_WORKPLACE});
  state = act(state,'assignRole',{id:worker.id,role:'forage'});
  state = until(state, current => current.trade.berries > 0);
  assert.ok(state.trade.berrySeeds > 0);
  const priorBalance = 2000;
  state.trade.coins = priorBalance;
  assert.equal(farmAvailable(state),false);
  state = act(state,'buyMarketUpgrade',{stallId,key:'shelves'});
  state = act(state,'buyMarketUpgrade',{stallId,key:'queue'});
  assert.equal(farmAvailable(state),true);
  assert.ok(farmSite(state,farmSpot,orchardPlots(state)));
  state.trade.coins = 999;
  assert.equal(act(state,'placeFarm',{point:farmSpot}),state);
  state.trade.coins = 1000;
  state = act(state,'placeFarm',{point:farmSpot});
  assert.equal(state.trade.coins,0);
  assert.equal(act(state, 'assignRole', { id: worker.id, role: 'water' }), state);
  const gardener = act(state, 'assignWorkplace', { id: worker.id, place: BERRY_ORCHARD });
  const watering = act(gardener, 'assignRole', { id: worker.id, role: 'water' });
  assert.equal(workerWorkplace(importGame(JSON.stringify(watering)).workers[0]), BERRY_ORCHARD);
  assert.equal(watering.workers[0].workRole, 'water');
  state = act(state,'plant',{point:farmSpot,variety:'berry'});
  assert.equal(state.trees[0].readyAt,null);
  state = advance(state,22000);
  assert.equal(state.trees[0].fruit,0);
  state = act(state,'refillCan');
  state = act(state,'waterPlant',{id:state.trees[0].id});
  assert.ok(state.trees[0].readyAt > state.time);
  state = advance(state,18000);
  assert.ok(state.trees[0].fruit > 0);
  state = act(state,'harvest',{id:state.trees[0].id});
  assert.equal(state.trees[0].readyAt,null);
  const moved = {x:4200,y:700};
  state.trade.coins = 160;
  const beforeMove = state.trade.coins;
  state = act(state,'placeFarm',{point:moved,moving:true});
  assert.equal(state.trade.coins,beforeMove-160);
  assert.equal(state.trees[0].x,moved.x);
  assert.equal(state.trees[0].y,moved.y);
  assert.ok(state.orchards.find(orchard => orchard.id === 'berry').fill.berry > 0);
  const restored = importGame(JSON.stringify(state));
  assert.deepEqual(restored,state);
});

test('a vendor accepts the first berry commission with no berries in stock', () => {
  let state = withStall();
  const stallId = state.trade.stalls[0].id;
  state = advance(state, BERRY_OFFER_DELAY);
  state = until(state, current => frontCustomer(current.trade.stalls[0])?.order.berries);
  const commission = frontCustomer(state.trade.stalls[0]);
  assert.equal(state.trade.berryKnown, false);
  assert.equal(state.trade.stalls[0].stock.berries, 0);
  state = act(state, 'assignStall', { id: state.workers[0].id, stallId });
  state = act(state, 'assignRole', { id: state.workers[0].id, role: 'vendor' });
  state = until(state, current => current.trade.berryKnown);
  assert.equal(frontCustomer(state.trade.stalls[0]).id, commission.id);
  assert.equal(frontCustomer(state.trade.stalls[0]).order.accepted, true);
  assert.equal(state.trade.sales, 0);
  assert.equal(state.trade.stalls[0].id, stallId);
  assert.ok(state.trade.wild.length);
  assert.equal(importGame(JSON.stringify(state)).trade.firstStallAt, 0);
});

test('0.3.1 storage migrates without shifting existing coordinates or changing apple balances', () => {
  const legacy = newGame(3);
  legacy.version = 3;
  legacy.apples = 5950;
  delete legacy.trade;
  delete legacy.forestSeeds;
  const current = loadGame({ getItem: key => key === 'itmo-apple-orchard-v3' ? JSON.stringify(legacy) : null });
  assert.equal(current.version,4);
  assert.equal(current.apples,5950);
  assert.deepEqual(current.orchards,legacy.orchards);
  assert.equal(current.trade.coins,0);
  assert.equal(current.trade.stalls.length,0);
  assert.ok(['bobby','agatha','lily'].every(key => CUSTOMERS[key].offers.length >= 6));
  assert.equal(CUSTOMERS.cookie.offers[0][0],1);
});

test('stall perks speed up service and average carrying perks increase a resupply load', () => {
  const state = withStall();
  const stall = state.trade.stalls[0];
  const worker = state.workers[0];
  const customer = {id:100,phase:'queue',order:{apples:126,accepted:true}};
  stall.customers.push(customer);
  Object.assign(worker,{x:stall.x,y:stall.y,perk:'steady'});
  worker.stats.handling = 5;
  const visit = {kind:'vendor',stallId:stall.id,customerId:customer.id};
  assert.equal(moveTradeJob(state,visit,worker,100,.1,HOUSE),false);
  assert.equal(visit.until - state.time,(11500-5*720)*.93);

  Object.assign(worker,HOUSE,{perk:'satchel'});
  worker.stats.strength = 5;
  const trip = {kind:'restock',stallId:stall.id,phase:'house',key:'apples'};
  assert.equal(moveTradeJob(state,trip,worker,100,.1,HOUSE),false);
  assert.deepEqual(trip.cargo,{key:'apples',amount:72});
});
