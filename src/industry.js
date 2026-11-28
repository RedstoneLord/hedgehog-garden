import { incomingStallGoods, shelfRoom } from './market-storage.js';
import { canImproveFactoryBatch, freightPerkBonus, movementPerks, perkEffect, uniqueWork } from './perks.js';
import { depositScientist, SCIENTIST_GOODS, SCIENTIST_TARGET, scientistDemand, scientistStall } from './commission.js';
import { fuelCapacity, hasResearch, researchSite, researchSites } from './research.js';
import { HOUSE, skilledWorkRate, takeReady } from './orchard.js';
import { canWalkStraight, closestRoadSegment, distance, findRoute, findFreightRoute, followRoute, roadGap, routeTo } from './routes.js';
import { roadDistance, terrainKind, WORLD } from './terrain.js';

export const PRODUCTION_PRICE = 10_000;
export const JAR_PRICE = 14;
export const ROAD_PRICE = 350;
export const BUILDINGS = {
  workshop: { label: 'Мастерская', icon: 'table', price: 1800, growth: 1.65 },
  mine: { label: 'Угольная шахта', icon: 'coal', price: 2900, growth: 1.65 },
  tractor: { label: 'Красный трактор', icon: 'fastBasket', price: 3600, growth: 1.7 },
  house: { label: 'Дом для ёжиков', icon: 'bed', price: 1800, growth: 1.45 },
  warehouse: { label: 'Склад', icon: 'storage', price: 1200, growth: 1.45 },
};
export const COAL_SITES = [
  { x: 1710, y: -812 }, { x: 2700, y: -1000 }, { x: 3990, y: -968 }, { x: 4890, y: -770 },
];
export const GOODS = {
  apples: { label: 'Яблоки', icon: 'apple' }, berries: { label: 'Ягоды', icon: 'berry' },
  wheat: { label: 'Пшеница', icon: 'wheat' }, flour: { label: 'Мука', icon: 'flour' },
  biofuel: { label: 'Биотопливо', icon: 'biofuel' },
  coal: { label: 'Уголь', icon: 'coal' }, provisions: { label: 'Дорожный паёк', icon: 'bread' },
  jars: { label: 'Банки', icon: 'jar' }, fuel: { label: 'Топливо', icon: 'fuel' },
  slices: { label: 'Яблочные дольки', icon: 'slices', value: 7 },
  compote: { label: 'Яблочный компот', icon: 'compote', value: 9 },
  puree: { label: 'Ягодное пюре', icon: 'puree', value: 10 },
  bread: { label: 'Хлеб', icon: 'bread', value: 13 },
  pie: { label: 'Яблочный пирог', icon: 'pie', value: 19 },
  jam: { label: 'Ягодное варенье', icon: 'jam', value: 19 },
  mixedJam: { label: 'Яблочно-ягодное варенье', icon: 'mixedJam', value: 23 },
  berryCompote: { label: 'Ягодный компот', icon: 'compote', value: 11 },
};
export const PRODUCED_GOODS = Object.keys(GOODS).filter(key => GOODS[key].value);
export const RECIPES = {
  biofuel: { needs:{ apples:16, berries:12 }, amount:6, ms:7200, level:1 },
  fuel: { needs: { coal: 3 }, amount: 4, ms: 4500, level: 1 },
  provisions: { needs: { apples: 8, berries: 6 }, amount: 3, ms: 5500, level: 1 },
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
export const INDUSTRY_ROLES = ['maker', 'buyer', 'miner', 'driver', 'porter', 'researcher', 'operator'];
const buildingGroups = { workshop: 'workshops', mine: 'mines', house: 'houses', warehouse: 'warehouses', tractor: 'tractors' };

export function newIndustry() {
  return { unlocked: false, wheatSeeds: 0, stock: {}, houses: [], warehouses: [], workshops: [], mines: [], tractors: [], roads: [],
    knownProducts: [], knownGoods: [], deliveries: 0, logisticsVersion: 1, priority: {}, paused: {} };
}
export const housingCapacity = state => 10 + 5 * state.industry.houses.length;
export const buildingPrice = (state, kind) => {
  const item = BUILDINGS[kind];
  return Math.ceil(item.price * item.growth ** state.industry[buildingGroups[kind]].length);
};
export const upgradeWorkshopPrice = shop => shop.level === 1 ? 2300 : 5100;
export const stockCount = (state, key) => key === 'apples' ? state.apples
  : key === 'berries' ? state.trade.berries : state.industry?.stock[key] ?? 0;
const localStorageSites = state => [...state.industry.houses, ...(state.industry.warehouses ?? [])];
export const housesFor = state => [HOUSE, ...state.industry.houses];
export const homesFor = state => [HOUSE, ...localStorageSites(state)];
export const isStockSite = site => site?.kind === 'house' || site?.kind === 'warehouse';
export const storageLabel = site => site.kind === 'warehouse' ? `Склад ${site.number}` : site.id ? `Дом ${site.number}` : 'Первый дом';
export const homeId = home => home?.id ?? 'house';
export function homeStock(state, home, key) {
  if (home?.id) return home.stock?.[key] ?? 0;
  return Math.max(0, stockCount(state, key) - localStorageSites(state).reduce((sum, site) => sum + (site.stock?.[key] ?? 0), 0));
}
export function rememberGood(state, key) {
  if (key === 'apples' || !Object.hasOwn(GOODS, key)) return;
  const known = state.industry.knownGoods ??= [];
  if (!known.includes(key)) known.push(key);
}

export function discoveredGoods(state) {
  const known = new Set(['apples', ...(state.industry.knownGoods ?? []), ...state.industry.knownProducts]);
  if (state.trade.berryKnown || state.trade.berryFarm) known.add('berries');
  if (state.industry.unlocked) known.add('jars');
  if (state.industry.unlocked && state.trade.berryFarm) known.add('wheat');
  if (state.industry.mines.length) known.add('coal');
  if (hasResearch(state, 'biofuel')) known.add('biofuel');

  const storage = [...state.industry.workshops.flatMap(site => [site.inputs, site.output]),
    ...state.trade.stalls.map(stall => stall.stock), ...researchSites(state).map(site => site.stock), state.scientist?.bank, state.scientist?.intake];
  if (state.industry.mines.some(mine => mine.fuel > 0) || state.industry.tractors.some(tractor => tractor.tank > 0)) known.add('fuel');
  return Object.keys(GOODS).filter(key => known.has(key) || stockCount(state, key) > 0 || storage.some(stock => (stock?.[key] ?? 0) > 0));
}

export function adjustStock(state, key, amount, home) {
  if (!amount) return;
  if (amount > 0 || stockCount(state, key) > 0) rememberGood(state, key);
  if (home?.id) {
    home.stock ??= {};
    home.stock[key] = (home.stock[key] ?? 0) + amount;
  } else if (home === undefined && amount < -homeStock(state, HOUSE, key)) {
    let remaining = -amount - homeStock(state, HOUSE, key);
    for (const site of localStorageSites(state)) {
      const debit = Math.min(remaining, homeStock(state, site, key));
      if (!debit) continue;
      site.stock[key] -= debit;
      remaining -= debit;
    }
  }
  if (key === 'apples') state.apples += amount;
  else if (key === 'berries') state.trade.berries += amount;
  else state.industry.stock[key] = stockCount(state, key) + amount;
}

export function nearestHome(state, point, key, reserve = 0, housingOnly = false) {
  const candidates = housingOnly ? housesFor(state) : homesFor(state);
  if (candidates.length === 1 && !key) return HOUSE;
  const homes = candidates.filter(home => !key || homeStock(state, home, key) > (home.id ? 0 : reserve))
    .sort((a, b) => distance(point, a) - distance(point, b));
  return homes.find(home => canWalkStraight(point, home) || findRoute(point, home, state.industry.roads)) ?? (key ? null : HOUSE);
}

export const STATION_UPGRADES = {
  speed: { label: 'Быстрая работа', cost: 750 },
  yield: { label: 'Крупная партия', cost: 1100 },
  buffer: { label: 'Большой склад', cost: 950 },
  efficiency: { label: 'Экономная топка', cost: 1800 },
};
const tuning = (site, key) => site.improvements?.[key] ?? 0;
export const stationCapacity = (site,state) => 48 + 32 * tuning(site, 'buffer') + (state && hasResearch(state,'modular') ? 32 : 0);
export const stationUpgradePrice = (site, key) => STATION_UPGRADES[key].cost * (1 + tuning(site, key));
export const factoryReady = shop => shop.level === 2 && ['speed','yield','buffer'].every(key => tuning(shop, key) > 0);

export function migrateLogistics(state) {
  const { industry } = state;
  for (const home of localStorageSites(state)) home.stock ??= {};
  for (const key of Object.keys(GOODS)) {
    if (localStorageSites(state).reduce((sum, home) => sum + (home.stock[key] ?? 0), 0) > stockCount(state, key)) return false;
  }
  if (industry.logisticsVersion === 1) return true;
  for (const mine of industry.mines) mine.refineAt = null;
  industry.logisticsVersion = 1;
  return true;
}

export function industryStations(state) {
  return [...state.industry.workshops, ...state.industry.mines, ...state.industry.tractors, ...localStorageSites(state)];
}
export function industryWorkplaces(state) {
  return industryStations(state).filter(site => !isStockSite(site)).map((site) => ({
    ...site, industryId: site.id, icon: BUILDINGS[site.kind].icon,
    label: site.level === 3 ? `Фабрика ${site.number}` : `${BUILDINGS[site.kind].label} ${site.number}`,
    roles: site.kind === 'workshop' ? ['maker', 'buyer', 'porter']
      : site.kind === 'mine' ? ['miner', 'porter'] : ['driver'],
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

const baseBatchAmount = (state, shop, key) => RECIPES[key].amount + tuning(shop, 'yield')
  + Number(state.upgrades.includes('largerBatches')) + Number(key === 'fuel' && state.upgrades.includes('efficientFuel'));
const outputRoom = (state, shop) => stationCapacity(shop,state) - Object.values(shop.output).reduce((sum, qty) => sum + qty, 0);

export function canCraft(state, shop, key, manual = false) {
  if (!shop || shop.kind !== 'workshop' || shop.batch || !Object.hasOwn(RECIPES, key) || key === 'biofuel' && !hasResearch(state,key)) return false;
  const recipe = RECIPES[key];
  return shop.level >= recipe.level && baseBatchAmount(state,shop,key) <= outputRoom(state,shop)
    && Object.entries(recipe.needs).every(([item, qty]) => {
      const missing = qty - (shop.inputs[item] ?? 0);
      const home = manual && missing > 0 && nearestHome(state, shop, item);
      const stored = home ? homeStock(state, home, item) : 0;
      return missing <= stored;
    });
}
function startBatch(state, shop, key, method, worker) {
  const manual = method === 'manual';
  const needsFuel = method === 'factory' && !shop.electric && key !== 'fuel'
    && (!tuning(shop, 'efficiency') || !shop.fuelCoast);
  if (!canCraft(state, shop, key, manual) || method === 'factory' && shop.electric && !shop.power || (needsFuel && !shop.inputs.fuel)) return false;
  const recipe = RECIPES[key];
  for (const [item, qty] of Object.entries(recipe.needs)) {
    const local = Math.min(qty, shop.inputs[item] ?? 0);
    if (local > 0) rememberGood(state, item);
    shop.inputs[item] = (shop.inputs[item] ?? 0) - local;
    if (local < qty) adjustStock(state, item, local - qty, nearestHome(state, shop, item));
  }
  if (needsFuel) {
    rememberGood(state, 'fuel');
    shop.inputs.fuel--;
  }
  if (method === 'factory' && key !== 'fuel') shop.fuelCoast = needsFuel;
  const speed = (method === 'factory' ? 2 : method === 'worker' ? 1.18 : 1) *
    (1 + .25 * tuning(shop, 'speed')) * (method === 'factory' && hasResearch(state,'factoryEfficiency') ? 1.15 : 1) * (state.upgrades.includes('batchCraft') ? 1.25 : 1) *
    (state.upgrades.includes('packingLine') ? 1.25 : 1) * (state.upgrades.includes('furnaceCrew') ? 1.15 : 1) * (key === 'fuel' && state.upgrades.includes('coalKiln') ? 1.5 : 1);
  const amount = Math.min(outputRoom(state,shop), baseBatchAmount(state,shop,key) + perkEffect(worker,'batch'));
  if (manual) state.industry.firstManualBatch = true;
  shop.batch = { key, method, amount, until: state.time + recipe.ms * perkEffect(worker,'craft',1) / (speed * skilledWorkRate(worker,'dexterity',.018)) };
  if (worker) shop.batch.workerId = worker.id;
  return true;
}

const baseCoal = mine => 6 + 2 * tuning(mine,'yield');
const canMine = (state,mine) => mine?.kind === 'mine' && !mine.mineAt && mine.coal + baseCoal(mine) <= stationCapacity(mine,state);
function startMining(state,mine,worker) {
  if (!canMine(state,mine)) return false;
  mine.mineAt = state.time + 7500 * perkEffect(worker,'mine',1) / ((1 + .25 * tuning(mine,'speed')) * skilledWorkRate(worker,'strength',.018));
  // Keep the miner's bonus if they rest, change job, or reload before the cycle ends.
  mine.pendingCoal = Math.min(stationCapacity(mine,state) - mine.coal, baseCoal(mine) + perkEffect(worker,'coal'));
  if (worker) mine.minerId = worker.id;
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
    if (isStockSite(site)) site.stock = {};
    if (kind === 'mine') Object.assign(site, { fuel: 0, coal: 0 });
    if (kind === 'tractor') site.trip = null;
    group.push(site);
    notify(state, `${BUILDINGS[kind].label} готов к работе.`, BUILDINGS[kind].icon);
    return true;
  },
  upgradeWorkshop(state, { id }) {
    const shop = industrySite(state, id);
    if (shop?.kind !== 'workshop' || shop.level >= 3 || (shop.level === 2 && !factoryReady(shop))) return false;
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
  upgradeStation(state, { id, key }) {
    const site = industrySite(state, id);
    if (!site || !['mine','workshop'].includes(site.kind) || !Object.hasOwn(STATION_UPGRADES, key)
      || (key === 'efficiency' && site.level !== 3) || tuning(site, key) >= (site.level === 3 && key !== 'efficiency' ? 2 : 1)) return false;
    const cost = stationUpgradePrice(site, key);
    if (state.trade.coins < cost) return false;
    state.trade.coins -= cost;
    site.improvements ??= {};
    site.improvements[key] = tuning(site, key) + 1;
    return true;
  },
  setFreight(state, { id, priority, paused }) {
    if (id !== 'house' && !industrySite(state, id) && !state.trade.stalls.some(stall => `stall:${stall.id}` === id)) return false;
    if ([1, 2, 3].includes(priority)) state.industry.priority[id] = priority;
    else if (typeof paused === 'boolean') state.industry.paused[id] = paused;
    else return false;
    return true;
  },
  useProvisions(state) {
    if (!stockCount(state, 'provisions')) return false;
    const crew = state.workers.filter(worker => worker.sleepUntil === null && worker.stamina < 35);
    if (!crew.length) return false;
    adjustStock(state, 'provisions', -1);
    for (const worker of crew) worker.stamina = Math.min(45, worker.stamina + 15);
    notify(state, 'Паёк восстановил силы уставшей команды.', 'bread');
    return true;
  },
  chooseRecipe(state, { id, key }) {
    const shop = industrySite(state, id);
    if (shop?.kind !== 'workshop' || !Object.hasOwn(RECIPES, key) || RECIPES[key].level > shop.level || shop.recipe === key || key === 'biofuel' && !hasResearch(state,key)) return false;
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
    if (!site || !['mine','workshop'].includes(site.kind)) return false;
    const home = nearestHome(state, site);
    let room = 24;
    const output = site.kind === 'mine' ? site : site.output;
    for (const item of site.kind === 'mine' ? ['fuel','coal'] : Object.keys(output)) {
      const reserved = state.industry.tractors.reduce((sum, { trip }) => sum
        + (trip?.source === id && trip.item === item && !trip.loaded ? trip.amount : 0), 0);
      const amount = Math.min(room, Math.max(0, (output[item] ?? 0) - reserved));
      if (!amount) continue;
      adjustStock(state, item, amount, home);
      output[item] -= amount;
      room -= amount;
    }
    if (room < 24 && site.kind === 'workshop') state.industry.firstWorkshopDelivery = true;
    return room < 24;
  },
  mineCoal(state, { id }) {
    return startMining(state,industrySite(state,id));
  },
  makeFuel(state, fields) {
    return industryActions.mineCoal(state, fields);
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
  n + (trip?.item === key ? (trip.to === id ? trip.amount - (trip.nextDrop?.amount ?? 0) : 0)
    + (trip.nextDrop?.to === id ? trip.nextDrop.amount : 0) : 0), 0);
function budget(state, store, key) {
  return (store.inputs[key] ?? 0) + incomingGoods(state, store.id, key)
    + state.workers.reduce((sum, { industryCargo }) => sum + (industryCargo?.siteId === store.id && industryCargo.item === key ? industryCargo.amount : 0), 0);
}

function chooseDelivery(state, tractor) {
  const options = [];
  const trailer = state.upgrades.includes('roadFreight');
  const cargoLimit = (trailer ? 64 : 48) + (state.upgrades.includes('freightHub') ? 16 : 0) + (hasResearch(state,'freight') ? 10 : 0);
  const platforms = homesFor(state);
  const limitFor = item => cargoLimit + (item === 'fuel' && state.upgrades.includes('fuelCrates') ? 4 : 0);

  const offer = (from, to, amount, priority, item, source, destination) => {
    if (amount > 0 && !state.industry.paused[source] && !state.industry.paused[destination]
      && !state.industry.tractors.some(({ trip }) => trip?.source === source && trip.item === item && !trip.loaded)) {
      options.push({ from, toPoint: to, item, source, to: destination, amount: Math.min(limitFor(item), amount), priority: priority * (state.industry.priority[destination] ?? 1) });
    }
  };
  const meeting = state.scientist?.stage === 'accepted' && scientistStall(state);
  if (meeting) for (const item of Object.keys(SCIENTIST_GOODS)) {
    const need = scientistDemand(state,item);
    if (!need) continue;
    for (const home of platforms) offer(home, meeting, Math.min(homeStock(state,home,item), need), 6, item, homeId(home), SCIENTIST_TARGET);
    for (const shop of state.industry.workshops) offer(shop, meeting, Math.min(shop.output[item] ?? 0, need), 6, item, shop.id, SCIENTIST_TARGET);
    if (item === 'coal' || item === 'fuel') for (const mine of state.industry.mines) offer(mine, meeting, Math.min(mine[item], need), 6, item, mine.id, SCIENTIST_TARGET);
  }
  for (const generator of researchSites(state).filter(site => site.kind === 'generator')) {
    const key = generator.fuel;
    const need = fuelCapacity(state) - (generator.stock[key] ?? 0) - incomingGoods(state,generator.id,key);
    if (need <= 0) continue;
    for (const home of platforms) offer(home, generator, Math.min(homeStock(state,home,key),need), 5, key, homeId(home),generator.id);
    for (const shop of state.industry.workshops) offer(shop, generator, Math.min(shop.output[key] ?? 0,need),5,key,shop.id,generator.id);
    if (key === 'coal') for (const mine of state.industry.mines) offer(mine,generator,Math.min(mine.coal,need),5,key,mine.id,generator.id);
  }
  for (const orchard of state.orchards) {
    if (orchard.ready.length && !state.jobs.some(job => job.orchardId === orchard.id && job.kind === 'delivery' && ['toBasket', 'load'].includes(job.phase))) {
      offer(orchard.basket, nearestHome(state, orchard.basket), Math.min(trailer ? 4 : 3, orchard.ready.length), 1, 'basket', orchard.id, homeId(nearestHome(state, orchard.basket)));
    }
  }
  for (const mine of state.industry.mines) {
    if (mine.fuel >= 3) offer(mine, HOUSE, mine.fuel, 2, 'fuel', mine.id, 'house');
    if (mine.coal >= 6) offer(mine, nearestHome(state, mine), mine.coal, 2, 'coal', mine.id, homeId(nearestHome(state, mine)));
  }
  for (const shop of state.industry.workshops) {
    for (const [item, qty] of Object.entries(shop.output)) {
      if (qty >= 8 || shop.automatic === false || ['fuel','provisions'].includes(item)) {
        const home = nearestHome(state, shop);
        offer(shop, home, qty, 2, item, shop.id, homeId(home));
      }
    }
    if (shop.automatic === false) continue;
    const inputs = { ...RECIPES[shop.recipe].needs };
    if (shop.level === 3 && !shop.electric && shop.recipe !== 'fuel') inputs.fuel = 2;
    for (const [item, qty] of Object.entries(inputs)) {
      const need = Math.max(0, qty * 2 - budget(state, shop, item));
      for (const home of platforms) offer(home, shop, Math.min(homeStock(state, home, item), need), 3, item, homeId(home), shop.id);
      for (const other of state.industry.workshops) {
        if (other !== shop) offer(other, shop, Math.min(other.output[item] ?? 0, need), 4, item, other.id, shop.id);
      }
      if (item === 'coal') for (const mine of state.industry.mines) offer(mine, shop, Math.min(mine.coal, need), 4, item, mine.id, shop.id);
    }
  }
  for (const stall of state.trade.stalls) {
    const order = stall.customers.find(customer => customer.phase === 'queue')?.order;
    if (!order?.accepted) continue;
    for (const item of ['apples', 'berries', ...PRODUCED_GOODS]) {
      const capacity = shelfRoom(state, stall, item);
      const amount = (order[item] ?? 0) - (stall.stock[item] ?? 0) - incomingStallGoods(state, stall, item);
      for (const house of platforms) {
        const warehouse = Math.max(0, homeStock(state, house, item) - (item === 'apples' && !house.id ? stall.reserve : 0));
        offer(house, stall, Math.min(amount, warehouse, capacity), 5, item, homeId(house), `stall:${stall.id}`);
      }
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
    const empty = findFreightRoute(tractor, trip.from, state.industry.roads);
    const full = empty && findFreightRoute(trip.from, trip.toPoint, state.industry.roads);
    if (!full) continue;
    const value = efficiency(trip, empty.cost + full.cost);
    if (value <= score) continue;
    best = { item: trip.item, amount: trip.amount, source: trip.source, to: trip.to, from: { x: trip.from.x, y: trip.from.y }, toPoint: { x: trip.toPoint.x, y: trip.toPoint.y },
      route: routeTo(tractor, trip.from, empty), loadedRoute: routeTo(trip.from, trip.toPoint, full) };
    score = value;
  }
  if (best && best.item !== 'basket' && !best.to.startsWith('house')) {
    const source = industrySite(state, best.source);
    const stock = source?.kind === 'workshop' ? source.output[best.item] ?? 0
      : source?.kind === 'mine' ? source[best.item] : homeStock(state, source ?? HOUSE, best.item);
    const space = Math.min(stock, limitFor(best.item)) - best.amount;
    if (space <= 0) return best;
    for (const other of options) {
      if (other.source !== best.source || other.item !== best.item || other.to === best.to || other.to.startsWith('house')
        || distance(best.toPoint, other.toPoint) > 650 || other.to.startsWith('stall:') && best.item === 'apples') continue;
      if (!findFreightRoute(best.toPoint, other.toPoint, state.industry.roads)) continue;
      const amount = Math.min(space, other.amount);
      best.nextDrop = { to: other.to, toPoint: { x: other.toPoint.x, y: other.toPoint.y }, amount };
      best.amount += amount;
      break;
    }
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
  const firstAmount = trip.amount - (trip.nextDrop?.amount ?? 0);
  const source = industrySite(state, trip.source);
  if (trip.source === 'house' || isStockSite(source)) {
    const stall = state.trade.stalls.find(stall => `stall:${stall.id}` === trip.to);
    const reserve = trip.item === 'apples' && !source ? stall?.reserve ?? 0 : 0;
    trip.amount = Math.min(trip.amount, Math.max(0, homeStock(state, source ?? HOUSE, trip.item) - reserve));
    adjustStock(state, trip.item, -trip.amount, source ?? HOUSE);
  } else if (source?.kind === 'mine') {
    trip.amount = Math.min(trip.amount, source[trip.item] ?? 0);
    source[trip.item] -= trip.amount;
  } else if (source?.kind === 'workshop') {
    trip.amount = Math.min(trip.amount, source.output[trip.item] ?? 0);
    source.output[trip.item] = (source.output[trip.item] ?? 0) - trip.amount;
  } else return false;
  if (trip.nextDrop) {
    trip.nextDrop.amount = Math.max(0, trip.amount - firstAmount);
    if (!trip.nextDrop.amount) delete trip.nextDrop;
  }
  return trip.amount > 0;
}

function unloadTractor(state, trip, deposit, worker) {
  if (industrySite(state, trip.source)?.kind === 'workshop') state.industry.firstWorkshopDelivery = true;
  if (trip.baskets) {
    for (const cargo of trip.baskets) deposit(state, cargo, trip.source, worker, homesFor(state).find(home => homeId(home) === trip.to) ?? (trip.toPoint && nearestHome(state, trip.toPoint)) ?? HOUSE);
    return;
  }
  const shop = state.industry.workshops.find(shop => shop.id === trip.to);
  const stall = state.trade.stalls.find(stall => `stall:${stall.id}` === trip.to);
  const generator = researchSite(state,trip.to);
  if (trip.to === SCIENTIST_TARGET) depositScientist(state,trip.item,trip.amount,worker ?? trip.toPoint);
  else if (generator?.kind === 'generator') {
    const accepted = Math.min(trip.amount,Math.max(0,fuelCapacity(state) - (generator.stock[trip.item] ?? 0)));
    generator.stock[trip.item] = (generator.stock[trip.item] ?? 0) + accepted;
    if (accepted < trip.amount) adjustStock(state,trip.item,trip.amount - accepted,nearestHome(state,generator));
  }
  else if (shop) shop.inputs[trip.item] = (shop.inputs[trip.item] ?? 0) + trip.amount;
  else if (stall) {
    const accepted = Math.min(trip.amount, shelfRoom(state, stall, trip.item, false));
    if (accepted) stall.stock[trip.item] = (stall.stock[trip.item] ?? 0) + accepted;
    if (trip.amount > accepted) adjustStock(state, trip.item, trip.amount - accepted, nearestHome(state, stall));
  }
  else adjustStock(state, trip.item, trip.amount, homesFor(state).find(home => homeId(home) === trip.to) ?? HOUSE);
}

function workerAt(state, site, worker, seconds, plan = (actor, target) => routeTo(actor, target, undefined, state.industry.roads)) {
  if (distance(worker, site) <= 1) {
    delete worker.industryRoute;
    return true;
  }
  const route = worker.industryRoute;
  if (!route || route.x !== site.x || route.y !== site.y) worker.industryRoute = plan(worker, site);
  if (!worker.industryRoute) return false;
  worker.stamina = Math.max(0, worker.stamina - seconds * .3);
  return followRoute(worker, worker.industryRoute, (115 + (worker.stats.speed - 5) * 7) * movementPerks(state,worker), seconds, state.industry.roads);
}

const porterCapacity = (state,worker) => Math.max(1,12 + Math.floor(worker.stats.strength * 2.25) + freightPerkBonus(worker)
  + (state.upgrades.includes('houseDispatch') ? 4 : 0));

function movePorter(state, site, worker, seconds, walk) {
  const cargo = worker.industryCargo;
  if (cargo) {
    if (cargo.siteId && cargo.siteId === site.id) {
      if (walk(site, worker, seconds)) {
        site.inputs[cargo.item] = (site.inputs[cargo.item] ?? 0) + cargo.amount;
        delete worker.industryCargo;
        uniqueWork(state,worker,'restock');
      }
      return;
    }
    const home = homesFor(state).find(item => homeId(item) === cargo.homeId) ?? HOUSE;
    if (walk(home, worker, seconds)) {
      adjustStock(state, cargo.item, cargo.amount, home);
      if (site.kind === 'workshop') state.industry.firstWorkshopDelivery = true;
      delete worker.industryCargo;
      uniqueWork(state,worker,'restock');
    }
    return;
  }
  if (state.industry.paused[site.id]) return;
  const stock = site.kind === 'mine' ? { coal: site.coal, fuel: site.fuel } : site.output;
  const item = Object.keys(stock).find(key => stock[key] > 0 && !state.industry.tractors.some(({ trip }) => trip?.source === site.id && trip.item === key && !trip.loaded));
  if (item && walk(site, worker, seconds)) {
    const output = site.kind === 'mine' ? site : site.output;
    const amount = Math.min(output[item], porterCapacity(state,worker));
    output[item] -= amount;
    worker.industryCargo = { item, amount, homeId: homeId(nearestHome(state, site)) };
    return;
  }
  if (site.kind !== 'workshop' || item || site.automatic === false) return;
  const needs = { ...RECIPES[site.recipe].needs };
  if (site.level === 3 && !site.electric && site.recipe !== 'fuel') needs.fuel = 2;
  for (const [key, qty] of Object.entries(needs)) {
    const need = qty * 2 - budget(state, site, key);
    if (need <= 0) continue;
    const home = nearestHome(state, site, key);
    if (!home) continue;
    if (walk(home, worker, seconds)) {
      const amount = Math.min(need, homeStock(state, home, key), porterCapacity(state,worker));
      adjustStock(state, key, -amount, home);
      worker.industryCargo = { item: key, amount, siteId: site.id };
    }
    break;
  }
}

export function advanceIndustry(state, seconds, deposit, plan) {
  if (!state.industry.unlocked) return;
  const walk = (site, worker, elapsed) => workerAt(state, site, worker, elapsed, plan);
  const available = (role, site) => state.workers.find(worker => worker.siteId === site && worker.workRole === role
    && !state.jobs.some(job => job.workers.includes(worker.id)) && !worker.stayAt && !worker.pairing
    && (!worker.retirePending && !worker.pendingAssignment || worker.industryCargo || worker.fuelCan) && worker.sleepUntil === null && worker.stamina > 0);
  for (const shop of state.industry.workshops) {
    if (shop.electric && shop.batch?.method === 'factory') shop.batch.until += 1000 * seconds * (1 - (shop.power ?? 0));
    if (shop.batch?.until <= state.time) {
      const { key, method } = shop.batch;
      const amount = shop.batch.amount ?? RECIPES[key].amount + Number(state.upgrades.includes('largerBatches'));
      shop.output[key] = (shop.output[key] ?? 0) + amount;
      rememberGood(state, key);
      if (GOODS[key].value && !state.industry.knownProducts.includes(key)) state.industry.knownProducts.push(key);
      if (method === 'manual') notify(state, `${GOODS[key].label} +${amount}.`, GOODS[key].icon);
      state.xpProgress += amount * 2;
      const maker = state.workers.find(worker => worker.id === shop.batch.workerId);
      uniqueWork(state,maker,'maker');
      shop.batch = null;
    }
    const buyer = available('buyer', shop.id);
    const jarsNeeded = RECIPES[shop.recipe].needs.jars ?? 0;
    if (buyer && jarsNeeded && stockCount(state, 'jars') + (shop.inputs.jars ?? 0) < jarsNeeded
      && state.trade.coins >= Math.ceil(8 * JAR_PRICE * perkEffect(buyer,'buy',1)) && walk(nearestHome(state, shop), buyer, seconds)) {
      const home = nearestHome(state, shop);
      state.trade.coins -= Math.ceil(8 * JAR_PRICE * perkEffect(buyer,'buy',1));
      uniqueWork(state,buyer,'buyer');
      adjustStock(state, 'jars', 8, home);
      buyer.stamina = Math.max(0, buyer.stamina - 5);
    }
    const maker = available('maker', shop.id);
    const porter = available('porter', shop.id);
    if (porter) movePorter(state, shop, porter, seconds, walk);
    if (shop.automatic === false) continue;
    if (shop.level === 3) {
      const helper = maker && canImproveFactoryBatch(maker) && walk(shop,maker,seconds) ? maker : undefined;
      if (!shop.batch && startBatch(state,shop,shop.recipe,'factory',helper) && helper) {
        helper.stamina = Math.max(0,helper.stamina - RECIPES[shop.recipe].ms / 2500);
      }
    } else if (!shop.batch && maker && walk(shop,maker,seconds) && startBatch(state,shop,shop.recipe,'worker',maker)) {
      maker.stamina = Math.max(0,maker.stamina - RECIPES[shop.recipe].ms / 1000);
    }
  }
  for (const mine of state.industry.mines) {
    const miner = available('miner', mine.id);
    if (mine.mineAt && mine.mineAt <= state.time) {
      const starter = state.workers.find(worker => worker.id === mine.minerId);
      mine.coal += mine.pendingCoal ?? baseCoal(mine);
      rememberGood(state, 'coal');
      mine.mineAt = null;
      delete mine.pendingCoal;
      delete mine.minerId;
      uniqueWork(state,starter,'miner');
    }
    const porter = available('porter', mine.id);
    if (porter) movePorter(state, mine, porter, seconds, walk);
    if (miner && canMine(state,mine) && walk(mine,miner,seconds) && startMining(state,mine,miner)) {
      miner.stamina = Math.max(0, miner.stamina - 6);
    }
  }
  for (const tractor of state.industry.tractors) {
    const driver = available('driver', tractor.id);
    if (!tractor.trip) {
      if (!driver || state.industry.paused[tractor.id] || tractor.retryAt > state.time) continue;
      if (!tractor.tank && !driver.fuelCan && distance(driver, tractor) > 1 && !driver.refueling) {
        if (!walk(tractor, driver, seconds)) continue;
      }
      if (!tractor.tank && !driver.fuelCan) {
        const home = nearestHome(state, tractor, 'fuel');
        if (!home) continue;
        driver.refueling = true;
        if (!walk(home, driver, seconds)) continue;
        driver.fuelCan = Math.min(4 + perkEffect(driver,'refuel'), homeStock(state, home, 'fuel'));
        adjustStock(state, 'fuel', -driver.fuelCan, home);
        delete driver.refueling;
      }
      if (!walk(tractor, driver, seconds)) continue;
      if (driver.fuelCan) {
        tractor.tank = (tractor.tank ?? 0) + driver.fuelCan;
        delete driver.fuelCan;
      }
      if (driver.retirePending || driver.pendingAssignment) continue;
      const trip = chooseDelivery(state, tractor);
      if (!trip) {
        tractor.retryAt = state.time + 2000;
        continue;
      }
      tractor.tank--;
      tractor.trip = { ...trip, driverId: driver.id };
    }
    const trip = tractor.trip;
    const targetStall = trip.to === SCIENTIST_TARGET ? scientistStall(state)
      : state.trade.stalls.find(stall => `stall:${stall.id}` === trip.to);
    if ((trip.to.startsWith('stall:') || trip.to === SCIENTIST_TARGET) && !targetStall) {
      if (!trip.loaded) { tractor.trip = null; continue; }
      const home = nearestHome(state,tractor);
      trip.to = homeId(home);
      trip.toPoint = { x:home.x, y:home.y };
    } else if (targetStall) trip.toPoint = { x: targetStall.x, y: targetStall.y };
    const sourcePlot = state.orchards.find(orchard => orchard.id === trip.source);
    if (sourcePlot) trip.from = { ...sourcePlot.basket };
    const target = trip.loaded ? trip.toPoint : trip.from;
    if (trip.route.x !== target.x || trip.route.y !== target.y) {
      const planned = findFreightRoute(tractor, target, state.industry.roads);
      const route = planned && routeTo(tractor, target, planned);
      if (!route) {
        if (trip.loaded) unloadTractor(state, { ...trip, to: 'house' }, deposit);
        tractor.trip = null;
        continue;
      }
      trip.route = route;
    }
    const rider = state.workers.find(worker => worker.id === trip.driverId);
    const arrived = followRoute(tractor, trip.route, (state.upgrades.includes('tractorGears') ? 385 : 310) * (rider ? perkEffect(rider,'drive',1) * skilledWorkRate(rider,'speed',.016) : 1), seconds, state.industry.roads);
    if (rider) Object.assign(rider, { x: tractor.x, y: tractor.y, left: tractor.left });
    if (!arrived) continue;
    if (!trip.loaded && loadTractor(state, trip)) {
      trip.loaded = true;
      const planned = findFreightRoute(tractor, trip.toPoint, state.industry.roads);
      if (planned) trip.route = routeTo(tractor, trip.toPoint, planned);
      else {
        unloadTractor(state, { ...trip, to: 'house' }, deposit);
        tractor.trip = null;
      }
      continue;
    }
    if (trip.loaded) {
      const next = trip.nextDrop;
      unloadTractor(state, next ? { ...trip, amount: trip.amount - next.amount } : trip, deposit, rider);
      state.industry.deliveries++;
      if (next) {
        Object.assign(trip, next);
        delete trip.nextDrop;
        continue;
      }
      if (rider) { rider.stamina = Math.max(0, rider.stamina - 5); uniqueWork(state,rider,'driver'); }
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
    && validStock(industry.stock) && industry.priority && typeof industry.priority === 'object'
    && !Array.isArray(industry.priority) && Object.values(industry.priority).every(value => [1, 2, 3].includes(value))
    && industry.paused && typeof industry.paused === 'object' && !Array.isArray(industry.paused)
    && Object.values(industry.paused).every(value => typeof value === 'boolean') && Array.isArray(industry.knownProducts)
    && industry.knownProducts.every(key => PRODUCED_GOODS.includes(key))
    && Array.isArray(industry.knownGoods) && industry.knownGoods.every(key => Object.hasOwn(GOODS, key))
    && Object.entries(buildingGroups).every(([kind, group]) => Array.isArray(industry[group]) && industry[group].every(site => validPoint(site)
      && typeof site.id === 'string' && site.kind === kind && validQty(site.number) && (!isStockSite(site) || site.stock === undefined || validStock(site.stock))))
    && industry.workshops.every(shop => [1, 2, 3].includes(shop.level) && Object.hasOwn(RECIPES, shop.recipe)
      && validStock(shop.inputs) && validStock(shop.output) && (!shop.batch
        || Object.hasOwn(RECIPES, shop.batch.key) && Number.isFinite(shop.batch.until)))
    && industry.mines.every(mine => validQty(mine.fuel) && validQty(mine.coal)
      && (mine.pendingCoal === undefined || validQty(mine.pendingCoal) && Number.isFinite(mine.mineAt))
      && (mine.minerId === undefined || typeof mine.minerId === 'string'))
    && industry.tractors.every(tractor => !tractor.trip || (validPoint(tractor.trip.from) && validPoint(tractor.trip.toPoint)
      && typeof tractor.trip.to === 'string' && validQty(tractor.trip.amount)
      && (!tractor.trip.nextDrop || typeof tractor.trip.nextDrop.to === 'string' && validPoint(tractor.trip.nextDrop.toPoint)
        && validQty(tractor.trip.nextDrop.amount) && tractor.trip.nextDrop.amount <= tractor.trip.amount)
      && ['basket', ...Object.keys(GOODS)].includes(tractor.trip.item)
      && [tractor.trip.route, tractor.trip.loadedRoute].every(route => route?.points?.every(validPoint) && validQty(route.index))))
    && Array.isArray(industry.roads) && industry.roads.every(road => validPoint(road.from) && validPoint(road.to) && [1, 2].includes(road.level));
}
