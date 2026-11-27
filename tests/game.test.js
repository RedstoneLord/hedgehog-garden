import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  act, advance, BALANCE, canMoveBasket, canPlaceSprinkler, canPlant, canSendBasket, flowerActive, flowerDetection, FOREST_WORKPLACE, groupCapacity, hirePrice,
  importGame, newGame, nextLevelXp, orchardBeds, PLOTS, potatoAvailable, productionRate, restoreGame, seedPrice, UPGRADES, upgradeStatus, visibleUpgrades, workerCharacteristics, workerWorkplace,
} from '../src/game.js';
import { OLD_MAP_OFFSET, terrainKind } from '../src/terrain.js';
import { basketLimit, DEFAULT_STATS, EAST_ORCHARD, fruitCount, GARDEN_RATES, HOUSE, SHOP, shopPrice, SPRINKLER_LIMIT, sprinklerPrice, VARIETIES } from '../src/orchard.js';
import { distance, findRoute } from '../src/routes.js';

const near = { x: 2211.75, y: 1558.625 };
const far = { x: 2600.25, y: 1353.375 };
const nextBasket = { x: 2362.5, y: 1637.1 };
const grow = (game, point) => act(game, 'plant', { point });
const reap = (game, tree = game.trees[0]) => act(game, 'harvest', { id: tree.id });
const tick = (game, duration) => {
  for (let elapsed = 0; elapsed < duration; elapsed += 100) game = advance(game, 100);
  return game;
};

function until(game, condition, maxTicks = 1500) {
  for (let i = 0; !condition(game) && i < maxTicks; i++) game = advance(game, 100);
  assert.ok(condition(game), 'expected condition in the simulated time');
  return game;
}

test('renaming a hedgehog persists without disturbing its assignment', () => {
  const initial = act({ ...newGame(7), apples: 100 }, 'unlock');
  const worker = initial.workers[0];
  const renamed = act(initial, 'renameWorker', { id: worker.id, name: '  Луне\u0308к  ' });
  assert.deepEqual(renamed.workers[0], { ...worker, name: 'Лунёк' });
  assert.equal(importGame(JSON.stringify(renamed)).workers[0].name, 'Лунёк');
  for (const name of ['', '  ', 'а'.repeat(25), 'Лу\nна']) {
    assert.equal(act(renamed, 'renameWorker', { id: worker.id, name }), renamed);
  }
  assert.equal(act(renamed, 'renameWorker', { id: -1, name: 'Лунь' }), renamed);
});

test('long trips approach the nearest usable road and short trips stay direct', () => {
  const from = { x: 3120, y: 1370 };
  const to = { x: 3510, y: 1470 };
  const { points } = findRoute(from, to);
  assert.equal(terrainKind(points[0]), 'road');
  assert.ok(distance(points[0], { x: 3096.009, y: 1455.682 }) < .01);
  assert.ok(points.slice(0, -1).every(point => terrainKind(point) === 'road'));
  assert.deepEqual(points.at(-1), to);

  const local = { x: 4000, y: 1425 };
  assert.deepEqual(findRoute({ x: 3900, y: 1420 }, local).points, [local]);
});

function growToMystery(game, target = BALANCE.mystery) {
  for (let attempt = 0; game.apples < target && attempt < 40; attempt++) {
    if (game.orchards[0].ready.length) game = advance(act(game, 'sendBasket'), 5000);
    else game = reap(advance(game, BALANCE.regrowth));
  }
  assert.ok(game.apples >= target);
  return game;
}

function start(seed = 123) {
  const planted = grow(newGame(seed), near);
  return act(growToMystery(reap(planted)), 'unlock');
}

function previousSave(game) {
  const { orchards, ...old } = structuredClone(game);
  old.version = 2;
  old.basket = orchards[0].basket;
  return old;
}

test('one starter sapling preserves continuous coordinates and requires room inside the garden', () => {
  const initial = newGame(13);
  assert.equal(initial.seeds, 1);
  assert.equal(initial.apples, 0);
  assert.equal(grow(initial, { x: 500, y: 500 }), initial);
  assert.equal(grow(initial, initial.orchards[0].basket), initial);
  const game = grow(initial, near);
  assert.equal(game.trees[0].x, near.x);
  assert.equal(game.trees[0].y, near.y);
  assert.equal(game.seeds, 0);
  assert.ok(!canPlant(game, { x: near.x + 12, y: near.y + 12 }));
  assert.ok(!canMoveBasket(game, near));
  assert.equal(act(game, 'moveBasket', { point: nextBasket }).orchards[0].basket.x, nextBasket.x);
});

test('manual collection buys the mystery once, Potato guides from the interface and sends exactly one worker', () => {
  let game = reap(grow(newGame(23), near));
  assert.equal(game.apples, 0);
  assert.equal(game.orchards[0].fill.red, 5);
  assert.equal(act(game, 'sendBasket'), game);
  assert.equal(reap(game), game);
  assert.equal(act(game, 'unlock'), game);
  game = growToMystery(game);
  assert.equal(game.apples, 100);
  assert.equal(game.level, 6);
  assert.equal(game.xp, 5);
  assert.equal(game.xpProgress, 2);
  game = act(game, 'unlock');
  assert.ok(game.unlocked);
  assert.equal(game.apples, 0);
  assert.equal(game.guide.key, 'intro');
  assert.equal(game.workers.length, 1);
  assert.notEqual(game.workers[0].name, 'Картошка');
  assert.equal(groupCapacity(game), 1);
  assert.deepEqual(game.favorites, []);
  assert.equal(act(game, 'unlock'), game);
  assert.equal(act(game, 'favorite', { id: 'potato' }), game);
  assert.equal(act(game, 'help').guide.key, 'help');
});

