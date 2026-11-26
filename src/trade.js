import { CUSTOMERS } from './customers.js';
import { berryBounds, BERRY_ORCHARD, HOUSE, isBerryOrchard, isFieldCrop, isPurchasedGarden, makeOrchard, orchardById, orchardName, VARIETIES } from './orchard.js';
import { distance, followRoute, routeTo } from './routes.js';
import { regionAt, riverDistance, terrainKind, TRADE_GATES, TRADE_ROADS, WORLD } from './terrain.js';

import { adjustStock, GOODS, incomingGoods, industryStations, PRODUCED_GOODS, stockCount } from './industry.js';
import { demandScore, trafficLevel } from './siting.js';

export const PERMIT_PRICE = 2500;
export const FARM_PRICE = 1000;
const orchardBasePrice = 2000;
const landPriceGrowth = 2.5;
export const BERRY_OFFER_DELAY = 7 * 60_000;
const firstVisitorDelay = 14_000;
const visitorIntervals = { high: 30_000, medium: 42_000, low: 55_000 };
const visitorWait = stall => (visitorIntervals[stall.traffic] ?? visitorIntervals.low) / (1 + stall.levels.sign * .22);
const visitorStride = 145;
const ordinaryVisitors = Object.keys(CUSTOMERS).filter(id => !CUSTOMERS[id].unique && !CUSTOMERS[id].regular);
export const MARKET_UPGRADES = {
  shelves: { label: 'Полки', desc: '+100 мест для фруктов', base: 70, max: 3 },
  queue: { label: 'Очередь', desc: '+2 места для покупателей', base: 85, max: 3 },
  sign: { label: 'Вывеска', desc: 'Покупатели приходят чаще', base: 95, max: 3 },
  value: { label: 'Репутация', desc: '+12% к оплате заказа', base: 110, max: 3 },
};
export const GLOBAL_UPGRADES = {
  boots: { label: 'Дорожные башмачки', desc: 'Все ёжики ходят на 4% быстрее за уровень.', icon: 'speed', base: 170, max: 3, bonus: .04 },
  tools: { label: 'Набор садовода', desc: 'Ёжики собирают яблоки на 8% быстрее за уровень во всех садах.', icon: 'pickApple', base: 155, max: 3, bonus: .08 },
  teahouse: { label: 'Чайная у дома', desc: 'Сон всех ёжиков короче на 8% за уровень.', icon: 'bed', base: 190, max: 3, bonus: .08 },
  harnesses: { label: 'Ремни для ящиков', desc: 'Ёжики берут на 8 плодов больше за рейс из дома в любую лавку.', icon: 'crate', base: 180, max: 3, bonus: 8 },
  guild: { label: 'Торговая гильдия', desc: 'Все лавки получают на 5% больше монет за заказ за уровень.', icon: 'coin', base: 235, max: 3, bonus: .05 },
  greenhouse: { label: 'Тёплые укрытия', desc: 'Политые ягоды созревают за время на 10% меньше за уровень.', icon: 'graft', base: 260, max: 2, bonus: .10, berryFarm: true },
};
export const TRADE_ROLES = ['restock', 'vendor', 'forage', 'water'];
const goods = ['apples', 'berries', ...PRODUCED_GOODS];
export const orderLines = order => goods.filter(key => order?.[key] > 0).map(key => ({ key, label: GOODS[key].label, icon: GOODS[key].icon, quantity: order[key] }));
export const stallDemand = (state, point, id) => {
  const road = nearestRoad(point);
  return road && road.gap <= 180 && road.gap >= 46 ? demandScore(state, point, road.road, id) : 0;
};
const wildSites = [[4760,470],[4950,550],[5220,470],[5480,315],[5730,625],[5280,1530],[5850,1050]];
const patchSize = { width: 480, height: 336 };

