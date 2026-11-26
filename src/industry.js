import { HOUSE, takeReady } from './orchard.js';
import { canWalkStraight, closestRoadSegment, distance, findRoute, followRoute, roadGap, routeTo } from './routes.js';
import { roadDistance, terrainKind, WORLD } from './terrain.js';

export const PRODUCTION_PRICE = 10_000;
export const JAR_PRICE = 14;
export const ROAD_PRICE = 350;
export const BUILDINGS = {
  workshop: { label: 'Мастерская', icon: 'table', price: 1800, growth: 1.65 },
  mine: { label: 'Угольная шахта', icon: 'soil', price: 2900, growth: 1.65 },
  tractor: { label: 'Красный трактор', icon: 'fastBasket', price: 3600, growth: 1.7 },
  house: { label: 'Дом для ёжиков', icon: 'bed', price: 2400, growth: 1.85 },
};
export const COAL_SITES = [
  { x: 1710, y: -812 }, { x: 2700, y: -1000 }, { x: 3990, y: -968 }, { x: 4890, y: -770 },
];
export const GOODS = {
  apples: { label: 'Яблоки', icon: 'apple' }, berries: { label: 'Ягоды', icon: 'berry' },
  wheat: { label: 'Пшеница', icon: 'wheat' }, flour: { label: 'Мука', icon: 'flour' },
  jars: { label: 'Банки', icon: 'jar' }, fuel: { label: 'Топливо', icon: 'fuel' },
  slices: { label: 'Яблочные дольки', icon: 'apple', value: 7 },
  compote: { label: 'Яблочный компот', icon: 'compote', value: 9 },
  puree: { label: 'Ягодное пюре', icon: 'berry', value: 10 },
  bread: { label: 'Хлеб', icon: 'bread', value: 13 },
  pie: { label: 'Яблочный пирог', icon: 'pie', value: 19 },
  jam: { label: 'Ягодное варенье', icon: 'jam', value: 19 },
  mixedJam: { label: 'Яблочно-ягодное варенье', icon: 'mixedJam', value: 23 },
  berryCompote: { label: 'Ягодный компот', icon: 'compote', value: 11 },
};
export const PRODUCED_GOODS = Object.keys(GOODS).filter(key => GOODS[key].value);
export const RECIPES = {
  slices: { needs: { apples: 12 }, amount: 6, ms: 5500, level: 1 },
  compote: { needs: { apples: 16 }, amount: 6, ms: 8500, level: 1 },
  puree: { needs: { berries: 10 }, amount: 5, ms: 6500, level: 1 },
  berryCompote: { needs: { berries: 12 }, amount: 5, ms: 8000, level: 1 },
  flour: { needs: { wheat: 10 }, amount: 6, ms: 7000, level: 1 },
  bread: { needs: { flour: 5 }, amount: 5, ms: 10_000, level: 2 },
  pie: { needs: { apples: 12, flour: 5 }, amount: 4, ms: 13_000, level: 2 },
  jam: { needs: { berries: 14, jars: 4 }, amount: 4, ms: 12_000, level: 2 },
  mixedJam: { needs: { apples: 9, berries: 9, jars: 4 }, amount: 4, ms: 15_000, level: 2 },
};
export const INDUSTRY_ROLES = ['maker', 'buyer', 'miner', 'driver'];
const buildingGroups = { workshop: 'workshops', mine: 'mines', house: 'houses', tractor: 'tractors' };

export function newIndustry() {
  return { unlocked: false, wheatSeeds: 0, stock: {}, houses: [], workshops: [], mines: [], tractors: [], roads: [],
    knownProducts: [], deliveries: 0 };
}
export const housingCapacity = state => 10 + 5 * state.industry.houses.length;
export const buildingPrice = (state, kind) => {
  const item = BUILDINGS[kind];
  return Math.ceil(item.price * item.growth ** state.industry[buildingGroups[kind]].length);
};
export const upgradeWorkshopPrice = shop => shop.level === 1 ? 2300 : 5100;
export const stockCount = (state, key) => key === 'apples' ? state.apples
  : key === 'berries' ? state.trade.berries : state.industry?.stock[key] ?? 0;