test('paid helpers grow exponentially, stay unique and keep randomized appearance on reload', () => {
  let game = { ...start(), apples: 100000 };
  const friend = game.workers[0];
  const prices = [];
  assert.equal(hirePrice(game), 150);
  for (let index = 0; index < 8; index++) {
    const cost = hirePrice(game);
    const apples = game.apples;
    game = act(game, 'recruit');
    assert.equal(game.apples, apples - cost);
    prices.push(cost);
  }
  assert.deepEqual(prices, [150, 174, 202, 235, 272, 316, 366, 424]);
  assert.ok(new Set(game.workers.map(worker => worker.name)).size === game.workers.length);
  assert.ok(new Set(game.workers.map(worker => `${worker.quills}:${worker.skin}:${worker.pose}`)).size > 3);
  assert.ok(game.workers.every(worker => Object.values(worker.stats).length === 6 && Object.values(worker.stats).every(stat => stat >= 1 && stat <= 9)));
  assert.deepEqual(game.workers[0], friend);
  assert.deepEqual(restoreGame(JSON.stringify(game)), game);
});

test('perks, hats, unusual colors, and unusual names are independently rare', () => {
  const rarity = { hat: 0, quills: 0, skin: 0, name: 0, perk: 0 };
  const uncommon = new Set(['Луномох', 'Плюмберри', 'Ёжимир', 'Травосвет', 'Семёрка', 'Росинант', 'Пыльцебор', 'Снежегрив']);
  let visiblyDistinct = 0;
  for (let index = 1; index <= 1200; index++) {
    const state = act({ ...newGame(Math.imul(index, 2654435761)), apples: BALANCE.mystery }, 'unlock');
    const worker = state.workers[0];
    rarity.hat += Number(Boolean(worker.hat));
    rarity.quills += Number(worker.quills >= 5);
    rarity.skin += Number(worker.skin >= 5);
    rarity.name += Number(uncommon.has(worker.name));
    rarity.perk += Number(Boolean(worker.perk));
    visiblyDistinct += Number(worker.hat && worker.skin < 5 && worker.quills < 5);
  }
  assert.ok(visiblyDistinct > 0);
  for (const [name, count] of Object.entries(rarity)) assert.ok(count >= 22 && count <= 103, `${name}: ${count}/1200`);
});

test('a picker follows the relocated basket, and the player receives nothing at the orchard', () => {
  let state = start();
  state = until(state, game => game.jobs[0]?.phase === 'basket');
  const apples = state.apples;
  const basket = state.orchards[0].basket;
  assert.ok(findRoute(basket, far).cost > findRoute(basket, near).cost);
  state = act(state, 'moveBasket', { point: nextBasket });
  state = until(state, game => fruitCount(game.orchards[0].fill) > 0);
  assert.equal(state.workers[0].x, nextBasket.x);
  assert.equal(state.workers[0].y, nextBasket.y);
  assert.equal(state.apples, apples);
  assert.equal(productionRate(state), 0);
  state = until(state, game => game.apples > apples);
  assert.equal(state.apples - apples, basketLimit(state.orchards[0]));
  assert.ok(productionRate(state) > 0);
  assert.equal(workerCharacteristics(state, state.workers[0]).trips, 1);
});

test('XP is spent in the upgrade tree, branches have requirements and selection starts with one slot', () => {
  let game = act({ ...start(), apples: 100000, xp: 100 }, 'recruit');
  const [a,b] = game.workers;
  game = act(game, 'favorite', { id: a.id });
  assert.equal(act(game, 'favorite', { id: b.id }), game);
  assert.equal(act(game, 'upgrade', { id: 'plot2' }), game);
  game = act(game, 'upgrade', { id: 'plot1' });
  assert.equal(game.xp, 100 - UPGRADES.plot1.cost);
  assert.ok(canPlant(game, { x: 2035, y: 1297 }));
  assert.equal(game.trees[0].x, near.x);
  game = act(game, 'upgrade', { id: 'group1' });
  game = act(game, 'favorite', { id: b.id });
  assert.deepEqual(game.favorites, [a.id, b.id]);
  assert.equal(groupCapacity(game), 2);
});

test('one flower grows outside the garden and takes 90–150 seconds to return', () => {
  let game = start(9167);
  const { x, y, width, height } = PLOTS.at(-1);
  assert.equal(game.flowers.length, 1);
  assert.ok(game.flowers.every(flower => flower.x < x || flower.x > x + width || flower.y < y || flower.y > y + height));
  const id = game.flowers[0].id;
  game = act(game, 'flower', { id });
  assert.ok(flowerActive(game));
  assert.equal(game.flowers.length, 0);
  assert.equal(act(game, 'flower', { id }), game);
  const delay = game.flowerAt - game.time;
  assert.ok(delay >= BALANCE.flowerCooldown && delay < BALANCE.flowerCooldown + BALANCE.flowerJitter);
  game = tick(game, BALANCE.flowerDuration);
  assert.equal(flowerActive(game), false);
  game = advance(game, delay - BALANCE.flowerDuration - 1);
  assert.equal(game.flowers.length, 0);
  game = advance(game, 1);
  assert.equal(game.flowers.length, 1);
  assert.notEqual(game.flowers[0].id, id);
  assert.equal(tick(game, 500).flowers.length, 1);
});

test('new upgrades change regrowth, crop, carry and the flower duration', () => {
  let game = { ...start(), xp: 200 };
  const originalReady = game.trees[0].readyAt;
  const originalCarry = workerCharacteristics(game, game.workers[0]).carry;
  assert.equal(upgradeStatus(game, 'roots'), 'locked');
  game = act(game, 'upgrade', { id: 'plot1' });
  assert.equal(upgradeStatus(game, 'roots'), 'ready');
  game = act(game, 'upgrade', { id: 'roots' });
  assert.equal(game.trees[0].readyAt, game.time + Math.max(0, originalReady - game.time) * .75);
  game = act(game, 'upgrade', { id: 'crop' });
  game = advance(game, BALANCE.regrowth * .75);
  assert.equal(game.trees[0].fruit, BALANCE.crop + 2);
  game = act(game, 'upgrade', { id: 'pace' });
  game = act(game, 'upgrade', { id: 'carry' });
  assert.equal(workerCharacteristics(game, game.workers[0]).carry, originalCarry + 1);
  assert.ok(workerCharacteristics(game, game.workers[0]).speed > 0);
  game = act(game, 'upgrade', { id: 'flower' });
  game = act(game, 'flower', { id: game.flowers[0].id });
  assert.equal(game.boostUntil - game.time, BALANCE.flowerDuration + 10000);
});