export function newTrade() {
  return { permit: false, stallCredits: 0, stalls: [], firstStallAt: null, coins: 0, berries: 0, berrySeeds: 0, berryKnown: false,
    berryFarm: null, wild: [], canWater: 0, marketUpgrades: 0, globalUpgrades: {}, sales: 0, visitorsSeen: [], uniqueSeen: [], orchardPerks: {}, lastLine: {} };
}
export const stallById = (state, id) => state.trade.stalls.find(stall => stall.id === id);
export const marketStock = stall => goods.reduce((n, key) => n + (stall.stock[key] ?? 0), 0);
export const stallCapacity = stall => 240 + stall.levels.shelves * 100;
export const queueCapacity = stall => (stall.open ? 3 : 2) + stall.levels.queue * 2;
export const stallPrice = state => state.trade.stallCredits ? 0 : 850 * (state.trade.stalls.length + 1);
export const marketUpgradePrice = (stall, key) => Math.ceil(MARKET_UPGRADES[key].base * 1.8 ** stall.levels[key]);
export const globalUpgradeLevel = (state, key) => state.trade.globalUpgrades?.[key] ?? 0;
export const globalUpgradePrice = (state, key) => Math.ceil(GLOBAL_UPGRADES[key].base * 1.65 ** globalUpgradeLevel(state, key));
export const globalUpgradeBonus = (state, key) => GLOBAL_UPGRADES[key].bonus * globalUpgradeLevel(state, key);
export const orderPayment = (state, stall, order) => Math.floor(order.coins * (1 + stall.levels.value * .12 + globalUpgradeBonus(state, 'guild') + (state.upgrades?.includes('marketLedger') ? .08 : 0)));
export const frontCustomer = stall => stall.customers.find(customer => customer.phase === 'queue') ?? null;
export const canServe = (stall, order) => !!order && goods.every(key => (stall.stock[key] ?? 0) >= (order[key] ?? 0));
export const farmAvailable = state => (state.trade.berryKnown && state.trade.marketUpgrades >= 2) || Boolean(state.industry?.unlocked);
const landCount = (state, berry) => state.orchards.filter(({ id }) => berry ? isBerryOrchard(id) : isPurchasedGarden(id)).length;
export const landPrice = (state, berry) => Math.ceil((berry ? FARM_PRICE : orchardBasePrice) * landPriceGrowth ** landCount(state, berry));
export const MOVE_FARM_PRICE = 160;
const onWorld = (p, margin = 0) => Number.isFinite(p?.x) && Number.isFinite(p?.y) && p.x >= WORLD.x + margin && p.y >= WORLD.y + margin
  && p.x < WORLD.x + WORLD.width - margin && p.y < WORLD.y + WORLD.height - margin;
const inPlot = (box, point, extra = 0) => point.x >= box.x - extra && point.x <= box.x + box.width + extra
  && point.y >= box.y - extra && point.y <= box.y + box.height + extra;