export function adjustStock(state, key, amount) {
  if (!amount) return;
  if (key === 'apples') state.apples += amount;
  else if (key === 'berries') state.trade.berries += amount;
  else state.industry.stock[key] = stockCount(state, key) + amount;
}

export function nearestHome(state, point) {
  if (!state.industry.houses.length) return HOUSE;
  const homes = [HOUSE, ...state.industry.houses].sort((a, b) => distance(point, a) - distance(point, b));
  return homes.find(home => canWalkStraight(point, home) || findRoute(point, home)) ?? HOUSE;
}

export function industryStations(state) {
  return [...state.industry.workshops, ...state.industry.mines, ...state.industry.tractors, ...state.industry.houses];
}
export function industryWorkplaces(state) {
  return industryStations(state).filter(site => site.kind !== 'house').map((site) => ({
    ...site, industryId: site.id, icon: BUILDINGS[site.kind].icon,
    label: site.level === 3 ? `Фабрика ${site.number}` : `${BUILDINGS[site.kind].label} ${site.number}`,
    roles: site.kind === 'workshop' ? (site.level === 3 ? ['buyer'] : ['maker', 'buyer'])
      : site.kind === 'mine' ? ['miner'] : ['driver'],
  }));
}
export const industrySite = (state, id) => industryStations(state).find(site => site.id === id);

const onMap = point => Number.isFinite(point?.x) && Number.isFinite(point?.y)
  && point.x >= WORLD.x + 70 && point.x < WORLD.x + WORLD.width - 70
  && point.y >= WORLD.y + 70 && point.y < WORLD.y + WORLD.height - 70;
const coalSite = point => COAL_SITES.find(site => distance(point, site) <= 175);
export function buildingSite(state, kind, point, plots) {
  if (!onMap(point) || !Object.hasOwn(BUILDINGS, kind)) return null;
  const site = kind === 'mine' ? coalSite(point) : point;
  if (!site || terrainKind(site) === 'river' || (kind !== 'tractor' && terrainKind(site) !== 'ground')
    || (kind === 'tractor' && roadDistance(site) > 180 && !state.industry.roads.some(road => roadGap(road, site) < 180))
    || distance(site, HOUSE) < 130
    || plots.some(plot => site.x > plot.x - 65 && site.x < plot.x + plot.width + 65
      && site.y > plot.y - 65 && site.y < plot.y + plot.height + 65)
    || [...industryStations(state), ...state.trade.stalls].some(other => distance(site, other) < 120)
    || (kind !== 'mine' && coalSite(site))) return null;
  return { x: site.x, y: site.y };
}

function notify(state, text, symbol) {
  state.notice = { text, symbol, at: state.time, serial: state.nextId++ };
}

export function canCraft(state, shop, key) {
  if (!shop || shop.kind !== 'workshop' || shop.batch || !Object.hasOwn(RECIPES, key)) return false;
  const recipe = RECIPES[key];
  return shop.level >= recipe.level && Object.entries(recipe.needs).every(([item, qty]) =>
    stockCount(state, item) + (shop.inputs[item] ?? 0) >= qty);
}
function startBatch(state, shop, key, method) {
  if (!canCraft(state, shop, key) || (method === 'factory' && !stockCount(state, 'fuel'))) return false;
  const recipe = RECIPES[key];
  for (const [item, qty] of Object.entries(recipe.needs)) {
    const local = Math.min(qty, shop.inputs[item] ?? 0);
    shop.inputs[item] = (shop.inputs[item] ?? 0) - local;
    adjustStock(state, item, local - qty);
  }
  if (method === 'factory') adjustStock(state, 'fuel', -1);
  const speed = (method === 'factory' ? 2 : method === 'worker' ? 1.18 : 1) *
    (state.upgrades.includes('batchCraft') ? 1.25 : 1) * (state.upgrades.includes('packingLine') ? 1.25 : 1);
  shop.batch = { key, method, until: state.time + recipe.ms / speed };
  return true;
}