test('new tree upgrades branch from their prerequisites and apply their bonuses', () => {
  const base = { ...start(), xp: 900 };
  const worker = base.workers[0];
  const initial = workerCharacteristics(base, worker);
  assert.equal(visibleUpgrades(base).includes('group3'), false);
  const branches = ['plot1', 'clearing', 'roots', 'crop', 'group1', 'group2', 'naps', 'flower', 'keenScent', 'pace', 'carry', 'pantry'];
  const state = branches.reduce((game, id) => act(game, 'upgrade', { id }), base);
  const additions = ['grafting', 'seedSatchel', 'group3', 'longShift', 'flowerPower', 'quickPacking', 'tradeCrates'];
  assert.ok(additions.every(id => visibleUpgrades(state).includes(id)));
  const upgraded = additions.reduce((game, id) => act(game, 'upgrade', { id }), state);
  const trained = workerCharacteristics(upgraded, upgraded.workers[0]);
  assert.equal(groupCapacity(upgraded), 4);
  assert.equal(seedPrice(upgraded), Math.ceil(seedPrice(state) * .8));
  assert.equal(trained.maxStamina, initial.maxStamina + 14);
  assert.equal(trained.stamina, initial.stamina + 14);
  assert.equal(trained.detection, initial.detection + 45);
  const boosted = act(upgraded, 'flower', { id: upgraded.flowers[0].id });
  assert.ok(Math.abs(workerCharacteristics(boosted, boosted.workers[0]).speed / trained.speed - 1.7) < .0001);
  assert.equal(upgraded.xp, base.xp - [...branches, ...additions].reduce((total, id) => total + UPGRADES[id].cost, 0));
});

test('collaboration does not repeat the dialogue on the next trip', () => {
  let game = { ...start(), apples: 100000, seeds: 1, trees: [], jobs: [] };
  game = grow(game, far);
  game = act(game, 'recruit');
  game = advance(game, 100);
  assert.equal(game.jobs[0].workers.length, 2);
  assert.equal(game.quote.lines.length, 2);
  const firstTalk = game.lastTalk;
  game = tick(game, 10000);
  assert.equal(game.quote, null);
  assert.equal(game.lastTalk, firstTalk);
  game = tick(game, 6000);
  assert.equal(game.lastTalk, firstTalk);
  assert.ok(game.jobs.some(job => job.workers.length === 2));
});

test('a 0.1.0 save keeps planted trees and progress when migrated', () => {
  const migrated = restoreGame(null, JSON.stringify({ version: 1, apples: 31, xp: 42, expanded: true, capacity: 3,
    seeds: { red: 2, gold: 0 }, trees: [{ x: 1, y: 1, fruit: 3 }], hedgehogs: [{ id: 'potato' }, { id: 'maple' }], favorites: ['potato','maple'] }));
  assert.equal(migrated.trees.length, 1);
  assert.equal(migrated.apples, 31);
  assert.equal(migrated.xp, 42);
  assert.equal(migrated.seeds, 2);
  assert.equal(migrated.workers.length, 2);
  assert.deepEqual(migrated.upgrades, ['plot1','plot2','group1']);
});

test('0.2.0 saves keep unlocked helpers and clamp existing flowers to one', () => {
  const old = previousSave(start());
  delete old.xpProgress;
  delete old.level;
  old.flowers.push({ ...old.flowers[0], id: 99 });
  old.workers[0].perk = 'bloom';
  delete old.workers[0].trips;
  const game = restoreGame(JSON.stringify(old));
  assert.equal(game.apples, old.apples);
  assert.equal(game.xp, old.xp);
  assert.equal(game.xpProgress, 0);
  assert.equal(game.level, old.xp + 1);
  assert.equal(game.unlocked, true);
  assert.equal(game.workers[0].perk, 'bloom');
  assert.equal(workerCharacteristics(game, game.workers[0]).trips, 0);
  assert.equal(game.flowers.length, 1);
});


test('the road and river block planting inside the enlarged orchard', () => {
  const game = { ...newGame(44), upgrades: ['plot1'] };
  const road = { x: 2420, y: 1528 };
  const river = { x: 2655, y: 1570 };
  assert.equal(terrainKind(road), 'road');
  assert.equal(terrainKind(river), 'river');
  assert.equal(grow(game, road), game);
  assert.equal(grow(game, river), game);
  assert.ok(canPlant(game, near));
});

test('seed prices increase with each purchase and survive a reload', () => {
  let game = { ...newGame(1), apples: 100 };
  for (const price of [5, 7, 10, 13]) {
    assert.equal(seedPrice(game), price);
    const amount = game.apples;
    game = act(game, 'buySeed');
    assert.equal(game.apples, amount - price);
  }
  assert.equal(game.seeds, 5);
  assert.equal(seedPrice(restoreGame(JSON.stringify(game))), seedPrice(game));
  const poor = { ...game, apples: seedPrice(game) - 1 };
  assert.equal(act(poor, 'buySeed'), poor);
});

test('tree, orchard basket, and house signals occur at distinct stages', () => {
  let game = reap(grow(newGame(31), near));
  assert.equal(game.trees[0].pulse.at, game.time);
  assert.equal(game.orchards[0].pulse.amount, BALANCE.crop);
  assert.equal(game.basketReceipt, null);
  const manualId = game.trees[0].pulse.id;
  game = act({ ...game, apples: 100 }, 'unlock');
  game = until(game, state => state.jobs[0]?.phase === 'basket');
  assert.ok(game.trees[0].pulse.id > manualId);
  assert.equal(game.trees[0].pulse.at, game.time);
  assert.equal(game.basketReceipt, null);
  game = until(game, state => Boolean(state.basketReceipt));
  assert.equal(game.basketReceipt.amount, 10);
  assert.equal(game.apples, 10);
});

test('migration from the 0.2.1 map preserves relative positions and reconstructs paid seed purchases', () => {
  const old = previousSave(start());
  delete old.mapVersion;
  delete old.seedPurchases;
  old.seeds = 2;
  for (const item of [old.basket, ...old.trees, ...old.workers]) {
    item.x -= OLD_MAP_OFFSET.x;
    item.y -= OLD_MAP_OFFSET.y;
  }
  old.flowers = [];
  const game = restoreGame(JSON.stringify(old));
  assert.equal(game.seedPurchases, 2);
  assert.equal(game.trees[0].x, near.x);
  assert.equal(game.trees[0].y, near.y);
  assert.equal(game.orchards[0].basket.x, old.basket.x + OLD_MAP_OFFSET.x);
  assert.equal(game.workers[0].y, old.workers[0].y + OLD_MAP_OFFSET.y);
  assert.equal(game.flowers.length, 1);
  assert.deepEqual(restoreGame(JSON.stringify(game)), game);
});