function project(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

const paths = TRADE_ROADS.map(path => path.map(([x,y]) => ({x,y})));
const links = new Map();
const keyOf = point => `${point.x},${point.y}`;
function link(a,b) {
  const key = keyOf(a);
  if (!links.has(key)) links.set(key, []);
  links.get(key).push(b);
}
for (const path of paths) {
  for (let i = 1; i < path.length; i++) {
    link(path[i-1], path[i]);
    link(path[i], path[i-1]);
  }
}

function nearestRoad(point) {
  let best = null;
  for (const [road, path] of paths.entries()) {
    for (let i = 1; i < path.length; i++) {
      const a = path[i-1], b = path[i];
      const lane = project(point,a,b);
      const gap = distance(point,lane);
      if (!best || gap < best.gap) best = { lane, gap, road, a, b };
    }
  }
  return best;
}

export function marketSite(state, point, plots, ignoreId) {
  if (!onWorld(point, 100) || terrainKind(point) !== 'ground' || riverDistance(point) < 80 || distance(point, {x:2945,y:1443}) < 116
    || plots.some(plot => inPlot(plot, point, 72))
    || industryStations(state).some(site => distance(site, point) < 130)
    || state.trade.stalls.some(stall => stall.id !== ignoreId && distance(stall, point) < 165)) return null;
  const road = nearestRoad(point);
  if (road.gap < 46 || road.gap > 180) return null;
  const corners = [[-42,-32],[42,-32],[-42,26],[42,26]];
  if (corners.some(([x,y]) => terrainKind({ x: point.x + x, y: point.y + y }) !== 'ground')) return null;
  const open = corners.every(([x, y]) => terrainKind({ x: point.x + x * 2, y: point.y + y * 2 }) === 'ground');
  return { x: point.x, y: point.y, road: road.road, lane: road.lane, traffic: trafficLevel(demandScore(state, point, road.road, ignoreId)), open };
}

function roadRoute(gate, gateNode, lane, a, b) {
  const seen = new Set([keyOf(gateNode)]);
  const search = [{ node: gateNode, trail: [] }];
  for (const { node, trail } of search) {
    if (node === a || node === b) return [...trail, node, lane].filter(point => onWorld(point) && distance(point, gate) > 1);
    for (const next of links.get(keyOf(node)) ?? []) {
      if (!seen.has(keyOf(next))) {
        seen.add(keyOf(next));
        search.push({ node: next, trail: [...trail, node] });
      }
    }
  }
  return [lane];
}

const gateNodes = [paths[0][0], paths[0].at(-1), paths[1][0], paths[2].at(-1), paths[3].at(-1), paths[4].at(-1)];
const branchGates = [[2, 0], [3, 0], [4, 1], [5, 1]];
function customerRoute(stall, gateIndex) {
  const { a,b } = nearestRoad(stall.lane);
  const gate = TRADE_GATES[gateIndex];
  const nodes = roadRoute(gate, gateNodes[gateIndex], stall.lane, a, b);
  // The path graph starts beyond the map edge. The visitor starts at its first visible point.
  return { points: nodes, index: 0 };
}

function note(state, text, symbol = 'coin') {
  state.notice = { text, symbol, at: state.time, serial: state.nextId++ };
}
function explain(state, key, text) {
  state.guide = { text, key, serial: state.nextId++ };
}
const mayOfferBerries = state => state.trade.berryKnown || (Number.isFinite(state.trade.firstStallAt)
  && state.time - state.trade.firstStallAt >= BERRY_OFFER_DELAY);

function chooseOffer(state, kind, random) {
  const person = CUSTOMERS[kind];
  const previous = state.trade.lastLine[kind];
  const choices = person.offers.flatMap(([, berries], index) => !berries || state.trade.berryKnown ? [index] : []);
  const fresh = choices.filter(index => index !== previous);
  const lines = fresh.length ? fresh : choices;
  const choice = person.regular && previous === undefined ? lines[0] : lines[Math.floor(random(state) * lines.length)];
  state.trade.lastLine[kind] = choice;
  return [kind, choice];
}

function nextOffer(state, random) {
  const hasBerryOrder = state.trade.stalls.some(item => item.customers.some(c => c.phase !== 'leave' && c.order.berries));
  if (!state.trade.berryKnown && !hasBerryOrder && mayOfferBerries(state)) {
    state.trade.lastLine.agatha = 0;
    return ['agatha', 0];
  }
  const uncommon = Object.keys(CUSTOMERS).filter(id => CUSTOMERS[id].unique && !state.trade.uniqueSeen.includes(id)
    && !state.trade.stalls.some(item => item.customers.some(customer => customer.kind === id)));
  if (uncommon.length && state.trade.sales >= 1 && random(state) < .25) {
    return chooseOffer(state, uncommon[Math.floor(random(state) * uncommon.length)], random);
  }
  const present = new Set(state.trade.stalls.flatMap(item => item.customers.filter(customer => customer.phase !== 'leave').map(customer => customer.kind)));
  const pool = [...ordinaryVisitors, 'bobby', 'bobby', ...(state.trade.berryKnown ? ['agatha', 'lily'] : [])];
  const absent = pool.filter(id => !present.has(id));
  const ordinary = state.trade.sales === 0 && !present.has('bobby') ? ['bobby'] : absent.length ? absent : pool;
  return chooseOffer(state, ordinary[Math.floor(random(state) * ordinary.length)], random);
}

function revealBerries(state) {
  if (state.trade.berryKnown) return;
  state.trade.berryKnown = true;
  state.trade.wild = wildSites.map(([x,y],i) => ({ id: state.nextId++, x, y, fruit: 12 + i % 3 * 3, readyAt: 0 }));
  explain(state, 'wildBerries', 'Агата просит ягоды! В дальнем лесу уже растут дикие кусты. Можно собрать ягоды самому или назначить ёжика на лесной сбор. Ягодник за монеты появится после двух улучшений лавки.');
}

function acceptCustomerOrder(state, customer) {
  const { order } = customer;
  if (order.accepted || (order.berries && !mayOfferBerries(state))) return false;
  order.accepted = true;
  if (order.berries) revealBerries(state);
  return true;
}

function spawnCustomer(state, stall, random) {
  const [kind, choice] = nextOffer(state, random);
  const [apples,berries,coins,line] = CUSTOMERS[kind].offers[choice];
  const firstBerry = berries && !state.trade.berryKnown;
  const feeds = stall.road === 0 ? TRADE_GATES.map((_, i) => i) : branchGates[stall.road - 1];
  // A stall on the main road draws mainly from the closer end, with occasional through traffic.
  const sorted = [...feeds].sort((a,b) => distance(TRADE_GATES[a],stall) - distance(TRADE_GATES[b],stall));
  const gate = random(state) < .72 ? sorted[0] : sorted[Math.floor(random(state) * sorted.length)];
  const order = { apples, berries, coins: Math.floor(coins * .72), line, accepted: false, commission: !!firstBerry };
  const products = state.industry?.knownProducts ?? [];
  if (!firstBerry && products.length && random(state) < .46) {
    const key = products[Math.floor(random(state) * products.length)];
    const amount = 3 + Math.floor(random(state) * 5);
    Object.assign(order, { apples: 0, berries: 0, [key]: amount, coins: 100 + amount * GOODS[key].value,
      line: `Добрый день! Есть готовые продукты? Мой заказ — ${GOODS[key].label.toLowerCase()}.` });
  }
  stall.customers.push({ id: state.nextId++, kind, ...TRADE_GATES[gate], gate, order, phase: 'walk',
    route: customerRoute(stall,gate) });
}

function leave(stall, customer) {
  const home = TRADE_GATES[customer.gate];
  const route = customerRoute(stall, customer.gate);
  customer.phase = 'leave';
  customer.route = { points: [...route.points.slice(0,-1).reverse(), home], index: 0 };
}

export function advanceCustomers(state, seconds, random) {
  for (const patch of state.trade.wild) {
    if (patch.fruit === 0 && patch.readyAt <= state.time) patch.fruit = 14;
  }
  for (const stall of state.trade.stalls) {
    let queueSize = 0;
    stall.customers = stall.customers.filter(customer => {
      if (customer.phase === 'leave') return !followRoute(customer, customer.route, visitorStride, seconds);
      if (customer.phase === 'walk' && followRoute(customer, customer.route, visitorStride, seconds)) {
        customer.phase = 'queue';
        if (!state.trade.visitorsSeen.includes(customer.kind)) state.trade.visitorsSeen.push(customer.kind);
        if (CUSTOMERS[customer.kind].unique) state.trade.uniqueSeen.push(customer.kind);
      }
      if (customer.phase === 'queue') {
        const i = queueSize++;
        const dx = stall.lane.x - stall.x, dy = stall.lane.y - stall.y;
        const length = Math.hypot(dx,dy) || 1;
        const ahead = Math.min(1, (i * 12 + 28) / length);
        const spot = { x: stall.x + dx * ahead + dy / length * i * 21, y: stall.y + dy * ahead - dx / length * i * 21 };
        followRoute(customer, { points: [spot], index: 0 }, 110, seconds);
      }
      return true;
    });
    const active = stall.customers.filter(customer => customer.phase !== 'leave').length;
    if (state.time >= stall.spawnAt && active < queueCapacity(stall)) {
      spawnCustomer(state,stall,random);
      stall.traffic = trafficLevel(demandScore(state, stall, stall.road, stall.id));
      stall.spawnAt = state.time + visitorWait(stall);
    }
  }
}

function restockAmount(state, stall, key, amount) {
  const reserved = state.jobs.filter(job => job.kind === 'restock' && job.stallId === stall.id && job.cargo).reduce((n, job) => n + job.cargo.amount, 0);
  return Math.min(Math.floor(amount), stallCapacity(stall) - marketStock(stall) - reserved - goods.reduce((sum, item) => sum + incomingGoods(state, `stall:${stall.id}`, item), 0), stockCount(state,key));
}
function automaticDemand(state, stall, key, worker) {
  const target = frontCustomer(stall)?.order[key] ?? (key === 'apples' ? 100 : 0);
  const incoming = state.jobs.filter(job => job.kind === 'restock' && job.stallId === stall.id && job.cargo?.key === key)
    .reduce((sum, job) => sum + job.cargo.amount, 0);
  const inHouse = stockCount(state,key) - (key === 'apples' ? stall.reserve : 0);
  const capacity = 28 + worker.stats.strength * 8 + globalUpgradeBonus(state, 'harnesses') + (state.upgrades.includes('tradeCrates') ? 12 : 0) + (state.upgrades.includes('trailSatchels') ? 16 : 0);
  return restockAmount(state,stall,key,Math.min(target - (stall.stock[key] ?? 0) - incoming - incomingGoods(state, `stall:${stall.id}`, key),inHouse,capacity));
}
function completeSale(state, stall, customer) {
  if (frontCustomer(stall)?.id !== customer.id || !customer.order.accepted || !canServe(stall,customer.order)) return false;
  for (const { key, quantity } of orderLines(customer.order)) stall.stock[key] -= quantity;
  const earned = orderPayment(state, stall, customer.order);
  state.trade.coins += earned;
  state.trade.sales++;
  leave(stall,customer);
  note(state, `Заказ выполнен. +${earned} монет.`);
  if (state.trade.sales === 1) explain(state, 'firstSale', 'Первая продажа! Монеты можно потратить на полки, вывеску и место для очереди. Продавец-ёжик тоже сможет принимать заказы.');
  return true;
}

export const landFootprint = point => ({ x: point.x - patchSize.width / 2, y: point.y - patchSize.height / 2, ...patchSize });

export function landSite(state, point, plots, ignoredPlot) {
  if (!onWorld(point, 260)) return null;
  const box = landFootprint(point);
  const margin = 54;
  if (plots.some(plot => plot !== ignoredPlot && box.x < plot.x + plot.width + margin && box.x + box.width > plot.x - margin
      && box.y < plot.y + plot.height + margin && box.y + box.height > plot.y - margin)
    || inPlot(box, HOUSE, margin) || industryStations(state).filter(site => site.kind !== 'tractor').some(site => inPlot(box, site, margin))
    || state.trade.stalls.some(stall => inPlot(box, stall, margin))
    || state.trade.wild.some(patch => inPlot(box, patch, 24))) return null;
  for (let y = box.y; y <= box.y + box.height; y += 24) {
    for (let x = box.x; x <= box.x + box.width; x += 24) {
      if (terrainKind({x,y}) !== 'ground') return null;
    }
  }
  return box;
}

export function farmSite(state, point, plots, moving = false, orchardId = BERRY_ORCHARD) {
  const existing = moving ? berryBounds(state, orchardId) : undefined;
  if (moving && !existing) return null;
  const box = landSite(state, point, plots, existing);
  if (!box) return null;
  const rich = ['forest','south'].includes(regionAt(point.x,point.y));
  return { ...box, rich, water: waterSource(point) };
}

function movePlot(state, orchard, oldSite, site) {
  const dx = site.x - oldSite.x, dy = site.y - oldSite.y;
  if (orchard.id === BERRY_ORCHARD) state.trade.berryFarm = site;
  else orchard.plot = site;
  for (const item of [orchard.basket, ...orchard.sprinklers, ...state.trees.filter(tree => tree.orchardId === orchard.id)]) {
    item.x += dx;
    item.y += dy;
  }
  for (const job of state.jobs.filter(job => job.kind === 'pick' && job.orchardId === orchard.id && job.phase === 'pick')) job.phase = 'seek';
}

function nearbySite(point, find, limit) {
  const step = 24;
  for (let ring = step; ring <= limit; ring += step) {
    for (let shift = -ring; shift <= ring; shift += step) {
      const offsets = [[shift, -ring], [shift, ring], [-ring, shift], [ring, shift]];
      for (const [dx, dy] of offsets) {
        const site = find({ x: point.x + dx, y: point.y + dy });
        if (site) return site;
      }
    }
  }
  return null;
}

export function migrateTradeSites(state, plots) {
  for (const stall of state.trade.stalls) {
    const find = point => marketSite(state,point,plots,stall.id);
    if (find(stall)) continue;
    const site = nearbySite(stall,find,360);
    if (!site) continue;
    const dx = site.x - stall.x, dy = site.y - stall.y;
    Object.assign(stall,site);
    for (const customer of stall.customers) {
      if (customer.phase === 'walk') Object.assign(customer,TRADE_GATES[customer.gate],{ route:customerRoute(stall,customer.gate) });
      else if (customer.phase === 'queue') {
        customer.x += dx;
        customer.y += dy;
      }
    }
  }

  const orchard = state.orchards.find(item => item.id === 'berry');
  const farm = state.trade.berryFarm;
  if (!farm || !orchard) return;
  const center = { x:farm.x + farm.width / 2, y:farm.y + farm.height / 2 };
  const find = point => farmSite(state,point,plots,true);
  if (find(center)) return;
  const site = nearbySite(center,find,960);
  if (site) movePlot(state, orchard, farm, site);
}

export function migrateMarketProgress(state) {
  const { trade } = state;
  trade.globalUpgrades ??= {};
  trade.visitorsSeen ??= [...new Set([
    ...trade.uniqueSeen,
    ...trade.stalls.flatMap(stall => stall.customers.filter(customer => customer.phase !== 'walk').map(customer => customer.kind)),
  ])];
  if (trade.firstStallAt !== undefined) {
    for (const stall of trade.stalls) stall.spawnAt = Math.min(stall.spawnAt, state.time + visitorWait(stall));
    return;
  }
  trade.firstStallAt = trade.stalls.length ? state.time : null;
  for (const stall of trade.stalls) {
    stall.spawnAt = Math.max(stall.spawnAt, state.time + firstVisitorDelay);
    if (!trade.berryKnown) stall.customers = stall.customers.filter(customer => !customer.order.berries);
  }
}

let banks;
function riverBanks() {
  if (banks) return banks;
  banks = [];
  for (let y = WORLD.y + 40; y < WORLD.y + WORLD.height - 30; y += 48) {
    for (let x = 2500; x < 4270; x += 24) {
      const sample = {x,y};
      if (terrainKind(sample) !== 'ground') continue;
      const offset = riverDistance(sample);
      if (offset >= 48 && offset <= 66) banks.push(sample);
    }
  }
  return banks;
}

export function waterSource(point) {
  return riverBanks().reduce((best, sample) => distance(sample,point) < distance(best,point) ? sample : best, riverBanks()[0]);
}

export function startCropGrowth(state, tree) {
  const farm = berryBounds(state, tree.orchardId);
  const duration = tree.variety === 'berry' ? (farm.rich ? 18000 : 14000) : VARIETIES.wheat.regrowth;
  tree.readyAt = state.time + duration * (1 - globalUpgradeBonus(state, 'greenhouse'))
    * (state.upgrades.includes('farmWater') ? .8 : 1);
}
function waterPlants(state, target, amount) {
  const dry = state.trees.filter(tree => isFieldCrop(tree.variety) && tree.orchardId === target.orchardId && !tree.fruit && tree.readyAt === null
    && distance(tree,target) <= 145).sort((a,b) => distance(a,target) - distance(b,target)).slice(0,amount);
  for (const tree of dry) startCropGrowth(state, tree);
  return dry.length;
}
function wildHarvest(state, patch, amount = patch?.fruit ?? 0) {
  if (!patch?.fruit || !amount) return 0;
  const taken = Math.min(amount, patch.fruit);
  patch.fruit -= taken;
  if (!patch.fruit) patch.readyAt = state.time + 145000;
  if (!state.trade.bonusSeed) {
    state.trade.berrySeeds++;
    state.trade.bonusSeed = true;
  }
  return taken;
}

export const tradeActions = {
  permit(state) {
    if (!state.unlocked || state.trade.permit || state.apples < PERMIT_PRICE || !state.orchards.some(orchard => orchard.id === 'forest')) return false;
    state.apples -= PERMIT_PRICE;
    state.trade.permit = true;
    state.trade.stallCredits++;
    explain(state, 'permit', 'Разрешение куплено. Поставь первую лавку рядом с дорогой и прими заказ. Свободные ёжики принесут нужные плоды из дома. Можно назначить снабженца, чтобы он пополнял запасы заранее.');
    return true;
  },
  placeMarket(state, { point, stallId }, { plots }) {
    const site = marketSite(state,point,plots,stallId);
    if (!site || !state.trade.permit) return false;
    if (stallId !== undefined && stallId !== null) {
      const stall = stallById(state,stallId);
      if (!stall || state.trade.coins < 80) return false;
      state.trade.coins -= 80;
      for (const customer of stall.customers) if (customer.phase === 'queue' && CUSTOMERS[customer.kind].unique) {
        state.trade.uniqueSeen = state.trade.uniqueSeen.filter(kind => kind !== customer.kind);
      }
      Object.assign(stall,site,{customers:[],spawnAt:state.time+firstVisitorDelay});
      note(state, 'Лавка перенесена.');
      return true;
    }
    const price = stallPrice(state);
    if (state.trade.coins < price) return false;
    state.trade.coins -= price;
    if (state.trade.stallCredits) state.trade.stallCredits--;
    state.trade.firstStallAt ??= state.time;
    state.trade.stalls.push({ ...site, id: state.nextId++, stock: { apples:0, berries:0 }, reserve: 100, levels: { shelves:0, queue:0, sign:0, value:0 },
      customers: [], spawnAt: state.time + firstVisitorDelay, price });
    return true;
  },
  returnStock(state,{stallId}) {
    const stall = stallById(state,stallId);
    if (!stall || !marketStock(stall)) return false;
    for (const key of goods) {
      adjustStock(state,key,stall.stock[key]);
      stall.stock[key] = 0;
    }
    return true;
  },
  setReserve(state,{stallId, amount}) {
    const stall = stallById(state,stallId);
    if (!stall || !Number.isSafeInteger(amount) || amount < 0) return false;
    stall.reserve = amount;
    return true;
  },
  acceptOrder(state, { stallId, customerId }) {
    const stall = stallById(state,stallId);
    const customer = stall && frontCustomer(stall);
    return customer?.id === customerId && acceptCustomerOrder(state, customer);
  },
  fillOrder(state, { stallId, customerId }) {
    const stall = stallById(state,stallId);
    const customer = stall && frontCustomer(stall);
    return customer?.id === customerId && completeSale(state,stall,customer);
  },
  declineOrder(state, { stallId, customerId }) {
    const stall = stallById(state,stallId);
    const customer = stall && frontCustomer(stall);
    if (!customer || customer.id !== customerId) return false;
    if (CUSTOMERS[customer.kind].unique) state.trade.uniqueSeen = state.trade.uniqueSeen.filter(kind => kind !== customer.kind);
    leave(stall,customer);
    return true;
  },
  buyMarketUpgrade(state, { stallId, key }) {
    const stall = stallById(state,stallId);
    if (!stall || !Object.hasOwn(MARKET_UPGRADES,key) || stall.levels[key] >= MARKET_UPGRADES[key].max) return false;
    const price = marketUpgradePrice(stall,key);
    if (state.trade.coins < price) return false;
    state.trade.coins -= price;
    stall.levels[key]++;
    state.trade.marketUpgrades++;
    note(state, 'Лавка улучшена.');
    return true;
  },
  buyGlobalUpgrade(state, { key }) {
    if (!state.trade.permit || !Object.hasOwn(GLOBAL_UPGRADES, key)) return false;
    const project = GLOBAL_UPGRADES[key];
    const level = globalUpgradeLevel(state, key);
    const price = globalUpgradePrice(state, key);
    if (level >= project.max || state.trade.coins < price || (project.berryFarm && !state.trade.berryFarm)) return false;
    state.trade.coins -= price;
    state.trade.globalUpgrades[key] = level + 1;
    if (key === 'greenhouse') {
      const ratio = (1 - project.bonus * (level + 1)) / (1 - project.bonus * level);
      for (const tree of state.trees) {
        if (isFieldCrop(tree.variety) && !tree.fruit && tree.readyAt > state.time) {
          tree.readyAt = state.time + (tree.readyAt - state.time) * ratio;
        }
      }
    }
    note(state, `${project.label} — куплено.`, project.icon);
    return true;
  },
  pickWild(state, { id }) {
    const taken = wildHarvest(state,state.trade.wild.find(item => item.id === id));
    if (!taken) return false;
    state.trade.berries += taken;
    note(state, `Дикие ягоды у дома +${taken}.`, 'berry');
    return true;
  },
  placeGarden(state, { point }, { plots }) {
    const cost = landPrice(state, false);
    if (!state.trade.permit || state.trade.coins < cost) return false;
    const site = landSite(state, point, plots);
    if (!site) return false;
    const id = `apple-${landCount(state, false) + 1}`;
    const orchard = makeOrchard(id, { x: site.x + 68, y: site.y + site.height - 62 });
    state.orchards.push({ ...orchard, plot: site });
    state.trade.coins -= cost;
    note(state, `${orchardName(id)} открыт.`, 'seed');
    return true;
  },
  moveGarden(state, { point, orchardId }, { plots }) {
    const orchard = orchardById(state, orchardId);
    if (!isPurchasedGarden(orchardId) || !orchard || state.trade.coins < MOVE_FARM_PRICE) return false;
    const site = landSite(state, point, plots, orchard.plot);
    if (!site || (site.x === orchard.plot.x && site.y === orchard.plot.y)) return false;
    state.trade.coins -= MOVE_FARM_PRICE;
    movePlot(state, orchard, orchard.plot, site);
    note(state, 'Сад перенесён вместе с деревьями.', 'seed');
    return true;
  },
  placeFarm(state, { point, moving = false, orchardId = BERRY_ORCHARD }, { plots }) {
    const orchard = moving && orchardById(state, orchardId);
    const farm = orchard && berryBounds(state, orchardId);
    const cost = moving ? MOVE_FARM_PRICE : landPrice(state, true);
    if ((moving ? !farm : !farmAvailable(state)) || state.trade.coins < cost) return false;
    const site = farmSite(state,point,plots,moving,orchardId);
    if (!site) return false;
    if (moving && site.x === farm.x && site.y === farm.y) return false;
    state.trade.coins -= cost;
    if (orchard) {
      movePlot(state, orchard, farm, site);
      note(state, 'Ферма перенесена вместе с посевами.', 'berry');
    } else {
      const count = landCount(state, true);
      const id = count ? `berry-${count + 1}` : BERRY_ORCHARD;
      const farmOrchard = makeOrchard(id, { x: site.x + 68, y: site.y + site.height - 62 });
      if (!count) state.trade.berryFarm = site;
      else farmOrchard.plot = site;
      state.orchards.push(farmOrchard);
      state.trade.berrySeeds += 2;
      if (!count) explain(state, 'berryFarm', 'Посади кусты, набери воду у отмеченного берега, затем нажми на сухой куст. Одна лейка поливает до трёх соседних кустов. Полив можно поручить ёжику.');
      else note(state, `${orchardName(id)} открыт.`, 'berry');
    }
    return true;
  },
  buyBerrySeed(state) {
    if (!state.trade.berryFarm || state.trade.coins < 35) return false;
    state.trade.coins -= 35;
    state.trade.berrySeeds++;
    return true;
  },
  refillCan(state, { orchardId = BERRY_ORCHARD }) {
    const farm = berryBounds(state, orchardId);
    if (!farm || state.trade.canWater >= (state.trade.largeCan ? 5 : 3) || state.time < (state.trade.refillAt ?? 0)) return false;
    state.trade.canWater = state.trade.largeCan ? 5 : 3;
    const center = { x: farm.x + farm.width / 2, y: farm.y + farm.height / 2 };
    state.trade.refillAt = state.time + Math.min(18000, distance(farm.water, center) * 9);
    note(state, 'Лейка наполнена.', 'water');
    return true;
  },
  waterPlant(state,{id}) {
    const tree = state.trees.find(item => item.id === id && isFieldCrop(item.variety) && item.readyAt === null && !item.fruit);
    if (!tree || !state.trade.canWater) return false;
    state.trade.canWater -= waterPlants(state,tree,state.trade.canWater);
    return true;
  },
  buyWaterCan(state) {
    if (!state.trade.berryFarm || state.trade.largeCan || state.apples < 260) return false;
    state.apples -= 260; state.trade.largeCan = true;
    return true;
  },
  buyOrchardTrade(state, { orchardId, key }) {
    if (!state.trade.permit || !orchardById(state, orchardId) || isBerryOrchard(orchardId)) return false;
    const perks = state.trade.orchardPerks[orchardId] ?? { depot:false, mulch:false };
    if (key === 'depot' && !perks.depot && state.trade.coins >= 210) {
      state.trade.coins -= 210; perks.depot = true;
    } else if (key === 'mulch' && !perks.mulch && state.trade.berries >= 90 && state.trade.berryFarm) {
      state.trade.berries -= 90; perks.mulch = true;
    } else return false;
    state.trade.orchardPerks[orchardId] = perks;
    return true;
  },
  removeMarket(state, { stallId }) {
    const stall = stallById(state,stallId);
    if (!stall) return false;
    for (const key of goods) adjustStock(state,key,stall.stock[key]);
    for (const job of state.jobs.filter(job => job.stallId === stall.id && job.cargo)) adjustStock(state,job.cargo.key,job.cargo.amount);
    for (const customer of stall.customers) if (customer.phase === 'queue' && CUSTOMERS[customer.kind].unique) {
      state.trade.uniqueSeen = state.trade.uniqueSeen.filter(kind => kind !== customer.kind);
    }
    state.jobs = state.jobs.filter(job => job.stallId !== stall.id);
    state.trade.stalls = state.trade.stalls.filter(item => item.id !== stall.id);
    for (const worker of state.workers.filter(worker => worker.stallId === stall.id)) {
      worker.stallId = state.trade.stalls[0]?.id ?? null;
      if (worker.stallId === null && ['restock','vendor'].includes(worker.workRole)) worker.workRole = 'auto';
    }
    if (stall.price) state.trade.coins += Math.floor(stall.price / 2);
    else state.trade.stallCredits++;
    return true;
  },
};

export function scheduleCommission(state, worker) {
  if (worker.workRole !== 'auto') return null;
  for (const stall of state.trade.stalls) {
    const customer = frontCustomer(stall);
    if (!customer?.order.accepted || state.workers.some(other => other.workRole === 'restock' && other.stallId === stall.id
      && other.sleepUntil === null && other.stamina > 0)) continue;
    const key = goods.find(item => automaticDemand(state, stall, item, worker) > 0
      && !state.jobs.some(job => job.kind === 'restock' && job.stallId === stall.id && job.key === item));
    if (key) return { kind: 'restock', phase: 'house', key, stallId: stall.id,
      commissionId: customer.id, orchardId: worker.orchardId, workers: [worker.id] };
  }
  return null;
}

export function scheduleTrade(state, worker) {
  const job = { kind: worker.workRole, orchardId: worker.orchardId, workers: [worker.id] };
  if (worker.workRole === 'forage') {
    const patch = state.trade.wild.filter(p => p.fruit && !state.jobs.some(other => other.patchId === p.id))
      .sort((a,b) => distance(worker,a) - distance(worker,b))[0];
    if (patch) return { ...job, phase: 'toPatch', patchId: patch.id };
  }
  if (worker.workRole === 'water') {
    const target = state.trees.find(tree => isFieldCrop(tree.variety) && tree.orchardId === worker.orchardId && !tree.fruit && tree.readyAt === null
      && !state.jobs.some(other => other.kind === 'water' && other.treeId === tree.id));
    if (target) return { ...job, phase: 'refill', treeId: target.id };
  }
  const stall = stallById(state,worker.stallId);
  if (!stall) return null;
  if (worker.workRole === 'vendor') {
    const customer = frontCustomer(stall);
    const order = customer?.order;
    const canAccept = order && !order.accepted && (!order.berries || mayOfferBerries(state));
    if ((canAccept || canServe(stall,order)) && !state.jobs.some(other => other.kind === 'vendor' && other.stallId === stall.id)) {
      return { ...job, phase: 'counter', stallId: stall.id, customerId: customer.id };
    }
  }
  if (worker.workRole === 'restock') {
    const request = frontCustomer(stall)?.order;
    const order = request?.berries > stall.stock.berries ? ['berries', ...goods.filter(key => key !== 'berries')] : goods;
    for (const key of order) {
      if (automaticDemand(state,stall,key,worker) > 0) return { ...job, phase: 'house', key, stallId: stall.id };
    }
  }
  return null;
}

export function moveTradeJob(state, job, worker, stride, seconds, house, roads = []) {
  const walk = target => {
    if (!job.route || job.route.x !== target.x || job.route.y !== target.y) job.route = routeTo(worker,target,undefined,roads);
    // A changed destination clears the job on a failed path so no worker stays pinned.
    return !job.route ? null : followRoute(worker,job.route,stride,seconds,roads);
  };
  if (job.kind === 'forage') {
    if (job.phase === 'toPatch') {
      const patch = state.trade.wild.find(item => item.id === job.patchId);
      if (!patch?.fruit) return true;
      const arrived = walk(patch);
      if (arrived !== true) return arrived === null;
      job.amount = wildHarvest(state,patch,5 + worker.stats.foraging * 3 + (state.upgrades.includes('forestPockets') ? 4 : 0));
      job.phase = 'return';
      return false;
    }
    const arrived = walk(house);
    if (arrived === false) return false;
    state.trade.berries += job.amount;
    note(state, `${worker.name} принёс дикие ягоды +${job.amount}.`, 'berry');
    return true;
  }
  if (job.kind === 'water') {
    const target = state.trees.find(tree => tree.id === job.treeId);
    if (!target || target.orchardId !== worker.orchardId || worker.workRole !== 'water' || target.readyAt !== null || target.fruit) return true;
    if (job.phase === 'refill') {
      const arrived = walk(berryBounds(state, target.orchardId).water);
      if (arrived !== true) return arrived === null;
      job.phase = 'water';
      return false;
    }
    const arrived = walk(target);
    if (arrived !== true) return arrived === null;
    waterPlants(state,target,state.trade.largeCan ? 5 : 3);
    return true;
  }
  const stall = stallById(state,job.stallId);
  if (!stall) return true;
  if (job.kind === 'restock') {
    if (job.phase === 'house') {
      if (job.commissionId !== undefined && frontCustomer(stall)?.id !== job.commissionId) return true;
      const arrived = walk(house);
      if (arrived !== true) return arrived === null;
      const amount = automaticDemand(state,stall,job.key,worker);
      if (amount <= 0) return true;
      job.cargo = { key:job.key, amount };
      adjustStock(state,job.key,-amount);
      job.phase = 'stall';
      return false;
    }
    const arrived = walk(stall);
    if (arrived === false) return false;
    if (arrived === null) adjustStock(state,job.cargo.key,job.cargo.amount);
    else stall.stock[job.cargo.key] = (stall.stock[job.cargo.key] ?? 0) + job.cargo.amount;
    return true;
  }
  const customer = frontCustomer(stall);
  if (customer?.id !== job.customerId) return true;
  const arrived = walk(stall);
  if (arrived !== true) return arrived === null;
  job.phase = 'serve';
  job.until ??= state.time + Math.max(2500,11500 - worker.stats.handling * 720);
  if (state.time < job.until) return false;
  acceptCustomerOrder(state, customer);
  if (canServe(stall,customer.order)) completeSale(state,stall,customer);
  return true;
}