export const industryActions = {
  unlockProduction(state) {
    if (!state.trade.permit || state.industry.unlocked || state.trade.coins < PRODUCTION_PRICE) return false;
    state.trade.coins -= PRODUCTION_PRICE;
    state.industry.unlocked = true;
    state.industry.wheatSeeds += 4;
    state.guide = { key: 'production', serial: state.nextId++, text: 'Поставь мастерскую и выбери рецепт. Ёжик сможет готовить по этому рецепту. На ферме теперь можно посадить пшеницу. Для топлива ищи месторождения в северных горах.' };
    return true;
  },
  buildIndustry(state, { kind, point }, { plots }) {
    if (!state.trade.permit || (!state.industry.unlocked && kind !== 'house')) return false;
    const location = buildingSite(state, kind, point, plots);
    if (!location) return false;
    const price = buildingPrice(state, kind);
    if (state.trade.coins < price) return false;
    state.trade.coins -= price;
    const group = state.industry[buildingGroups[kind]];
    const site = { ...location, id: `${kind}:${state.nextId++}`, kind, number: group.length + 1 };
    if (kind === 'workshop') Object.assign(site, { level: 1, recipe: 'slices', automatic: true, batch: null, inputs: {}, output: {} });
    if (kind === 'mine') Object.assign(site, { fuel: 0, coal: 0 });
    if (kind === 'tractor') site.trip = null;
    group.push(site);
    notify(state, `${BUILDINGS[kind].label} готов к работе.`, BUILDINGS[kind].icon);
    return true;
  },
  upgradeWorkshop(state, { id }) {
    const shop = industrySite(state, id);
    if (shop?.kind !== 'workshop' || shop.level >= 3) return false;
    const price = upgradeWorkshopPrice(shop);
    if (state.trade.coins < price) return false;
    state.trade.coins -= price;
    shop.level++;
    if (shop.level === 3) {
      for (const worker of state.workers.filter(worker => worker.siteId === id && worker.workRole === 'maker')) {
        worker.siteId = null;
        worker.workRole = 'auto';
      }
    }
    notify(state, shop.level === 3 ? 'Фабрика работает на топливе.' : 'Открыты новые рецепты.', 'table');
    return true;
  },
  chooseRecipe(state, { id, key }) {
    const shop = industrySite(state, id);
    if (shop?.kind !== 'workshop' || !Object.hasOwn(RECIPES, key) || RECIPES[key].level > shop.level || shop.recipe === key) return false;
    shop.recipe = key;
    return true;
  },
  toggleWorkshop(state, { id }) {
    const shop = industrySite(state, id);
    if (shop?.kind !== 'workshop') return false;
    shop.automatic = shop.automatic === false;
    return true;
  },
  craft(state, { id, key }) {
    return startBatch(state, industrySite(state, id), key, 'manual');
  },
  buyJars(state, { amount = 8 }) {
    if (!state.industry.unlocked || ![4, 8, 20].includes(amount) || state.trade.coins < amount * JAR_PRICE) return false;
    state.trade.coins -= amount * JAR_PRICE;
    adjustStock(state, 'jars', amount);
    notify(state, `Банки на складе +${amount}.`, 'jar');
    return true;
  },
  buyWheatSeed(state) {
    if (!state.industry.unlocked || !state.trade.berryFarm || state.trade.coins < 35) return false;
    state.trade.coins -= 35;
    state.industry.wheatSeeds++;
    return true;
  },
  takeIndustryStock(state, { id }) {
    const site = industrySite(state, id);
    if (site?.kind === 'mine' && site.fuel) {
      adjustStock(state, 'fuel', site.fuel);
      site.fuel = 0;
      return true;
    }
    if (site?.kind !== 'workshop') return false;
    const output = Object.entries(site.output).filter(([, qty]) => qty > 0);
    if (!output.length) return false;
    for (const [item, qty] of output) adjustStock(state, item, qty);
    site.output = {};
    return true;
  },
  makeFuel(state, { id }) {
    const mine = industrySite(state, id);
    if (mine?.kind !== 'mine' || mine.fuel >= 18 || mine.refineAt || mine.mineAt) return false;
    mine.mineAt = state.time + 7500;
    return true;
  },
  buildRoad(state, { from, to }) {
    if (!state.industry.unlocked || !onMap(from) || !onMap(to)) return false;
    const length = distance(from, to);
    if (length < 60 || length > 800 || !canWalkStraight(from, to)) return false;
    const cost = Math.ceil(ROAD_PRICE * length / 480);
    if (state.trade.coins < cost || state.industry.roads.some(road => roadGap(road, from) < 12 && roadGap(road, to) < 12)) return false;
    state.trade.coins -= cost;
    state.industry.roads.push({ id: state.nextId++, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, level: 1 });
    return true;
  },
  upgradeRoad(state, { id }) {
    const road = state.industry.roads.find(item => item.id === id);
    if (!state.industry.unlocked || !road || road.level > 1) return false;
    const cost = Math.ceil(1.75 * ROAD_PRICE * distance(road.from, road.to) / 480);
    if (state.trade.coins < cost) return false;
    state.trade.coins -= cost;
    road.level = 2;
    return true;
  },
  paveRoad(state, { point }) {
    if (!state.industry.unlocked || !onMap(point) || roadDistance(point) > 40) return false;
    const segment = closestRoadSegment(point);
    if (!segment) return false;
    const { from, to } = segment;
    const length = distance(from, to);
    const vx = (to.x - from.x) / length, vy = (to.y - from.y) / length;
    const t = Math.max(0, Math.min(length, (point.x - from.x) * vx + (point.y - from.y) * vy));
    const start = Math.max(0, t - 125), end = Math.min(length, t + 125);
    const a = { x: from.x + start * vx, y: from.y + start * vy };
    const b = { x: from.x + end * vx, y: from.y + end * vy };
    if (!industryActions.buildRoad(state, { from: a, to: b })) return false;
    return industryActions.upgradeRoad(state, { id: state.industry.roads.at(-1).id });
  },
};