test('experience requirements rise, carry over, and leave attained levels intact when points are spent', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(nextLevelXp), [16, 18, 20, 21, 23]);
  let game = reap(grow(newGame(21), near));
  game = growToMystery(game, 40);
  assert.equal(game.level, 3);
  assert.equal(game.xp, 2);
  assert.equal(game.xpProgress, 6);
  const existing = { ...game, unlocked: true, xp: 12 };
  const upgraded = act(existing, 'upgrade', { id: 'plot1' });
  assert.equal(upgraded.level, existing.level);
  assert.equal(upgraded.xpProgress, existing.xpProgress);
  assert.equal(upgraded.xp, existing.xp - UPGRADES.plot1.cost);
});

test('the mystery needs funds while tree nodes appear as soon as their parent is unlocked', () => {
  const initial = { ...newGame(44), xp: 30, apples: 99 };
  assert.equal(potatoAvailable(initial), false);
  assert.deepEqual(visibleUpgrades(initial), []);
  const ripe = { ...initial, apples: 100 };
  assert.equal(potatoAvailable(ripe), true);
  let game = act(ripe, 'unlock');
  assert.equal(potatoAvailable(game), false);
  assert.deepEqual(visibleUpgrades(game), ['plot1', 'group1', 'pace', 'flower']);
  game = act(game, 'upgrade', { id: 'plot1' });
  assert.deepEqual(visibleUpgrades(game), ['plot1', 'plot2', 'roots', 'clearing', 'group1', 'pace', 'flower']);
  const noPoints = { ...game, xp: 0 };
  assert.deepEqual(visibleUpgrades(noPoints), ['plot1', 'plot2', 'roots', 'clearing', 'group1', 'pace', 'flower']);
  assert.equal(upgradeStatus(noPoints, 'roots'), 'pending');
  assert.equal(act(noPoints, 'upgrade', { id: 'roots' }), noPoints);
  assert.equal(upgradeStatus(noPoints, 'crop'), 'locked');
});

test('legacy levels recover previously spent and unspent improvement points', () => {
  const game = { ...start(), xp: 4, upgrades: ['plot1'], xpProgress: 9 };
  delete game.level;
  const restored = restoreGame(JSON.stringify(game));
  assert.equal(restored.level, 15);
  assert.equal(restored.xp, 4);
  assert.equal(restored.xpProgress, 9);
  assert.deepEqual(restoreGame(JSON.stringify(restored)), restored);
});

test('the bridge forms a continuous road between the riverbanks', () => {
  const west = { x: 2620, y: 1498 };
  const east = { x: 2796, y: 1454 };
  for (let step = 0; step <= 40; step++) {
    const fraction = step / 40;
    assert.equal(terrainKind({ x: west.x + (east.x - west.x) * fraction, y: west.y + (east.y - west.y) * fraction }), 'road');
  }
  assert.equal(terrainKind({ x: 2730, y: 1420 }), 'river');
  assert.equal(terrainKind({ x: 2679, y: 1550 }), 'river');
  const garden = { ...newGame(18), upgrades: ['plot1'] };
  assert.equal(canPlant(garden, { x: 2707, y: 1479 }), false);
});

test('a hand-sent full basket crosses the bridge, and the next one can fill while it travels', () => {
  let game = reap(grow(newGame(17), near));
  game = reap(advance(game, BALANCE.regrowth));
  assert.equal(game.orchards[0].ready.length, 1);
  game = act(game, 'sendBasket');
  assert.equal(game.apples, 0);
  const firstJob = game.jobs[0];
  assert.equal(firstJob.kind, 'manual');
  assert.equal(game.orchards[0].ready.length, 0);
  assert.equal(act(game, 'sendBasket'), game);
  const path = findRoute(game.orchards[0].basket, HOUSE).points;
  let previous = game.orchards[0].basket;
  let crossedOnRoad = false;
  for (const point of path) {
    const segments = Math.ceil(distance(previous, point) / 2);
    for (let step = 0; step <= segments; step++) {
      const t = step / Math.max(1, segments);
      const x = previous.x + (point.x - previous.x) * t;
      const y = previous.y + (point.y - previous.y) * t;
      const terrain = terrainKind({ x, y });
      assert.notEqual(terrain, 'river');
      if (Math.abs(x - 2707) < 3 && Math.abs(y - 1479) < 25) crossedOnRoad = terrain === 'road';
    }
    previous = point;
  }
  assert.ok(crossedOnRoad);
  game = until(game, next => next.apples === 10);
  assert.equal(game.jobs.length, 0);
});

test('two helpers can pick and haul concurrently, and a reloaded and reassigned courier pays once', () => {
  let game = act({ ...grow(newGame(59), near), apples: 1300 }, 'unlock');
  game = act(game, 'recruit');
  game = act(game, 'shopUpgrade', { id: 'secondPlot' });
  game.orchards[0].ready.push({ red: 10, gold: 0 });
  const balance = game.apples;
  game = until(game, state => state.jobs.some(job => job.kind === 'delivery' && job.phase === 'haul') && fruitCount(state.orchards[0].fill));
  const delivery = game.jobs.find(job => job.kind === 'delivery');
  assert.equal(game.apples, balance);
  const courier = delivery.workers[0];
  const jobId = delivery.id;
  game = restoreGame(JSON.stringify(game));
  game = act(game, 'assignOrchard', { id: courier, orchardId: EAST_ORCHARD });
  game = until(game, state => state.jobs.find(job => job.id === jobId)?.phase === 'return');
  assert.equal(game.apples, balance + 10);
  game = restoreGame(JSON.stringify(game));
  game = until(game, state => !state.jobs.some(job => job.id === jobId));
  const worker = game.workers.find(item => item.id === courier);
  assert.equal(worker.orchardId, EAST_ORCHARD);
  assert.equal(worker.x, game.orchards[1].basket.x);
  assert.equal(worker.trips, 1);
});