export const incomingGoods = (state, id, key) => (state.industry?.tractors ?? []).reduce((n, { trip }) =>
  n + (trip?.to === id && trip.item === key ? trip.amount : 0), 0);
function budget(state, store, key) {
  return store.id ? (store.inputs[key] ?? 0) + incomingGoods(state, store.id, key) : stockCount(state, key);
}

function chooseDelivery(state, tractor) {
  const options = [];
  const trailer = state.upgrades.includes('roadFreight');
  const cargoLimit = trailer ? 64 : 48;
  const platforms = [HOUSE, ...state.industry.houses];
  const home = nearestHome(state, tractor);
  const offer = (from, to, amount, priority, item, source, destination) => {
    if (amount > 0) options.push({ from, toPoint: to, item, source, to: destination, amount, priority });
  };
  for (const orchard of state.orchards) {
    if (orchard.ready.length) offer(orchard.basket, nearestHome(state, orchard.basket), Math.min(trailer ? 4 : 3, orchard.ready.length), 1, 'basket', orchard.id, 'house');
  }
  for (const mine of state.industry.mines) offer(mine, nearestHome(state, mine), mine.fuel, stockCount(state, 'fuel') < 3 ? 3 : 2, 'fuel', mine.id, 'house');
  for (const shop of state.industry.workshops) {
    for (const [item, qty] of Object.entries(shop.output)) offer(shop, nearestHome(state, shop), Math.min(qty, cargoLimit), 2, item, shop.id, 'house');
    if (shop.automatic === false) continue;
    for (const [item, qty] of Object.entries(RECIPES[shop.recipe].needs)) {
      const need = Math.max(0, qty * 2 - budget(state, shop, item));
      offer(home, shop, Math.min(stockCount(state, item), need), 2, item, 'house', shop.id);
    }
  }
  for (const stall of state.trade.stalls) {
    const order = stall.customers.find(customer => customer.phase === 'queue')?.order;
    const capacity = 240 + stall.levels.shelves * 100 - Object.values(stall.stock).reduce((sum, qty) => sum + qty, 0)
      - state.jobs.reduce((sum, job) => sum + (job.stallId === stall.id ? job.cargo?.amount ?? 0 : 0), 0)
      - state.industry.tractors.reduce((sum, item) => sum + (item.trip?.to === `stall:${stall.id}` ? item.trip.amount : 0), 0);
    if (!order?.accepted) continue;
    for (const item of ['apples', 'berries', ...PRODUCED_GOODS]) {
      const viaWorkers = state.jobs.reduce((sum, job) => sum + (job.stallId === stall.id && job.cargo?.key === item ? job.cargo.amount : 0), 0);
      const amount = (order[item] ?? 0) - (stall.stock[item] ?? 0) - viaWorkers - incomingGoods(state, `stall:${stall.id}`, item);
      const warehouse = Math.max(0, stockCount(state, item) - (item === 'apples' ? stall.reserve : 0));
      const load = Math.min(cargoLimit, amount, warehouse, capacity);
      offer(platforms.reduce((a, b) => distance(b, tractor) + distance(b, stall) < distance(a, tractor) + distance(a, stall) ? b : a), stall,
        load, 5, item, 'house', `stall:${stall.id}`);
      for (const shop of state.industry.workshops) {
        offer(shop, stall, Math.min(cargoLimit, amount, shop.output[item] ?? 0, capacity), 5, item, shop.id, `stall:${stall.id}`);
      }
    }
  }
  const efficiency = (trip, cost) => trip.priority * (trip.item === 'basket' ? trip.amount * 10 : trip.amount + 8) / (180 + cost);
  const estimate = trip => (distance(tractor, trip.from) + distance(trip.from, trip.toPoint)) / 1.85;
  let best = null;
  let score = 0;
  for (const trip of options.sort((a, b) => efficiency(b, estimate(b)) - efficiency(a, estimate(a)))) {
    if (efficiency(trip, estimate(trip)) <= score) break;
    const empty = findRoute(tractor, trip.from, state.industry.roads);
    const full = empty && findRoute(trip.from, trip.toPoint, state.industry.roads);
    if (!full) continue;
    const value = efficiency(trip, empty.cost + full.cost);
    if (value <= score) continue;
    best = { item: trip.item, amount: trip.amount, source: trip.source, to: trip.to, from: { x: trip.from.x, y: trip.from.y }, toPoint: { x: trip.toPoint.x, y: trip.toPoint.y },
      route: routeTo(tractor, trip.from, empty), loadedRoute: routeTo(trip.from, trip.toPoint, full) };
    score = value;
  }
  return best;
}