test('the east orchard and repeatable projects are paid for separately with apples', () => {
  let game = act({ ...grow(newGame(62), near), apples: 2000 }, 'unlock');
  const eastTree = { x: 3210, y: 1620 };
  assert.equal(grow(game, eastTree), game);
  const cost = game.apples;
  game = act(game, 'shopUpgrade', { id: 'secondPlot' });
  assert.equal(game.apples, cost - SHOP.secondPlot.base);
  assert.equal(act(game, 'shopUpgrade', { id: 'secondPlot' }), game);
  game = grow(act(game, 'buySeed'), eastTree);
  assert.equal(game.trees[1].orchardId, EAST_ORCHARD);
  game = reap(game, game.trees[1]);
  const before = game.trees[1].readyAt;
  const west = game.orchards[0];
  const apples = game.apples;
  game = act(game, 'placeSprinkler', { point: { x: 3270, y: 1650 }, orchardId: EAST_ORCHARD });
  game = act(game, 'shopUpgrade', { id: 'sprinkler', orchardId: EAST_ORCHARD });
  assert.equal(game.apples, apples - shopPrice('sprinkler', 0) - shopPrice('sprinkler', 1));
  assert.equal(game.orchards[1].irrigationLevel, 2);
  assert.equal(game.orchards[0].irrigationLevel, west.irrigationLevel);
  assert.ok(game.trees[1].readyAt < before);
  for (let n = 0; n < 3; n++) game = act(game, 'shopUpgrade', { id: 'basket', orchardId: EAST_ORCHARD });
  assert.equal(basketLimit(game.orchards[1]), 22);
  assert.equal(basketLimit(game.orchards[0]), 10);
  assert.equal(act(game, 'shopUpgrade', { id: 'basket', orchardId: EAST_ORCHARD }), game);
});

test('the first east delivery discovers the amber variety and amber fruit earns double at the house', () => {
  let game = act({ ...newGame(29), apples: 2000 }, 'unlock');
  game = act(game, 'shopUpgrade', { id: 'secondPlot' });
  game = act(game, 'recruit', { orchardId: EAST_ORCHARD });
  const east = game.orchards[1];
  east.ready.push({ red: 10, gold: 0 });
  const apples = game.apples;
  game = until(game, state => state.eastDelivered);
  assert.equal(game.apples, apples + 10);
  assert.ok(game.goldDiscovered);
  assert.equal(game.goldSeeds, 1);
  game = act(game, 'plant', { point: { x: 3220, y: 1650 }, variety: 'gold' });
  assert.equal(game.trees[0].fruit, VARIETIES.gold.yield);
  assert.equal(game.goldSeeds, 0);
  game.orchards[1].ready.push({ red: 6, gold: 4 });
  game = until(game, state => state.apples >= apples + 24);
  assert.equal(game.apples, apples + 24);
});

test('endurance controls stamina and a tired hedgehog rests between jobs', () => {
  let game = act({ ...grow(newGame(65), near), apples: 100 }, 'unlock');
  const worker = game.workers[0];
  worker.stats.endurance = 1;
  worker.stamina = .1;
  const low = workerCharacteristics(game, worker).maxStamina;
  const high = workerCharacteristics(game, { ...worker, stats: { ...worker.stats, endurance: 9 } }).maxStamina;
  assert.ok(high > low);
  game = until(game, state => state.workers[0].sleepUntil !== null);
  const wake = game.workers[0].sleepUntil;
  assert.equal(game.workers[0].stamina, 0);
  game = until(game, state => state.time >= wake);
  assert.equal(game.workers[0].sleepUntil, null);
  assert.equal(game.workers[0].stamina, low);
});

test('the 0.2.2 migration preserves banked apples and puts old carried apples in the orchard', () => {
  const old = previousSave({ ...start(71), apples: 250 });
  old.jobs = [{ load: 8 }, { load: 7 }];
  delete old.workers[0].stats;
  const game = restoreGame(JSON.stringify(old));
  assert.equal(game.apples, old.apples);
  assert.deepEqual(game.workers[0].stats, DEFAULT_STATS);
  assert.equal(game.orchards[0].ready[0].red, 10);
  assert.equal(game.orchards[0].fill.red, 5);
  assert.deepEqual(restoreGame(JSON.stringify(game)), game);
});

test('hand picking respects basket space reserved by a returning hedgehog', () => {
  let game = act({ ...grow(newGame(92), near), apples: 100 }, 'unlock');
  game.orchards[0].fill.red = 9;
  game = until(game, state => state.jobs.some(job => job.kind === 'pick' && job.phase === 'basket'));
  assert.equal(game.jobs[0].load, 1);
  assert.ok(game.trees[0].fruit > 0);
  assert.equal(reap(game), game);
  game = until(game, state => state.jobs.some(job => job.kind === 'delivery' && job.phase === 'haul'));
  assert.equal(game.jobs.find(job => job.kind === 'delivery').cargo.red, 10);
  assert.equal(game.apples, 0);
});

test('a full orchard basket cannot overfill, and a second send waits for the first delivery', () => {
  let game = grow(grow({ ...newGame(92), seeds: 2 }, near), far);
  game = reap(reap(game), game.trees[1]);
  const [first, second] = game.trees.map(tree => tree.id);
  assert.deepEqual(game.orchards[0].ready, [{ red: 10, gold: 0 }]);
  game = advance(game, BALANCE.regrowth);
  assert.equal(act(game, 'harvest', { id: first }), game);
  assert.equal(act(game, 'harvest', { id: second }), game);
  assert.equal(fruitCount(game.orchards[0].fill), 0);
  game = act(game, 'sendBasket');
  game = act(act(game, 'harvest', { id: first }), 'harvest', { id: second });
  assert.equal(game.orchards[0].ready.length, 1);
  assert.equal(fruitCount(game.orchards[0].ready[0]), 10);
  assert.equal(canSendBasket(game, game.orchards[0]), false);
  assert.equal(act(game, 'sendBasket'), game);
  game = restoreGame(JSON.stringify(game));
  assert.equal(act(game, 'sendBasket'), game);
  game = until(game, state => state.apples === 10);
  assert.equal(canSendBasket(game, game.orchards[0]), true);
  game = until(act(game, 'sendBasket'), state => state.apples === 20);
  assert.equal(game.jobs.length, 0);
});

test('a reserved courier leaves the full basket in place until loading finishes', () => {
  let game = act({ ...grow(newGame(71), near), apples: 100 }, 'unlock');
  const tree = game.trees[0].id;
  game.orchards[0].ready.push({ red: 10, gold: 0 });
  game = until(game, state => state.jobs.some(job => job.phase === 'load'));
  assert.equal(act(game, 'sendBasket'), game);
  assert.equal(act(game, 'harvest', { id: tree }), game);
  assert.equal(game.orchards[0].ready.length, 1);
  assert.equal(game.jobs[0].cargo, null);
  game = until(game, state => state.jobs.some(job => job.phase === 'haul'));
  assert.equal(game.orchards[0].ready.length, 0);
  game = act(game, 'harvest', { id: tree });
  assert.equal(fruitCount(game.orchards[0].fill), 5);
  assert.equal(game.apples, 0);
});

test('manual dispatch after hiring takes over an approaching courier without double delivery', () => {
  let game = act({ ...newGame(71), apples: 100 }, 'unlock');
  game.workers[0].x += 60;
  game.orchards[0].ready.push({ red: 10, gold: 0 });
  game = advance(game, 100);
  assert.equal(game.jobs[0].phase, 'toBasket');
  game = act(game, 'sendBasket');
  assert.deepEqual(game.jobs.map(job => job.kind), ['manual']);
  assert.equal(game.orchards[0].ready.length, 0);
  game = until(importGame(JSON.stringify(game)), state => state.apples === 10);
  assert.equal(tick(game, 5000).apples, 10);
});

test('late level rewards grow more slowly and preserve points already earned', () => {
  const game = grow(newGame(71), near);
  game.level = 100;
  game.xp = 7_000;
  game.xpProgress = nextLevelXp(game.level);
  const advanced = advance(game, 100);
  assert.equal(advanced.level, 101);
  assert.equal(advanced.xp, 7_005);
  assert.deepEqual(importGame(JSON.stringify(advanced)), advanced);
});

test('sprinklers can coexist, and moving a specific sprinkler is free', () => {
  let game = act({ ...newGame(44), apples: 1500 }, 'unlock');
  game = act(game, 'shopUpgrade', { id: 'secondPlot' });
  game.seeds = 2;
  game = grow(grow(game, { x: 3210, y: 1620 }), { x: 3510, y: 1790 });
  game = reap(reap(game), game.trees[1]);
  const first = { x: 3270, y: 1650 };
  const second = { x: 3510, y: 1850 };
  const apples = game.apples;
  assert.equal(act(game, 'placeSprinkler', { point: game.trees[0], orchardId: EAST_ORCHARD }), game);
  assert.equal(canPlaceSprinkler(game, first, EAST_ORCHARD), true);
  game = act(game, 'placeSprinkler', { point: first, orchardId: EAST_ORCHARD });
  assert.equal(game.apples, apples - shopPrice('sprinkler', 0));
  const sprinkler = game.orchards[1].sprinklers[0];
  assert.deepEqual(sprinkler, { ...first, id: sprinkler.id });
  assert.ok(game.trees[0].readyAt < BALANCE.regrowth);
  assert.equal(game.trees[1].readyAt, BALANCE.regrowth);
  assert.equal(canPlaceSprinkler(game, first, EAST_ORCHARD), false);
  const paid = game.apples - sprinklerPrice(game.orchards[1]);
  game = act(game, 'placeSprinkler', { point: second, orchardId: EAST_ORCHARD });
  assert.equal(game.apples, paid);
  assert.equal(game.orchards[1].sprinklers.length, 2);
  assert.deepEqual(game.orchards[1].sprinklers[0], sprinkler);
  const easternRipening = game.trees[1].readyAt;
  assert.ok(easternRipening < BALANCE.regrowth);
  game = act(game, 'placeSprinkler', { point: { x: 3420, y: 1850 }, orchardId: EAST_ORCHARD, sprinklerId: sprinkler.id });
  assert.equal(game.apples, paid);
  assert.equal(game.orchards[1].sprinklers[0].x, 3420);
  assert.ok(Math.abs(game.trees[0].readyAt - BALANCE.regrowth) < 1e-6);
  assert.equal(game.trees[1].readyAt, easternRipening);
  assert.deepEqual(restoreGame(JSON.stringify(game)), game);
});

test('assigned haulers carry full baskets and assigned collectors pick, even when assigned mid-job', () => {
  let game = act({ ...grow(newGame(54), near), apples: 800 }, 'unlock');
  game = act(game, 'recruit');
  const [picker, courier] = game.workers;
  game = act(game, 'assignRole', { id: picker.id, role: 'collect' });
  game = act(game, 'assignRole', { id: courier.id, role: 'haul' });
  assert.equal(act(game, 'assignRole', { id: picker.id, role: 'invalid' }), game);
  game.orchards[0].ready.push({ red: 10, gold: 0 });
  game = until(game, state => state.jobs.some(job => job.kind === 'delivery' && job.phase === 'haul') && state.jobs.some(job => job.kind === 'pick'));
  const delivery = game.jobs.find(job => job.kind === 'delivery');
  assert.deepEqual(delivery.workers, [courier.id]);
  assert.deepEqual(game.jobs.find(job => job.kind === 'pick').workers, [picker.id]);
  const before = game.apples;
  game = act(game, 'assignRole', { id: courier.id, role: 'collect' });
  assert.equal(game.jobs.find(job => job.id === delivery.id).phase, 'haul');
  game = until(restoreGame(JSON.stringify(game)), state => state.apples > before);
  assert.equal(game.apples, before + 10);
  assert.ok(game.workers.every(worker => worker.workRole === 'collect'));
});