function loadTractor(state, trip) {
  if (trip.item === 'basket') {
    const orchard = state.orchards.find(item => item.id === trip.source);
    if (!orchard) return false;
    trip.baskets = [];
    while (trip.baskets.length < trip.amount && orchard.ready.length) trip.baskets.push(takeReady(orchard));
    trip.amount = trip.baskets.length;
    return trip.amount > 0;
  }
  const source = industrySite(state, trip.source);
  if (trip.source === 'house') {
    const stall = state.trade.stalls.find(stall => `stall:${stall.id}` === trip.to);
    const reserve = trip.item === 'apples' ? stall?.reserve ?? 0 : 0;
    trip.amount = Math.min(trip.amount, Math.max(0, stockCount(state, trip.item) - reserve));
    adjustStock(state, trip.item, -trip.amount);
  } else if (source?.kind === 'mine') {
    trip.amount = Math.min(trip.amount, source.fuel);
    source.fuel -= trip.amount;
  } else if (source?.kind === 'workshop') {
    trip.amount = Math.min(trip.amount, source.output[trip.item] ?? 0);
    source.output[trip.item] = (source.output[trip.item] ?? 0) - trip.amount;
  } else return false;
  return trip.amount > 0;
}

function unloadTractor(state, trip, deposit, worker) {
  if (trip.baskets) {
    for (const cargo of trip.baskets) deposit(state, cargo, trip.source, worker);
    return;
  }
  const shop = state.industry.workshops.find(shop => shop.id === trip.to);
  const stall = state.trade.stalls.find(stall => `stall:${stall.id}` === trip.to);
  if (shop) shop.inputs[trip.item] = (shop.inputs[trip.item] ?? 0) + trip.amount;
  else if (stall) stall.stock[trip.item] = (stall.stock[trip.item] ?? 0) + trip.amount;
  else adjustStock(state, trip.item, trip.amount);
}