test('old 0.3.0 saves retain carried fruit, sprinkler upgrades, and working helpers', () => {
  const old = start(17);
  const worker = old.workers[0];
  delete old.basketCapacityVersion;
  delete old.orchards[0].sprinklers;
  delete worker.workRole;
  old.orchards[0].sprinkler = 2;
  old.orchards[0].ready.push({ red: 10, gold: 0 });
  old.orchards[0].fill.red = 9;
  old.jobs = [{ id: 222, kind: 'pick', phase: 'basket', orchardId: 'west', workers: [worker.id], variety: 'red', load: 3 }];
  let game = restoreGame(JSON.stringify(old));
  assert.equal(game.orchards[0].irrigationLevel, 2);
  assert.equal(game.orchards[0].sprinklers.length, 1);
  assert.equal(game.workers[0].workRole, 'auto');
  assert.equal(game.jobs.length, 0);
  assert.equal(game.orchards[0].ready.length, 2);
  assert.equal(fruitCount(game.orchards[0].fill), 2);
  const balance = game.apples;
  game = until(game, state => state.apples === balance + 20);
  assert.ok(game.workers[0].trips >= 2);
});

test('workers map-assign only to opened plots and local upgrades specialize their crops', () => {
  let game = act({ ...newGame(57), apples: 2000 }, 'unlock');
  const worker = game.workers[0].id;
  const eastTree = { x: 3210, y: 1620 };
  assert.equal(act(game, 'assignOrchard', { id: worker, point: eastTree }), game);
  game = act(game, 'shopUpgrade', { id: 'secondPlot' });
  assert.equal(act(game, 'assignOrchard', { id: worker, point: { x: 500, y: 500 } }), game);
  game = act(game, 'assignOrchard', { id: worker, point: eastTree });
  assert.equal(game.workers[0].orchardId, EAST_ORCHARD);
  assert.equal(act(game, 'shopUpgrade', { id: 'rootstock', orchardId: EAST_ORCHARD }), game);
  game = act(game, 'shopUpgrade', { id: 'rootstock' });
  game = act(game, 'shopUpgrade', { id: 'compost' });
  game = grow(game, near);
  assert.equal(game.trees[0].fruit, VARIETIES.red.yield + 3);
  game.goldSeeds = 1;
  game = act(game, 'plant', { point: eastTree, variety: 'gold' });
  game = reap(game, game.trees[1]);
  game = act(game, 'shopUpgrade', { id: 'amberGrove', orchardId: EAST_ORCHARD });
  assert.equal(game.trees[1].readyAt, VARIETIES.gold.regrowth / (1 + GARDEN_RATES.amber));
  game = act(game, 'shopUpgrade', { id: 'loading', orchardId: EAST_ORCHARD });
  game = act(game, 'shopUpgrade', { id: 'trail', orchardId: EAST_ORCHARD });
  game = act(game, 'shopUpgrade', { id: 'shelves' });
  assert.equal(game.orchards[0].loadingLevel, 0);
  assert.equal(game.orchards[1].loadingLevel, 1);
  assert.equal(game.orchards[1].trailLevel, 1);
  assert.equal(game.shelvesLevel, 1);
});

test('an older placed sprinkler and earned experience survive the update', () => {
  const old = start(92);
  delete old.orchards[0].sprinklers;
  old.orchards[0].sprinkler = 3;
  const point = { x: 2275, y: 1625 };
  old.orchards[0].sprinklerAt = point;
  old.level = 7;
  old.xpProgress = 27;
  const migrated = restoreGame(JSON.stringify(old));
  const [sprinkler] = migrated.orchards[0].sprinklers;
  assert.deepEqual(sprinkler, { ...point, id: sprinkler.id });
  assert.equal(migrated.orchards[0].irrigationLevel, 3);
  assert.equal(migrated.level, 8);
  assert.equal(migrated.xpProgress, 0);
  assert.equal(migrated.xp, old.xp + 1);
});

test('scouts patrol a coarse area, detect with Foraging, and collect a flower once', () => {
  let game = act({ ...newGame(18), apples: 2500 }, 'unlock');
  const worker = game.workers[0];
  const flower = { x: 3480, y: 1380, id: 1001, variant: 0 };
  game.flowers = [flower];
  game.orchards[0].ready.push({ red: 10, gold: 0 });
  assert.equal(act(game, 'assignRole', { id: worker.id, role: 'scout' }), game);
  game = act(game, 'assignWorkplace', { id: worker.id, place: FOREST_WORKPLACE });
  assert.equal(game.workers[0].workRole, 'scout');
  assert.equal(workerWorkplace(game.workers[0]), FOREST_WORKPLACE);
  assert.equal(act(game, 'assignRole', { id: worker.id, role: 'collect' }), game);
  assert.equal(act(game, 'assignRole', { id: worker.id, role: 'forage' }), game);
  game = tick(game, 200);
  assert.equal(game.jobs[0].kind, 'scout');
  assert.equal(game.jobs[0].phase, 'patrol');
  assert.notDeepEqual({ x: game.jobs[0].route.x, y: game.jobs[0].route.y }, { x: flower.x, y: flower.y });
  assert.equal(game.orchards[0].ready.length, 1);
  game = until(game, state => !state.flowers.length);
  assert.ok(flowerActive(game));
  assert.equal(game.orchards[0].ready.length, 1);
  assert.equal(game.apples, 2400);
  assert.equal(act(game, 'flower', { id: flower.id }), game);
  assert.ok(game.flowerAt >= game.time + BALANCE.flowerCooldown);

  let nearby = act({ ...newGame(13), apples: 100 }, 'unlock');
  nearby.workers[0].x = 2250;
  nearby.workers[0].y = 1640;
  nearby.workers[0].stats.foraging = 1;
  nearby.flowers = [{ ...flower, x: 2400, y: 1640 }];
  const skilled = { ...nearby.workers[0], stats: { ...nearby.workers[0].stats, foraging: 9 } };
  assert.ok(flowerDetection(skilled) > flowerDetection(nearby.workers[0]));
  nearby = act(nearby, 'assignWorkplace', { id: nearby.workers[0].id, place: FOREST_WORKPLACE });
  const skilledGame = { ...nearby, workers: [{ ...skilled, workRole: 'scout' }] };
  assert.equal(tick(nearby, 200).jobs[0].phase, 'patrol');
  assert.equal(tick(skilledGame, 200).jobs[0].phase, 'approach');
});