function workerAt(state, site, worker, seconds) {
  if (distance(worker, site) <= 1) {
    delete worker.industryRoute;
    return true;
  }
  const route = worker.industryRoute;
  if (!route || route.x !== site.x || route.y !== site.y) worker.industryRoute = routeTo(worker, site, undefined, state.industry.roads);
  if (!worker.industryRoute) return false;
  worker.stamina = Math.max(0, worker.stamina - seconds * .3);
  return followRoute(worker, worker.industryRoute, 85 + worker.stats.speed * 6, seconds, state.industry.roads);
}

export function advanceIndustry(state, seconds, deposit) {
  if (!state.industry.unlocked) return;
  const available = (role, site) => state.workers.find(worker => worker.siteId === site && worker.workRole === role
    && !state.jobs.some(job => job.workers.includes(worker.id)) && worker.sleepUntil === null && worker.stamina > 0);
  for (const shop of state.industry.workshops) {
    if (shop.batch?.until <= state.time) {
      const { key, method } = shop.batch;
      const amount = RECIPES[key].amount + (state.upgrades.includes('largerBatches') ? 1 : 0);
      if (method === 'manual') adjustStock(state, key, amount);
      else shop.output[key] = (shop.output[key] ?? 0) + amount;
      if (GOODS[key].value && !state.industry.knownProducts.includes(key)) state.industry.knownProducts.push(key);
      if (method === 'manual') notify(state, `${GOODS[key].label} +${amount}.`, GOODS[key].icon);
      state.xpProgress += amount * 2;
      shop.batch = null;
    }
    const buyer = available('buyer', shop.id);
    const jarsNeeded = RECIPES[shop.recipe].needs.jars ?? 0;
    if (buyer && jarsNeeded && stockCount(state, 'jars') + (shop.inputs.jars ?? 0) < jarsNeeded
      && state.trade.coins >= 8 * JAR_PRICE && workerAt(state, nearestHome(state, shop), buyer, seconds)) {
      industryActions.buyJars(state, {});
      buyer.stamina = Math.max(0, buyer.stamina - 5);
    }
    const maker = available('maker', shop.id);
    const waiting = Object.values(shop.output).reduce((sum, qty) => sum + qty, 0);
    const pickup = state.industry.tractors.some(({ trip }) => trip?.source === shop.id);
    if (maker && waiting && !pickup && (maker.industryDropoff || waiting >= 16 || !canCraft(state, shop, shop.recipe))) {
      maker.industryDropoff = true;
      if (workerAt(state, nearestHome(state, shop), maker, seconds)) {
        industryActions.takeIndustryStock(state, { id: shop.id });
        maker.industryDropoff = false;
      }
      continue;
    }
    if (maker) maker.industryDropoff = false;
    if (shop.batch || waiting >= 48 || shop.automatic === false) continue;
    if (shop.level === 3) startBatch(state, shop, shop.recipe, 'factory');
    else if (maker && workerAt(state, shop, maker, seconds) && startBatch(state, shop, shop.recipe, 'worker')) {
      maker.stamina = Math.max(0, maker.stamina - RECIPES[shop.recipe].ms / 1000);
    }
  }
  for (const mine of state.industry.mines) {
    const miner = available('miner', mine.id);
    if (mine.mineAt && mine.mineAt <= state.time) {
      mine.mineAt = null;
      mine.coal += 3;
      mine.refineAt = state.time + (state.upgrades.includes('coalKiln') ? 3000 : 4500);
    }
    if (mine.refineAt && mine.refineAt <= state.time) {
      mine.coal -= 3;
      mine.fuel += state.upgrades.includes('efficientFuel') ? 4 : 3;
      mine.refineAt = null;
    }
    if (miner && mine.fuel && (mine.fuel >= 6 || stockCount(state, 'fuel') < 2) && !mine.refineAt && !mine.mineAt
      && !state.industry.tractors.some(({ trip }) => trip?.source === mine.id)) {
      if (workerAt(state, nearestHome(state, mine), miner, seconds)) industryActions.takeIndustryStock(state, { id: mine.id });
    } else if (miner && !mine.refineAt && !mine.mineAt && workerAt(state, mine, miner, seconds)) {
      industryActions.makeFuel(state, { id: mine.id });
      miner.stamina = Math.max(0, miner.stamina - 6);
    }
  }
  for (const tractor of state.industry.tractors) {
    const driver = available('driver', tractor.id);
    if (!tractor.trip) {
      if (!driver || !stockCount(state, 'fuel') || tractor.retryAt > state.time || !workerAt(state, tractor, driver, seconds)) continue;
      const trip = chooseDelivery(state, tractor);
      if (!trip) {
        tractor.retryAt = state.time + 2000;
        continue;
      }
      adjustStock(state, 'fuel', -1);
      tractor.trip = { ...trip, driverId: driver.id };
    }
    const trip = tractor.trip;
    const targetStall = state.trade.stalls.find(stall => `stall:${stall.id}` === trip.to);
    if (trip.to.startsWith('stall:') && !targetStall) {
      const home = nearestHome(state, tractor);
      trip.to = 'house';
      trip.toPoint = { x: home.x, y: home.y };
    } else if (targetStall) trip.toPoint = { x: targetStall.x, y: targetStall.y };
    const sourcePlot = state.orchards.find(orchard => orchard.id === trip.source);
    if (sourcePlot) trip.from = { ...sourcePlot.basket };
    const target = trip.loaded ? trip.toPoint : trip.from;
    if (trip.route.x !== target.x || trip.route.y !== target.y) {
      const route = routeTo(tractor, target, undefined, state.industry.roads);
      if (!route) {
        if (trip.loaded) unloadTractor(state, { ...trip, to: 'house' }, deposit);
        tractor.trip = null;
        continue;
      }
      trip.route = route;
    }
    const rider = state.workers.find(worker => worker.id === trip.driverId);
    const arrived = followRoute(tractor, trip.route, state.upgrades.includes('tractorGears') ? 385 : 310, seconds, state.industry.roads);
    if (rider) Object.assign(rider, { x: tractor.x, y: tractor.y, left: tractor.left });
    if (!arrived) continue;
    if (!trip.loaded && loadTractor(state, trip)) {
      trip.loaded = true;
      trip.route = trip.loadedRoute;
      continue;
    }
    if (trip.loaded) {
      unloadTractor(state, trip, deposit, rider);
      state.industry.deliveries++;
      if (rider) rider.stamina = Math.max(0, rider.stamina - 5);
    }
    tractor.trip = null;
  }
}

const validPoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const validQty = qty => Number.isSafeInteger(qty) && qty >= 0;
const validStock = stock => stock && !Array.isArray(stock) && typeof stock === 'object'
  && Object.entries(stock).every(([key, qty]) => Object.hasOwn(GOODS, key) && validQty(qty));

export function validIndustry(industry) {
  return typeof industry.unlocked === 'boolean' && validQty(industry.wheatSeeds) && validQty(industry.deliveries)
    && validStock(industry.stock) && Array.isArray(industry.knownProducts)
    && industry.knownProducts.every(key => PRODUCED_GOODS.includes(key))
    && Object.entries(buildingGroups).every(([kind, group]) => Array.isArray(industry[group]) && industry[group].every(site => validPoint(site)
      && typeof site.id === 'string' && site.kind === kind && validQty(site.number)))
    && industry.workshops.every(shop => [1, 2, 3].includes(shop.level) && Object.hasOwn(RECIPES, shop.recipe)
      && validStock(shop.inputs) && validStock(shop.output) && (!shop.batch
        || Object.hasOwn(RECIPES, shop.batch.key) && Number.isFinite(shop.batch.until)))
    && industry.mines.every(mine => validQty(mine.fuel) && validQty(mine.coal))
    && industry.tractors.every(tractor => !tractor.trip || (validPoint(tractor.trip.from) && validPoint(tractor.trip.toPoint)
      && typeof tractor.trip.to === 'string' && validQty(tractor.trip.amount)
      && ['basket', ...Object.keys(GOODS)].includes(tractor.trip.item)
      && [tractor.trip.route, tractor.trip.loadedRoute].every(route => route?.points?.every(validPoint) && validQty(route.index))))
    && Array.isArray(industry.roads) && industry.roads.every(road => validPoint(road.from) && validPoint(road.to) && [1, 2].includes(road.level));
}