test('beds draw tired orchard workers to the basket and speed up their sleep', () => {
  let game = act({ ...newGame(19), apples: 100, xp: 120 }, 'unlock');
  game = act(act(game, 'upgrade', { id: 'group1' }), 'upgrade', { id: 'naps' });
  game.workers[0].stamina = 0;
  const beds = orchardBeds(game, game.orchards[0]);
  assert.ok(beds.length > 0);
  game = tick(game, 100);
  assert.equal(game.jobs[0].kind, 'rest');
  game = until(game, state => state.workers[0].sleepUntil !== null);
  assert.equal(game.workers[0].sleepUntil - game.time, 5200);
  assert.ok(beds.some(bed => distance(bed, game.workers[0]) < 1));
});

test('clearing preserves apples in transit and allows replanting the same spot', () => {
  let game = act({ ...grow(newGame(75), near), apples: 500, xp: 70 }, 'unlock');
  const tree = game.trees[0].id;
  assert.equal(act(game, 'removeTree', { id: tree }), game);
  game = act(act(game, 'upgrade', { id: 'plot1' }), 'upgrade', { id: 'clearing' });
  game = until(game, state => state.jobs.some(job => job.kind === 'pick' && job.phase === 'basket'));
  const picked = game.jobs[0].load;
  game = act(game, 'removeTree', { id: tree });
  assert.equal(game.trees.length, 0);
  assert.ok(canPlant(game, near));
  game = until(game, state => fruitCount(state.orchards[0].fill) >= picked);
  assert.ok(grow(act(game, 'buySeed'), near).trees.length);
});

test('each orchard can buy and move four sprinklers and excess legacy purchases are refunded once', () => {
  let game = act({ ...newGame(8), apples: 3000 }, 'unlock');
  game = act(game, 'shopUpgrade', { id: 'secondPlot' });
  const points = [{ x: 3270, y: 1650 }, { x: 3510, y: 1850 }, { x: 3410, y: 1770 }, { x: 3330, y: 1850 }, { x: 3590, y: 1880 }];
  for (const point of points.slice(0, SPRINKLER_LIMIT)) game = act(game, 'placeSprinkler', { point, orchardId: EAST_ORCHARD });
  const orchard = game.orchards[1];
  assert.equal(orchard.sprinklers.length, SPRINKLER_LIMIT);
  assert.equal(act(game, 'placeSprinkler', { point: points[4], orchardId: EAST_ORCHARD }), game);
  const moved = act(game, 'placeSprinkler', { point: points[4], orchardId: EAST_ORCHARD, sprinklerId: orchard.sprinklers[0].id });
  assert.equal(moved.orchards[1].sprinklers[0].x, points[4].x);
  assert.equal(moved.apples, game.apples);
  assert.equal(moved.orchards[0].sprinklers.length, 0);
  const old = structuredClone(game);
  delete old.balanceVersion;
  old.orchards[1].sprinklers.push({ id: old.nextId++, ...points[4] });
  const restored = restoreGame(JSON.stringify(old));
  assert.equal(restored.orchards[1].sprinklers.length, SPRINKLER_LIMIT);
  assert.equal(restored.apples - old.apples, sprinklerPrice(orchard));
  assert.deepEqual(restoreGame(JSON.stringify(restored)), restored);
});

test('portable saves transfer game state and reject unrelated or incomplete JSON', () => {
  const state = start(17);
  assert.deepEqual(importGame(JSON.stringify(state)), state);
  assert.equal(importGame('not a save'), null);
  assert.equal(importGame('{"version":3}'), null);
  assert.equal(importGame(JSON.stringify({ ...state, workers: [{...state.workers[0], stats: null}] })), null);
  const legacy = previousSave(state);
  const migrated = importGame(JSON.stringify(legacy));
  assert.equal(migrated?.apples, state.apples);
  assert.equal(migrated?.workers[0].name, state.workers[0].name);
});

test('each paid hedgehog compounds the base hiring price by 16 percent before rounding', () => {
  assert.equal(BALANCE.hireGrowth, 1.16);
  assert.deepEqual([1, 2, 3, 4, 5].map(length => hirePrice({ workers: Array(length) })), [150, 174, 202, 235, 272]);
});

test('the new orchard upgrade has a steeper entry price and rewards a full harvest', () => {
  const seed = start(39);
  const tree = seed.trees[0];
  const nextCost = UPGRADES.orchardStewards.cost;
  const state = { ...seed, xp: nextCost - 1, upgrades: [...seed.upgrades, 'grafting'] };
  assert.ok(nextCost > UPGRADES.grafting.cost);
  assert.equal(upgradeStatus(state, 'orchardStewards'), 'pending');
  assert.equal(act(state, 'upgrade', { id: 'orchardStewards' }), state);
  const funded = { ...state, xp: nextCost };
  const upgraded = act(funded, 'upgrade', { id: 'orchardStewards' });
  assert.equal(upgraded.xp, 0);
  assert.equal(upgradeStatus(upgraded, 'orchardStewards'), 'done');
  assert.equal(advance(upgraded, tree.readyAt - state.time + 1).trees[0].fruit,
    advance(funded, tree.readyAt - state.time + 1).trees[0].fruit + 2);
  const reopened = restoreGame(JSON.stringify(upgraded));
  assert.equal(upgradeStatus(reopened, 'orchardStewards'), 'done');
  assert.equal(reopened.xp, 0);
});

test('a persistent recruit preview matches the hire and a saved crew restores roles', () => {
  let game = act({ ...newGame(32), apples: 8000 }, 'unlock');
  game = act(game, 'previewRecruit');
  const offer = game.recruitOffer;
  assert.equal(act(game, 'previewRecruit'), game);
  game = act(importGame(JSON.stringify(game)), 'recruit');
  assert.equal(game.workers.at(-1).id, offer.id);
  assert.deepEqual(game.workers.at(-1).stats, offer.stats);
  assert.equal(game.recruitOffer, undefined);
  const ids = game.workers.map(worker => worker.id);
  game = act(game, 'assignCrew', { ids, place: 'west', role: 'haul' });
  assert.ok(game.workers.every(worker => worker.workRole === 'haul'));
  game = act(game, 'saveCrew', { ids, name: 'Возчики' });
  game = act(game, 'assignCrew', { ids, place: 'west', role: 'collect' });
  game = act(importGame(JSON.stringify(game)), 'assignCrew', { name: 'Возчики' });
  assert.ok(game.workers.every(worker => worker.workRole === 'haul'));
});
