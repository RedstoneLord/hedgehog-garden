import { perkEffect, rollPerk } from './perks.js';
export { PERKS } from './perks.js';
import { FOREST_CLEARING, OLD_MAP_OFFSET, terrainKind, WORLD } from './terrain.js';
import { canWalkStraight, distance, findGardenRoute, findRoute, followRoute, routeTo } from './routes.js';
import {
  basketLimit, berryBounds, BERRY_ORCHARD, DEFAULT_STATS, EAST_BASKET, EAST_ORCHARD, EAST_PLOT, FOREST_BASKET, FOREST_ORCHARD, fruitValue, GARDEN_RATES, HOUSE, makeOrchard,
  isBerryOrchard, isFieldCrop, isPurchasedGarden, orchardById, orchardName, preserveCarriedFruit, SHOP, shopLevel, shopPrice, spaceForFruit, SPRINKLER_LIMIT, SPRINKLER_RADIUS, sprinklerPrice,
  stageFruit, START_ORCHARD, takeReady, VARIETIES, WORK_ROLES,
} from './orchard.js';

import { advanceCustomers, canServe, frontCustomer, globalUpgradeBonus, migrateMarketProgress, migrateTradeSites, moveTradeJob, newTrade, PERMIT_PRICE, scheduleCommission, scheduleTrade, startCropGrowth, TRADE_ROLES, tradeActions } from './trade.js';

import { adjustStock, advanceIndustry, GOODS, housingCapacity, INDUSTRY_ROLES, industryActions, industrySite, industryWorkplaces, migrateLogistics, nearestHome, newIndustry, validIndustry } from './industry.js';
import { soilRate } from './siting.js';

export { WORLD };
const moveToNewMap = ({ x, y, ...item }) => ({ ...item, x: x + OLD_MAP_OFFSET.x, y: y + OLD_MAP_OFFSET.y });
export const PLOTS = [
  { x: 870, y: 563, width: 595, height: 360 },
  { x: 807, y: 514, width: 742, height: 454 },
  { x: 739, y: 458, width: 888, height: 558 },
].map(moveToNewMap);
export const START_BASKET = moveToNewMap({ x: 938, y: 865 });
const OLD_SAVE = 'itmo-apple-orchard-v1';
const PREVIOUS_SAVE = 'itmo-apple-orchard-v2';
const ORCHARD_SAVE = 'itmo-apple-orchard-v3';
export const SAVE_KEY = 'itmo-apple-orchard-v4';
const MAP_VERSION = 3;
const PREVIOUS_FOREST_CLEARING = { x:4860, y:870, width:774, height:520 };
export const BALANCE = {
  mystery: 100, seed: 5, seedGrowth: 1.36, firstHire: 150, hireGrowth: 1.16, firstLevelXp: 16, levelXpGrowth: 1.8, perkChance: .06,
  crop: VARIETIES.red.yield, regrowth: VARIETIES.red.regrowth,
  stride: 106, favoriteBoost: 1.18, flowerBoost: 1.55, flowerDuration: 16000,
  talkCooldown: 33000, coOpDistance: 278, flowerCooldown: 90000, flowerJitter: 60000, productionWindow: 20000,
};
const originalUpgrades = {
  plot1: { name: 'Шире сад', desc: 'Расширяет границы сада у моста.', cost: 10, icon: 'plotWide' },
  plot2: { name: 'Большая поляна', desc: 'Ещё раз расширяет сад у моста.', cost: 30, icon: 'plotLarge', requires: 'plot1' },
  roots: { name: 'Защитная ограда', desc: 'Вокруг садов появляется ограда. Яблоки созревают за время на 25% меньше.', cost: 16, icon: 'fence', requires: 'plot1' },
  crop: { name: 'Плодородная почва', desc: 'Под яблонями появляются грядки. Каждое дерево даёт на два яблока больше за урожай.', cost: 24, icon: 'soil', requires: 'roots' },
  clearing: { name: 'Расчистка сада', desc: 'В лавке появится топор. С ним можно срубить яблоню и освободить место для посадки.', cost: 9, icon: 'axe', requires: 'plot1' },
  group1: { name: 'Дружная кучка', desc: 'Второй слот для помощника.', cost: 14, icon: 'group' },
  group2: { name: 'Свои ёжики', desc: 'Третий слот для помощника.', cost: 32, icon: 'groupThree', requires: 'group1' },
  pace: { name: 'Лёгкий шаг', desc: 'Все помощники ходят на 18% быстрее.', cost: 15, icon: 'track' },
  carry: { name: 'Ловкие лапки', desc: 'Все помощники берут на одно яблоко больше за поход.', cost: 25, icon: 'basket', requires: 'pace' },
  flower: { name: 'Долгая бодрость', desc: 'Цветок ускоряет ёжиков на десять секунд дольше.', cost: 12, icon: 'flowerClock' },
  paving: { name: 'Скорый рейс', desc: 'Ходьба с полной корзиной становится на 22% быстрее.', cost: 17, icon: 'fastBasket', requires: 'pace' },
  picking: { name: 'Спелые плоды', desc: 'Ёжики тратят на сбор яблок на 25% меньше времени.', cost: 14, icon: 'pickApple', requires: 'roots' },
  naps: { name: 'Мягкая подстилка', desc: 'У корзин появляются лежанки. Сон ёжиков становится на 35% короче.', cost: 13, icon: 'bed', requires: 'group1' },
  pantry: { name: 'Удобный склад', desc: 'Рядом с домом появляется склад. Разгрузка занимает на 35% меньше времени.', cost: 20, icon: 'storage', requires: 'carry' },
  grafting: { name: 'Садовая прививка', desc: 'Янтарные и лесные яблони дают по одному дополнительному плоду. На стволах появляются прививки.', cost: 28, icon: 'graft', requires: 'crop' },
  seedSatchel: { name: 'Мешочек семян', desc: 'Обычные саженцы стоят на 20% дешевле.', cost: 19, icon: 'seedSatchel', requires: 'clearing' },
  quickPacking: { name: 'Быстрые узлы', desc: 'Погрузка полных корзин в любом саду занимает на 20% меньше времени.', cost: 30, icon: 'table', requires: 'pantry' },
  tradeCrates: { name: 'Ящики для лавок', desc: 'Ёжик приносит в лавку до 12 дополнительных яблок или ягод за рейс.', cost: 34, icon: 'crate', requires: 'pantry' },
  longShift: { name: 'Долгая смена', desc: 'У всех ёжиков на 14 больше запаса сил.', cost: 26, icon: 'endurance', requires: 'naps' },
  group3: { name: 'Большая кучка', desc: 'Открывает четвёртое место в избранной кучке.', cost: 38, icon: 'groupFour', requires: 'group2' },
  keenScent: { name: 'Острый нюх', desc: 'Искатели замечают цветы на 45 шагов дальше.', cost: 18, icon: 'foraging', requires: 'flower' },
  berryBaskets: { name: 'Ягодное лукошко', desc: 'Каждый куст приносит на две ягоды больше.', cost: 44, icon: 'berry', requires: 'grafting', gate: 'berries' },
  farmWater: { name: 'Капельный полив', desc: 'Политые культуры созревают на 20% быстрее.', cost: 58, icon: 'water', requires: 'berryBaskets', gate: 'berries' },
  batchCraft: { name: 'Удобные формы', desc: 'Все рецепты готовятся на 25% быстрее.', cost: 65, icon: 'table', requires: 'quickPacking', gate: 'production' },
  largerBatches: { name: 'Полный противень', desc: 'Каждая партия даёт одну дополнительную порцию.', cost: 95, icon: 'pie', requires: 'batchCraft', gate: 'production' },
  efficientFuel: { name: 'Угольные брикеты', desc: 'Рецепт топлива даёт ещё одну единицу за партию.', cost: 72, icon: 'fuel', requires: 'pantry', gate: 'production' },
  tractorGears: { name: 'Тяговая передача', desc: 'Тракторы ездят на 24% быстрее.', cost: 108, icon: 'fastBasket', requires: 'efficientFuel', gate: 'production' },
  shiftPlanning: { name: 'Тёплый очаг', desc: 'Восстановление сил всех ёжиков занимает на 20% меньше времени.', cost: 62, icon: 'bed', requires: 'longShift' },
  marketLedger: { name: 'Книга заказов', desc: 'Все заказы приносят на 8% больше монет.', cost: 80, icon: 'coin', requires: 'tradeCrates' },
  flowerPower: { name: 'Душистый нектар', desc: 'Цветок даёт ещё 15 процентных пунктов к бонусу скорости.', cost: 24, icon: 'nectar', requires: 'keenScent' },
};

const revisedPrices = {
  plot2: 48, roots: 22, crop: 42, clearing: 14, group2: 54, carry: 40, paving: 31, picking: 32,
  naps: 24, pantry: 38, grafting: 66, seedSatchel: 35, quickPacking: 72, tradeCrates: 82,
  longShift: 51, group3: 110, keenScent: 30, flowerPower: 53, berryBaskets: 96, farmWater: 145,
  batchCraft: 152, largerBatches: 218, efficientFuel: 168, tractorGears: 242, shiftPlanning: 114, marketLedger: 170,
};

export const UPGRADES = {
  ...Object.fromEntries(Object.entries(originalUpgrades).map(([id, upgrade]) =>
    [id, { ...upgrade, cost: revisedPrices[id] ?? upgrade.cost }])),
  orchardStewards: { name: 'Сильные ветви', desc: 'Каждая яблоня даёт на два плода больше за урожай.', cost: 130, icon: 'apple', requires: 'grafting' },
  gardenCrew: { name: 'Проворные сборщики', desc: 'Ёжики собирают урожай на 20% быстрее.', cost: 98, icon: 'handling', requires: 'picking' },
  farmHarvest: { name: 'Щедрые грядки', desc: 'Кусты дают ещё две ягоды, а пшеница даёт ещё три зерна за урожай.', cost: 208, icon: 'wheat', requires: 'farmWater', gate: 'berries' },
  trailSatchels: { name: 'Дорожные сумы', desc: 'Снабженцы несут на 16 товаров больше за рейс.', cost: 148, icon: 'crate', requires: 'tradeCrates' },
  packingLine: { name: 'Поточная линия', desc: 'Все рецепты готовятся на 25% быстрее.', cost: 310, icon: 'table', requires: 'largerBatches', gate: 'production' },
  coalKiln: { name: 'Горячая печь', desc: 'Переработка угля в топливо занимает на треть меньше времени.', cost: 275, icon: 'fuel', requires: 'efficientFuel', gate: 'production' },
  roadFreight: { name: 'Вместительный прицеп', desc: 'Трактор везёт до 64 товаров или четырёх корзин за рейс.', cost: 350, icon: 'fastBasket', requires: 'tractorGears', gate: 'production' },
  heritageOrchard: { name: 'Сад у моста', desc: 'Деревья первого сада дают ещё три яблока.', cost: 185, icon: 'apple', requires: 'orchardStewards' },
  firstFarm: { name: 'Первые грядки', desc: 'Первый ягодник даёт ещё четыре ягоды с куста.', cost: 285, icon: 'berry', requires: 'farmHarvest', gate: 'berries' },
  freightHub: { name: 'Грузовой двор', desc: 'Трактор перевозит ещё 16 единиц товара за рейс.', cost: 475, icon: 'crate', requires: 'roadFreight', gate: 'production' },
  trustedStall: { name: 'Лавка с именем', desc: 'Заказы приносят ещё на 6% больше монет.', cost: 315, icon: 'market', requires: 'marketLedger' },
  orchardTeams: { name: 'Отлаженная смена', desc: 'Ёжики восстанавливаются ещё на 15% быстрее.', cost: 265, icon: 'bed', requires: 'shiftPlanning' },
  furnaceCrew: { name: 'Бригада у печи', desc: 'Партии на производстве готовятся на 15% быстрее.', cost: 430, icon: 'fuel', requires: 'packingLine', gate: 'production' },
  forestPockets: { name: 'Лесные запасы', desc: 'Искатель приносит на четыре дикие ягоды больше.', cost: 104, icon: 'berry', requires: 'keenScent', gate: 'berries' },
};

const commonNames = ['Клён', 'Шишка', 'Мята', 'Плюш', 'Тиша', 'Иголка', 'Рыжик', 'Орешек', 'Слива', 'Крош', 'Крапинка', 'Зёрнышко', 'Брусника', 'Веточка', 'Мох', 'Осока', 'Туман', 'Печенька', 'Папоротник', 'Жёлудь', 'Морошка', 'Хвостик'];
const rareNames = ['Луномох', 'Плюмберри', 'Ёжимир', 'Травосвет', 'Семёрка', 'Росинант', 'Пыльцебор', 'Снежегрив'];
export const GUIDE = { id: 'potato', name: 'Картошка', quills: 0, skin: 0, hat: null, pose: 0 };
export const HEDGE_NAME_LIMIT = 24;
export function hedgehogName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().normalize('NFC');
  return name && Array.from(name).length <= HEDGE_NAME_LIMIT && !/\p{Cc}/u.test(name) ? name : null;
}
const dialogue = [
  ['Пойдём вместе?', 'Я с тобой!'],
  ['Вон сколько яблок.', 'Унесём за раз!'],
  ['Я возьму крайние.', 'А я остальные.'],
];

export const plotIndex = state => state.upgrades.includes('plot2') ? 2 : Number(state.upgrades.includes('plot1'));
export function plotBounds(state, id = START_ORCHARD) {
  if (id === FOREST_ORCHARD) return FOREST_CLEARING;
  if (id === EAST_ORCHARD) return EAST_PLOT;
  if (isBerryOrchard(id)) return berryBounds(state, id);
  if (isPurchasedGarden(id)) return orchardById(state, id)?.plot;
  return PLOTS[plotIndex(state)];
}
export const orchardPlots = state => state.orchards.map(orchard => plotBounds(state, orchard.id));
export const constructionPlots = state => [
  PLOTS.at(-1), EAST_PLOT, FOREST_CLEARING, ...state.orchards.filter(({ id }) => isBerryOrchard(id) || isPurchasedGarden(id)).map(({ id }) => plotBounds(state, id)),
];
export const FOREST_WORKPLACE = 'wild';
export const stallWorkplace = id => `stall:${id}`;
const orchardRoles = ['auto', 'collect', 'haul'];
const marketRoles = ['restock', 'vendor'];

export function workplaces(state) {
  return [
    ...state.orchards.map(({ id }) => ({
      id, label: orchardName(id), icon: isBerryOrchard(id) ? 'berry' : 'seed', orchardId: id,
      roles: isBerryOrchard(id) ? [...orchardRoles, 'water'] : orchardRoles,
    })),
    { id: FOREST_WORKPLACE, label: 'Дикий лес', icon: 'flower', roles: state.trade.berryKnown ? ['scout', 'forage'] : ['scout'] },
    ...state.trade.stalls.map(({ id }, index) => ({
      id: stallWorkplace(id), label: `Лавка ${index + 1}`, icon: 'market', stallId: id, roles: marketRoles,
    })),
    ...industryWorkplaces(state),
  ];
}

export function workerWorkplace(worker) {
  if (INDUSTRY_ROLES.includes(worker.workRole)) return worker.siteId;
  if (marketRoles.includes(worker.workRole)) return stallWorkplace(worker.stallId);
  if (worker.workRole === 'scout' || worker.workRole === 'forage') return FOREST_WORKPLACE;
  return worker.orchardId;
}

export function workRoleLabel(place, role) {
  return isBerryOrchard(place) && role === 'collect' ? 'Собирать урожай' : WORK_ROLES[role];
}
export const groupCapacity = state => state.upgrades.includes('group3') ? 4 : state.upgrades.includes('group2') ? 3 : 1 + Number(state.upgrades.includes('group1'));
export const flowerActive = state => state.boostUntil > state.time;
export const potatoAvailable = state => !state.unlocked && state.apples >= BALANCE.mystery;
export const hirePrice = state => Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(BALANCE.firstHire * BALANCE.hireGrowth ** Math.max(0, state.workers.length - 1)));
export const seedPrice = state => Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(BALANCE.seed * BALANCE.seedGrowth ** state.seedPurchases * (state.upgrades.includes('seedSatchel') ? .8 : 1)));
export const nextLevelXp = level => BALANCE.firstLevelXp + Math.round((level - 1) * BALANCE.levelXpGrowth);
export const productionRate = state => state.deliveries.reduce((sum, event) => sum + event.amount, 0) / (BALANCE.productionWindow / 1000);
const treeYield = (state, variety, orchard) => variety === 'berry'
  ? VARIETIES.berry.yield + (berryBounds(state, orchard.id).rich ? 4 : 0) + (state.upgrades.includes('berryBaskets') ? 2 : 0) + (state.upgrades.includes('farmHarvest') ? 2 : 0) + (state.upgrades.includes('firstFarm') && state.orchards.find(item => isBerryOrchard(item.id))?.id === orchard.id ? 4 : 0)
  : variety === 'wheat' ? VARIETIES.wheat.yield + (state.upgrades.includes('farmHarvest') ? 3 : 0)
    : VARIETIES[variety].yield + (orchard.id === START_ORCHARD && state.upgrades.includes('heritageOrchard') ? 3 : 0) + (state.upgrades.includes('orchardStewards') ? 2 : 0) + (state.upgrades.includes('crop') ? 2 : 0) + orchard.compostLevel
  + Number(variety !== 'red' && state.upgrades.includes('grafting'))
  + (orchard.id === START_ORCHARD && variety === 'red' ? orchard.specialtyLevel * 2 : 0);
const growthRate = (orchard, tree) => {
  const water = orchard.sprinklers.some(sprinkler => distance(sprinkler, tree) <= SPRINKLER_RADIUS) ? orchard.irrigationLevel * GARDEN_RATES.water : 0;
  const specialty = orchard.id === EAST_ORCHARD && tree.variety === 'gold' ? orchard.specialtyLevel * GARDEN_RATES.amber : 0;
  return (1 + water) * (1 + specialty);
};
const regrowthTime = (state, tree) => {
  return VARIETIES[tree.variety].regrowth * (state.upgrades.includes('roots') ? .75 : 1)
    / growthRate(orchardById(state, tree.orchardId), tree) / (state.trade.orchardPerks[tree.orchardId]?.mulch ? 1.22 : 1);
};
const flowerDuration = state => BALANCE.flowerDuration + (state.upgrades.includes('flower') ? 10000 : 0);
const carryCapacity = (state, worker) => Math.max(1, 1 + Math.floor(worker.stats.strength / 3) + perkEffect(worker, 'carry') + Number(state.upgrades.includes('carry')));
const staminaLimit = (state, worker) => Math.max(12, Math.round((28 + worker.stats.endurance * 8 + perkEffect(worker, 'stamina') + (state.upgrades.includes('longShift') ? 14 : 0)) * perkEffect(worker, 'endurance', 1)));
const harvestTime = (state, workers, variety) => {
  const dexterity = Math.max(...workers.map(worker => worker.stats.dexterity));
  const tools = variety === 'berry' ? 0 : globalUpgradeBonus(state, 'tools');
  return 2200 * Math.min(...workers.map(worker => perkEffect(worker, 'harvest', 1))) * (state.upgrades.includes('picking') ? .75 : 1) * (state.upgrades.includes('gardenCrew') ? .8 : 1) / ((1 + dexterity * .095) * (1 + tools));
};
const loadingTime = worker => 1800 / (1 + worker.stats.handling * .075);
const basketSpeed = (state, worker) => speed(state, worker) * Math.min(.98, .67 + worker.stats.strength * .027) * (state.upgrades.includes('paving') ? 1.22 : 1);

export function upgradeStatus(state, id) {
  const item = UPGRADES[id];
  if (state.upgrades.includes(id)) return 'done';
  if (!state.unlocked || (item.gate === 'berries' && !state.trade.berryKnown) || (item.gate === 'production' && !state.industry.unlocked) || (item.requires && !state.upgrades.includes(item.requires))) return 'locked';
  return state.xp >= item.cost ? 'ready' : 'pending';
}

export function visibleUpgrades(state) {
  return Object.keys(UPGRADES).filter(id => upgradeStatus(state, id) !== 'locked');
}

function previousLevel(state) {
  const spent = state.upgrades.reduce((points, id) => points + (originalUpgrades[id]?.cost ?? UPGRADES[id]?.cost ?? 0), 0);
  return 1 + state.xp + spent;
}

function random(state) {
  state.random = (Math.imul(state.random, 1664525) + 1013904223) >>> 0;
  return state.random / 4294967296;
}

const choose = (state, values) => values[Math.floor(random(state) * values.length)];
function generateWorker(state, orchard = state.orchards[0]) {
  const exoticName = random(state) < .06;
  const rareQuills = random(state) < .05;
  const rareSkin = random(state) < .045;
  const hasHat = random(state) < .045;
  const names = (exoticName ? rareNames : commonNames).filter(name => !state.workers.some(worker => worker.name === name));
  const baseName = choose(state, names.length ? names : commonNames);
  const name = state.workers.some(worker => worker.name === baseName) ? `${baseName} ${state.workers.length + 1}` : baseName;
  const worker = {
    id: `worker-${state.nextId++}`, name, ...orchard.basket, left: false,
    quills: rareQuills ? 5 + Math.floor(random(state) * 3) : Math.floor(random(state) * 5),
    skin: rareSkin ? 5 + Math.floor(random(state) * 3) : Math.floor(random(state) * 5),
    hat: hasHat ? choose(state, ['berry', 'leaf', 'acorn']) : null,
    pose: Math.floor(random(state) * 3),
    perk: random(state) < BALANCE.perkChance ? rollPerk(random(state) * 100, random(state)) : null,
    trips: 0, orchardId: orchard.id, workRole: 'auto', sleepUntil: null,
    stats: Object.fromEntries(Object.keys(DEFAULT_STATS).map(id => [id, 1 + Math.floor(random(state) * 5) + Math.floor(random(state) * 5)])),
  };
  worker.stamina = staminaLimit(state, worker);
  state.workers.push(worker);
  return worker;
}

function spawnFlower(state) {
  if (state.flowers.length) return false;
  for (let index = 0; index < 50; index++) {
    const x = WORLD.x + 190 + random(state) * (WORLD.width - 380);
    const y = WORLD.y + 225 + random(state) * (WORLD.height - 410);
    const plots = state.orchards ? orchardPlots(state) : [];
    if ([PLOTS.at(-1), EAST_PLOT, FOREST_CLEARING, ...plots].some(plot => inside(plot, { x, y }, -36)) || terrainKind({ x, y }) !== 'ground') continue;
    state.flowers.push({ id: state.nextId++, x, y, variant: Math.floor(random(state) * 3) });
    return true;
  }
  return false;
}

export function newGame(seed = Math.floor(Math.random() * 4294967296)) {
  const state = {
    version: 4, mapVersion: MAP_VERSION, basketCapacityVersion: 1, balanceVersion: 1, random: seed >>> 0, time: 0, nextId: 1, apples: 0, xp: 0, level: 1, xpProgress: 0, seeds: 1, seedPurchases: 0,
    trees: [], orchards: [makeOrchard(START_ORCHARD, START_BASKET)], unlocked: false, workers: [], favorites: [],
    upgrades: [], jobs: [], quote: null, lastTalk: null, flowerAt: 0, flowers: [], boostUntil: 0,
    deliveries: [], basketReceipt: null, notice: null, guide: null, firstDelivery: false, firstCoOp: false,
    goldSeeds: 0, goldDiscovered: false, eastDelivered: false, shelvesLevel: 0, forestSeeds: 0, trade: newTrade(), industry: newIndustry(),
  };
  spawnFlower(state);
  return state;
}

const inside = (rect, point, margin = 0) => Number.isFinite(point?.x) && Number.isFinite(point?.y)
  && point.x >= rect.x + margin && point.x <= rect.x + rect.width - margin
  && point.y >= rect.y + margin && point.y <= rect.y + rect.height - margin;
export const orchardAt = (state, point, margin = 0) => state.orchards.find(orchard => inside(plotBounds(state, orchard.id), point, margin));
const bedOffsets = [[-48, 35], [0, 57], [48, 35], [-53, -33], [0, -57], [53, -33], [-66, 2], [66, 2]];
export function orchardBeds(state, orchard) {
  if (!state.upgrades.includes('naps')) return [];
  const plot = plotBounds(state, orchard.id);
  return bedOffsets.map(([x, y]) => ({ x: x + orchard.basket.x, y: y + orchard.basket.y }))
    .filter(point => inside(plot, point, 15) && terrainKind(point) === 'ground'
      && state.trees.every(tree => Math.abs(tree.x - point.x) >= 36 || Math.abs(tree.y - point.y) >= 36 || distance(tree, point) >= 36)
      && orchard.sprinklers.every(sprinkler => distance(sprinkler, point) >= 29))
    .slice(0, 4);
}

export function canPlant(state, point, variety = 'red') {
  const orchard = orchardAt(state, point, 24);
  return Boolean(orchard && isFieldCrop(variety) === isBerryOrchard(orchard.id)
    && (variety !== 'forest' || orchard.id === FOREST_ORCHARD)
    && terrainKind(point) === 'ground' && distance(orchard.basket, point) >= 53 &&
    orchard.sprinklers.every(sprinkler => distance(sprinkler, point) >= 36) && state.trees.every(tree => distance(tree, point) >= 65));
}
export function canMoveBasket(state, point, orchardId = START_ORCHARD) {
  const orchard = orchardById(state, orchardId);
  return Boolean(orchard && inside(plotBounds(state, orchardId), point, 20) && terrainKind(point) !== 'river'
    && orchard.sprinklers.every(sprinkler => distance(sprinkler, point) >= 43)
    && state.trees.every(tree => distance(tree, point) >= 53));
}
export function canPlaceSprinkler(state, point, orchardId = START_ORCHARD, sprinklerId = null) {
  const orchard = orchardById(state, orchardId);
  return Boolean(orchard && !isBerryOrchard(orchard.id) && inside(plotBounds(state, orchardId), point, 20) && terrainKind(point) === 'ground'
    && (sprinklerId !== null || orchard.sprinklers.length < SPRINKLER_LIMIT)
    && distance(orchard.basket, point) >= 43 && state.trees.every(tree => distance(tree, point) >= 36)
    && orchard.sprinklers.every(sprinkler => sprinkler.id === sprinklerId || distance(sprinkler, point) >= 45));
}

const tractorCollecting = (state, orchardId) => state.industry.tractors.some(({ trip }) => trip?.source === orchardId && !trip.loaded);
export const canSendBasket = (state, orchard) => Boolean(orchard?.ready.length)
  && !state.jobs.some(job => job.kind === 'manual' || job.orchardId === orchard.id && job.kind === 'delivery' && job.phase === 'load')
  && !tractorCollecting(state, orchard.id);

function rescaleGrowth(state, orchard, oldRate) {
  for (const tree of state.trees) {
    if (tree.orchardId !== orchard.id || tree.fruit || tree.readyAt === null) continue;
    const remaining = Math.max(0, tree.readyAt - state.time);
    tree.readyAt = state.time + remaining * oldRate(tree) / growthRate(orchard, tree);
  }
}

function guide(state, text, key) {
  state.guide = { text, key, serial: state.nextId++ };
}

function notice(state, text, symbol = 'apple') {
  state.notice = { text, symbol, at: state.time, serial: state.nextId++ };
}

function earnLevels(state) {
  while (state.xpProgress >= nextLevelXp(state.level)) {
    state.xpProgress -= nextLevelXp(state.level);
    state.level += 1;
    state.xp += state.level < 9 ? 1 : 2 + Math.floor(Math.sqrt((state.level - 9) / 8));
  }
}

function deposit(state, cargo, orchardId, worker, home = HOUSE) {
  const amount = fruitValue(cargo);
  adjustStock(state, 'apples', amount, home);
  adjustStock(state, 'berries', cargo.berry ?? 0, home);
  adjustStock(state, 'wheat', cargo.wheat ?? 0, home);
  if (cargo.berry) notice(state, `Доставлено ягод +${cargo.berry}.`, 'berry');
  const alreadyReceived = state.basketReceipt?.at === state.time ? state.basketReceipt.amount : 0;
  const berries = (state.basketReceipt?.at === state.time ? state.basketReceipt.berries ?? 0 : 0) + (cargo.berry ?? 0);
  state.basketReceipt = { at: state.time, amount: alreadyReceived + amount, ...(berries ? { berries } : {}), id: state.nextId++ };
  state.xpProgress += state.trade.permit ? Math.ceil((amount + (cargo.berry ?? 0) + (cargo.wheat ?? 0)) * .72) : amount + (cargo.berry ?? 0) + (cargo.wheat ?? 0);
  earnLevels(state);
  if (worker) {
    state.deliveries.push({ amount, at: state.time });
    if (!state.firstDelivery) {
      state.firstDelivery = true;
      guide(state, 'Ёжики складывают яблоки в садовую корзину. Когда она полна, один везёт её к дому, пока остальные собирают следующую.', 'firstDelivery');
    }
  }
  if (!amount) return;
  const firstEast = orchardId === EAST_ORCHARD && !state.eastDelivered;
  if (firstEast) state.eastDelivered = true;
  if (firstEast || random(state) < .012 + (worker?.stats.foraging ?? 0) * .007) {
    state.goldSeeds += 1;
    if (!state.goldDiscovered) {
      state.goldDiscovered = true;
      notice(state, 'В корзине нашёлся янтарный саженец. Его плоды в доме стоят вдвое больше.', 'gold');
    } else notice(state, 'Найден янтарный саженец.', 'gold');
  }
}

function pick(state, tree, amount) {
  const taken = Math.min(amount, tree.fruit);
  tree.fruit -= taken;
  if (taken) tree.pulse = { at: state.time, id: state.nextId++ };
  if (!tree.fruit) tree.readyAt = isFieldCrop(tree.variety) ? null : state.time + regrowthTime(state, tree);
  return taken;
}

const waitingForOldPickup = (state, orchard) => state.jobs.some(job => job.kind === 'delivery' && job.orchardId === orchard.id
  && (job.phase === 'toBasket' || job.phase === 'load') && job.cargo);

function availableSpace(state, orchard, exclude) {
  if (waitingForOldPickup(state, orchard)) return 0;
  // Picked fruit already on the way to the basket takes up space too.
  const reserved = state.jobs.reduce((sum, job) => sum + (job !== exclude && job.kind === 'pick' && job.orchardId === orchard.id ? job.load : 0), 0);
  return Math.max(0, spaceForFruit(orchard) - reserved);
}

function stage(state, orchard, variety, amount) {
  const accepted = stageFruit(orchard, variety, amount);
  if (accepted) orchard.pulse = { id: state.nextId++, at: state.time, amount: accepted };
  return accepted;
}

function collectFlower(state, id, worker) {
  if (!state.flowers.some(flower => flower.id === id)) return false;
  state.flowers = state.flowers.filter(flower => flower.id !== id);
  state.boostUntil = state.time + flowerDuration(state);
  state.flowerAt = state.time + BALANCE.flowerCooldown + Math.floor(random(state) * BALANCE.flowerJitter);
  notice(state, worker ? `${worker.name} нашёл цветок бодрости. Ёжики ускорились.` : 'Цветок бодрости: ёжики ускорились.', 'flower');
  return true;
}

const actions = {
  dismissGuide(state, { serial }) {
    if (state.guide?.serial !== serial || !state.guide) return false;
    state.guide = null;
    return true;
  },
  plant(state, { point, variety = 'red' }) {
    if (!Object.hasOwn(VARIETIES, variety) || !canPlant(state, point, variety)) return false;
    const seed = { red: 'seeds', gold: 'goldSeeds', forest: 'forestSeeds', berry: 'berrySeeds', wheat: 'wheatSeeds' }[variety];
    const inventory = variety === 'wheat' ? state.industry : variety === 'berry' ? state.trade : state;
    if (!inventory[seed]) return false;
    inventory[seed] -= 1;
    const orchard = orchardAt(state, point, 24);
    state.trees.push({ id: state.nextId++, orchardId: orchard.id, variety, x: point.x, y: point.y, fruit: isFieldCrop(variety) ? 0 : treeYield(state, variety, orchard), readyAt: isFieldCrop(variety) ? null : 0 });
    notice(state, isFieldCrop(variety) ? 'Посевы готовы. Полей их, чтобы вырос урожай.' : `${VARIETIES[variety].label} посажена.`, variety === 'berry' ? 'berry' : 'seed');
    return true;
  },
  harvest(state, { id }) {
    const tree = state.trees.find(item => item.id === id);
    if (!tree?.fruit) return false;
    const orchard = orchardById(state, tree.orchardId);
    const space = availableSpace(state, orchard);
    if (!space) return false;
    const amount = pick(state, tree, space);
    stage(state, orchard, tree.variety, amount);
    notice(state, `В садовой корзине +${amount} ${isFieldCrop(tree.variety) ? VARIETIES[tree.variety].label.toLowerCase() : 'ябл.'}`, tree.variety === 'berry' ? 'berry' : 'apple');
    return true;
  },
  removeTree(state, { id }) {
    if (!state.upgrades.includes('clearing') || !state.trees.some(tree => tree.id === id)) return false;
    state.trees = state.trees.filter(tree => tree.id !== id);
    state.jobs = state.jobs.filter(job => job.kind !== 'pick' || job.tree !== id || job.phase === 'basket');
    notice(state, 'Яблоня срублена. Место свободно для посадки.', 'axe');
    return true;
  },
  sendBasket(state, { orchardId = START_ORCHARD }) {
    const orchard = orchardById(state, orchardId);
    if (!canSendBasket(state, orchard)) return false;
    const carrier = { ...orchard.basket, left: false };
    const home = nearestHome(state, carrier);
    const route = planGardenWalk(state, carrier, home);
    if (!route) return false;
    state.jobs = state.jobs.filter(job => job.kind !== 'delivery' || job.orchardId !== orchardId || job.phase !== 'toBasket');
    state.jobs.push({ id: state.nextId++, kind: 'manual', phase: 'haul', workers: [], orchardId, carrier, route, homeId: home.id ?? 'house', cargo: takeReady(orchard) });
    notice(state, 'Полная корзина отправлена к дому.', 'basket');
    return true;
  },
  unlock(state) {
    if (!potatoAvailable(state)) return false;
    adjustStock(state, 'apples', -BALANCE.mystery);
    state.unlocked = true;
    const friend = generateWorker(state);
    guide(state, `Я Картошка! Я привёл друга — ${friend.name}. Он соберёт яблоки и отнесёт полную корзину к дому.`, 'intro');
    return true;
  },
  buySeed(state) {
    const price = seedPrice(state);
    if (state.apples < price) return false;
    adjustStock(state, 'apples', -price);
    state.seeds += 1;
    state.seedPurchases += 1;
    return true;
  },
  buyForestSeed(state) {
    if (!orchardById(state, FOREST_ORCHARD) || state.apples < 85) return false;
    adjustStock(state, 'apples', -85);
    state.forestSeeds++;
    return true;
  },
  moveBasket(state, { point, orchardId = START_ORCHARD }) {
    const orchard = orchardById(state, orchardId);
    if (!orchard || !canMoveBasket(state, point, orchardId)) return false;
    orchard.basket = { x: point.x, y: point.y };
    notice(state, 'Корзина перенесена.', 'basket');
    return true;
  },
  placeSprinkler(state, { point, orchardId = START_ORCHARD, sprinklerId = null }) {
    const orchard = orchardById(state, orchardId);
    if (!state.unlocked || !orchard || !canPlaceSprinkler(state, point, orchardId, sprinklerId)) return false;
    const previous = { ...orchard };
    const sprinkler = { id: sprinklerId ?? state.nextId++, x: point.x, y: point.y };
    if (sprinklerId !== null) {
      if (!orchard.sprinklers.some(item => item.id === sprinklerId)) return false;
      orchard.sprinklers = orchard.sprinklers.map(item => item.id === sprinklerId ? sprinkler : item);
    } else {
      const price = sprinklerPrice(orchard);
      if (state.apples < price) return false;
      adjustStock(state, 'apples', -price);
      orchard.irrigationLevel ||= 1;
      orchard.sprinklers = [...orchard.sprinklers, sprinkler];
    }
    rescaleGrowth(state, orchard, tree => growthRate(previous, tree));
    notice(state, sprinklerId === null ? 'Разбрызгиватель установлен.' : 'Разбрызгиватель перенесён.', 'water');
    return true;
  },
  previewRecruit(state) {
    if (!state.unlocked || state.recruitOffer) return false;
    state.recruitOffer = generateWorker(state);
    state.workers.pop();
    return true;
  },
  saveCrew(state, { name, ids }) {
    const title = hedgehogName(name);
    if (!title || !Array.isArray(ids)) return false;
    const members = state.workers.filter(worker => ids.includes(worker.id)).map(worker => ({
      id: worker.id, place: workerWorkplace(worker), role: worker.workRole,
    }));
    if (!members.length) return false;
    state.crews ??= [];
    state.crews = [...state.crews.filter(crew => crew.name !== title), { name: title, members }].slice(-8);
    return true;
  },
  assignCrew(state, { ids, place, role, name }) {
    const saved = state.crews?.find(crew => crew.name === name);
    const members = saved?.members ?? (Array.isArray(ids) ? [...new Set(ids)].map(id => ({ id, place, role })) : []);
    if (!members.length) return false;
    let assigned = 0;
    for (const member of members) {
      const worker = state.workers.find(item => item.id === member.id);
      const target = workplaces(state).find(item => item.id === member.place);
      if (!worker || !target?.roles.includes(member.role) || state.industry.tractors.some(tractor => tractor.trip?.driverId === worker.id)) continue;
      if (workerWorkplace(worker) !== member.place && !actions.assignWorkplace(state, member)) continue;
      actions.assignRole(state, member);
      assigned++;
    }
    notice(state, `Назначено ${assigned}/${members.length}. Проверь места и незавершённые рейсы остальных.`, 'group');
    return true;
  },
  recruit(state, { orchardId = START_ORCHARD }) {
    const price = hirePrice(state);
    const orchard = orchardById(state, orchardId);
    if (!state.unlocked || !orchard || state.workers.length >= housingCapacity(state) || state.apples < price) return false;
    adjustStock(state, 'apples', -price);
    const worker = state.recruitOffer ?? generateWorker(state, orchard);
    if (state.recruitOffer) {
      Object.assign(worker, orchard.basket, { orchardId: orchard.id, stamina: staminaLimit(state, worker) });
      if (state.workers.some(other => other.name === worker.name)) worker.name = `${worker.name} ${state.workers.length + 1}`;
      state.workers.push(worker);
      delete state.recruitOffer;
    }
    notice(state, `${worker.name} теперь помогает в саду.`, 'group');
    return true;
  },
  assignOrchard(state, { id, orchardId, point }) {
    if (point) orchardId = orchardAt(state, point)?.id;
    if (!orchardById(state, orchardId)) return false;
    return actions.assignWorkplace(state, { id, place: orchardId });
  },
  assignStall(state, { id, stallId }) {
    return actions.assignWorkplace(state, { id, place: stallWorkplace(stallId) });
  },
  assignWorkplace(state, { id, place }) {
    const worker = state.workers.find(item => item.id === id);
    const target = workplaces(state).find(item => item.id === place);
    if (!worker || !target || workerWorkplace(worker) === place
      || state.industry.tractors.some(tractor => tractor.trip?.driverId === id)
      || (target.kind === 'tractor' && state.workers.some(other => other.siteId === target.id))) return false;
    if (worker.industryCargo) {
      adjustStock(state, worker.industryCargo.item, worker.industryCargo.amount, nearestHome(state, worker));
      delete worker.industryCargo;
    }
    if (worker.fuelCan) adjustStock(state, 'fuel', worker.fuelCan, nearestHome(state, worker));
    delete worker.fuelCan;
    delete worker.refueling;
    worker.siteId = target.industryId ?? null;
    delete worker.industryRoute;
    delete worker.industryDropoff;
    delete worker.restRoute;
    if (target.orchardId) worker.orchardId = target.orchardId;
    if (target.stallId !== undefined) worker.stallId = target.stallId;
    if (!target.roles.includes(worker.workRole)) worker.workRole = target.roles[0];
    notice(state, `${worker.name} теперь работает здесь — ${target.label}.`, 'hedge');
    return true;
  },
  assignRole(state, { id, role }) {
    const worker = state.workers.find(item => item.id === id);
    if (!worker || worker.workRole === role) return false;
    const place = workerWorkplace(worker);
    if (!workplaces(state).find(item => item.id === place)?.roles.includes(role)) return false;
    if (worker.industryCargo) {
      adjustStock(state, worker.industryCargo.item, worker.industryCargo.amount, nearestHome(state, worker));
      delete worker.industryCargo;
    }
    if (worker.fuelCan) adjustStock(state, 'fuel', worker.fuelCan, nearestHome(state, worker));
    delete worker.fuelCan;
    delete worker.refueling;
    worker.workRole = role;
    notice(state, `${worker.name} — ${workRoleLabel(place, role).toLowerCase()}.`, 'hedge');
    return true;
  },
  renameWorker(state, { id, name }) {
    const worker = state.workers.find(item => item.id === id);
    const next = hedgehogName(name);
    if (!worker || !next || next === worker.name) return false;
    worker.name = next;
    return true;
  },
  shopUpgrade(state, { id, orchardId = START_ORCHARD }) {
    if (!state.unlocked || !Object.hasOwn(SHOP, id)) return false;
    const orchard = orchardById(state, orchardId);
    if (!orchard || (SHOP[id].orchardId && SHOP[id].orchardId !== orchardId)) return false;
    const level = shopLevel(state, id, orchard);
    const price = shopPrice(id, level);
    if (level >= SHOP[id].max || state.apples < price || (id === 'sprinkler' && !orchard.sprinklers.length)) return false;
    adjustStock(state, 'apples', -price);
    if (id === 'secondPlot') {
      state.orchards.push(makeOrchard(EAST_ORCHARD, EAST_BASKET));
      guide(state, 'Восточный сад открыт. Выбери сад на карте, чтобы заняться его улучшениями. У моста можно увеличить урожай обычных яблок, а на востоке быстрее выращивать янтарные.', 'east');
    } else if (id === 'forestPlot') {
      state.orchards.push(makeOrchard(FOREST_ORCHARD, FOREST_BASKET));
      state.forestSeeds += 3;
      guide(state, `Лесной сад открыт. Посади там три лесных саженца: у них крупный урожай, а каждое яблоко стоит три у дома. За ${PERMIT_PRICE} яблок можно открыть торговлю.`, 'forest');
    } else if (SHOP[id].general) {
      state[SHOP[id].field] += 1;
    } else {
      const previous = { ...orchard };
      orchard[SHOP[id].field] += 1;
      if (id === 'sprinkler' || id === 'amberGrove') rescaleGrowth(state, orchard, tree => growthRate(previous, tree));
    }
    notice(state, `${SHOP[id].label} — куплено.`, SHOP[id].icon);
    return true;
  },
  favorite(state, { id }) {
    if (!state.workers.some(worker => worker.id === id)) return false;
    if (state.favorites.includes(id)) state.favorites = state.favorites.filter(item => item !== id);
    else {
      if (state.favorites.length >= groupCapacity(state)) return false;
      state.favorites.push(id);
    }
    return true;
  },
  upgrade(state, { id }) {
    if (!Object.hasOwn(UPGRADES, id) || upgradeStatus(state, id) !== 'ready') return false;
    const item = UPGRADES[id];
    state.xp -= item.cost;
    state.upgrades.push(id);
    if (id === 'roots') {
      for (const tree of state.trees) {
        if (!isFieldCrop(tree.variety) && !tree.fruit && tree.readyAt !== null) tree.readyAt = state.time + Math.max(0, tree.readyAt - state.time) * .75;
      }
    }
    if (id === 'flower' && flowerActive(state)) state.boostUntil += 10000;
    if (id === 'longShift') {
      for (const worker of state.workers) worker.stamina += 14;
    }
    notice(state, `${item.name}: улучшение открыто.`, item.icon);
    return true;
  },
  flower(state, { id }) {
    return collectFlower(state, id);
  },
  help(state) {
    if (!state.unlocked) return false;
    const plots = orchardPlots(state);
    const crowded = plots.some(plot => soilRate(plot, plots) < .8);
    const waitingOrder = state.trade.stalls.some(stall => {
      const order = frontCustomer(stall)?.order;
      return order?.accepted && !canServe(stall, order);
    });
    const noFuel = state.industry.tractors.some(tractor => !tractor.trip) && !(state.industry.stock.fuel > 0);
    const message = crowded ? 'Грядки и сады посажены слишком тесно. Перенеси один участок подальше. При переносе зелёная подсветка покажет землю для быстрого роста.'
      : state.workers.length >= housingCapacity(state) ? 'Все места у дома заняты. Новый дом даст ещё пять мест, а запасы у всех домов общие.'
        : noFuel ? 'Тракторы ждут топлива. Назначь ёжика в угольную шахту или добудь уголь и отнеси готовое топливо на склад.'
          : waitingOrder ? 'В лавке ждёт заказ. В сводке хозяйства видно, чего не хватает и какие грузы уже в пути.'
            : state.industry.unlocked ? 'Поставь мастерскую рядом с дорогой и назначь ёжика. Пшеница идёт в муку, а для варенья пригодятся банки со склада.'
              : 'Нажми на яблоню, чтобы помочь со сбором. Полную корзину отвезёт свободный ёжик. Место работы можно выбрать в его профиле.';
    guide(state, message, 'help');
    return true;
  },
};

export function act(state, action, fields = {}) {
  const handlers = [actions, tradeActions, industryActions].find(group => Object.hasOwn(group, action));
  if (!handlers) return state;
  const next = structuredClone(state);
  const accepted = handlers[action](next, fields, { plots: constructionPlots(next) });
  return accepted ? next : state;
}

function speed(state, worker) {
  const favorite = state.favorites.includes(worker.id) ? BALANCE.favoriteBoost : 1;
  const pace = state.upgrades.includes('pace') ? 1.18 : 1;
  const flower = flowerActive(state) ? BALANCE.flowerBoost + perkEffect(worker, 'bloom') + (state.upgrades.includes('flowerPower') ? .15 : 0) : 1;
  return BALANCE.stride * perkEffect(worker, 'speed', 1) * (1 + (worker.stats.speed - 5) * .045) * favorite * pace * flower * (1 + globalUpgradeBonus(state, 'boots'));
}

export const flowerDetection = (worker, state) => 70 + worker.stats.foraging * 18 + perkEffect(worker, 'detect') + (state?.upgrades.includes('keenScent') ? 45 : 0);

export function workerCharacteristics(state, worker) {
  return { speed: speed(state, worker), carry: carryCapacity(state, worker), trips: worker.trips ?? 0,
    stamina: worker.stamina, maxStamina: staminaLimit(state, worker), sleeping: worker.sleepUntil !== null, detection: flowerDetection(worker, state) };
}

export function workerActivity(state, worker) {
  if (worker.sleepUntil !== null) return 'Спит';
  const job = state.jobs.find(item => item.workers.includes(worker.id));
  if (!job && INDUSTRY_ROLES.includes(worker.workRole)) return WORK_ROLES[worker.workRole];
  if (!job && worker.workRole === 'haul') return 'Ждёт полную корзину';
  if (!job) return worker.workRole === 'scout' ? 'Готовится к поиску' : 'Ждёт урожая';
  if (job.kind === 'pick' && worker.workRole === 'haul') return 'Заканчивает сбор';
  if (job.kind === 'restock') return job.phase === 'house' ? 'Идёт за товаром' : 'Несёт товар в лавку';
  if (TRADE_ROLES.includes(job.kind)) return WORK_ROLES[job.kind];
  if (job.kind === 'rest') return 'Идёт к лежанке';
  if (job.kind === 'scout') return job.phase === 'approach' ? 'Заметил цветок' : 'Ищет цветы';
  if (job.kind === 'transfer') return 'Идёт в другой сад';
  if (job.kind === 'delivery') return { toBasket: 'Идёт за корзиной', load: 'Загружает корзину', haul: 'Несёт корзину к дому', unload: 'Разгружает корзину', return: 'Возвращается в сад' }[job.phase];
  return { seek: 'Идёт к яблоне', pick: 'Собирает яблоки', basket: 'Несёт яблоки в корзину' }[job.phase];
}

function planGardenWalk(state, actor, target) {
  const plan = findGardenRoute(actor, target, state.industry.roads, state.upgrades.includes('roots') ? orchardPlots(state) : []);
  return plan && routeTo(actor, target, plan);
}

function walkTo(state, actor, job, target, stride, seconds) {
  if (!job.route || job.route.x !== target.x || job.route.y !== target.y) job.route = planGardenWalk(state, actor, target);
  return job.route && followRoute(actor, job.route, stride, seconds, state.industry.roads);
}

function walkGroup(state, workers, job, target, seconds) {
  const stride = Math.min(...workers.map(worker => speed(state, worker)));
  return workers.map(worker => {
    let route = job.routes[worker.id];
    if (!route || route.x !== target.x || route.y !== target.y) {
      route = planGardenWalk(state, worker, target);
      job.routes[worker.id] = route;
    }
    return route && followRoute(worker, route, stride, seconds, state.industry.roads);
  }).every(Boolean);
}

function movePick(state, job, workers, orchard, seconds, tree) {
  if (job.phase === 'seek') {
    if (!tree?.fruit) return true;
    if (walkGroup(state, workers, job, tree, seconds)) {
      job.phase = 'pick';
      job.until = state.time + harvestTime(state, workers, tree.variety);
    }
    return false;
  }
  if (job.phase === 'pick') {
    if (!tree?.fruit) return true;
    if (state.time < job.until) return false;
    const strength = workers.reduce((sum, worker) => sum + carryCapacity(state, worker), workers.length > 1 ? 1 : 0);
    const amount = Math.min(strength, availableSpace(state, orchard, job));
    if (!amount) return true;
    job.load = pick(state, tree, amount);
    job.variety = tree.variety;
    job.phase = 'basket';
    return false;
  }
  if (!walkGroup(state, workers, job, orchard.basket, seconds)) return false;
  const space = availableSpace(state, orchard, job);
  const gleaned = job.load < space && workers.some(worker => perkEffect(worker, 'glean') > 0) && random(state) < Math.max(...workers.map(worker => perkEffect(worker, 'glean')));
  const accepted = stage(state, orchard, job.variety, Math.min(space, job.load + Number(gleaned)));
  job.load = Math.max(0, job.load - accepted);
  return job.load === 0;
}

function moveDelivery(state, job, worker, orchard, seconds) {
  if (job.phase === 'toBasket' || (job.phase === 'load' && (job.route?.x !== orchard.basket.x || job.route?.y !== orchard.basket.y))) {
    job.phase = 'toBasket';
    if (walkTo(state, worker, job, orchard.basket, speed(state, worker), seconds)) {
      job.phase = 'load';
      job.until = state.time + loadingTime(worker) * (state.upgrades.includes('quickPacking') ? .8 : 1)
        / (1 + orchard.loadingLevel * GARDEN_RATES.loading + (state.trade.orchardPerks[orchard.id]?.depot ? .35 : 0));
    }
    return false;
  }
  if (job.phase === 'load') {
    if (state.time < job.until) return false;
    job.cargo ??= takeReady(orchard);
    if (!job.cargo) return true;
    job.phase = 'haul';
    return false;
  }
  if (job.phase === 'haul') {
    const harness = orchard.id === FOREST_ORCHARD && orchard.specialtyLevel ? 1.18 : 1;
    if (walkTo(state, worker, job, nearestHome(state, orchard.basket), basketSpeed(state, worker) * (1 + orchard.trailLevel * GARDEN_RATES.hauling) * harness, seconds)) {
      job.phase = 'unload';
      job.until = state.time + loadingTime(worker) * (state.upgrades.includes('pantry') ? .65 : 1) / (1 + state.shelvesLevel * GARDEN_RATES.shelves);
    }
    return false;
  }
  if (job.phase === 'unload') {
    if (state.time < job.until) return false;
    deposit(state, job.cargo, job.orchardId, worker, nearestHome(state, orchard.basket));
    worker.trips += 1;
    job.cargo = null;
    job.phase = 'return';
    return false;
  }
  return walkTo(state, worker, job, orchardById(state, worker.orchardId).basket, speed(state, worker), seconds);
}

const SCOUT_SECTOR = 480;
const patrolStops = [[1, 1], [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]];

function scoutRoute(state, worker) {
  const clue = state.flowers[0];
  let sector;
  if (clue) {
    // Scouts know a rough area. Only nearby scouts can see the flower itself.
    sector = { x: Math.floor(clue.x / SCOUT_SECTOR), y: Math.floor(clue.y / SCOUT_SECTOR) };
  } else {
    const heading = Math.floor(random(state) * 8) * Math.PI / 4;
    sector = { x: Math.floor(worker.x / SCOUT_SECTOR) + Math.round(Math.cos(heading)),
      y: Math.floor(worker.y / SCOUT_SECTOR) + Math.round(Math.sin(heading)) };
  }
  const seed = Math.floor((worker.scoutStep ?? 0) / patrolStops.length);
  for (let attempt = 0; attempt < patrolStops.length; attempt++) {
    const step = worker.scoutStep = (worker.scoutStep ?? 0) + 1;
    const [x, y] = patrolStops[(step - 1) % patrolStops.length];
    const jitter = (seed % 3 - 1) * 26;
    const point = {
      x: Math.max(WORLD.x + 36, Math.min(WORLD.x + WORLD.width - 36, sector.x * SCOUT_SECTOR + x * 160 + 80 + jitter)),
      y: Math.max(WORLD.y + 36, Math.min(WORLD.y + WORLD.height - 36, sector.y * SCOUT_SECTOR + y * 160 + 80 - jitter)),
    };
    if (distance(worker, point) < 36 || terrainKind(point) === 'river') continue;
    const route = routeTo(worker, point);
    if (route) return route;
  }
  return null;
}

function moveScout(state, job, worker, seconds) {
  if (worker.workRole !== 'scout' || worker.stamina <= 0) return true;
  const flower = state.flowers.find(item => distance(worker, item) <= flowerDetection(worker, state) && canWalkStraight(worker, item));
  const stride = speed(state, worker) * 1.13;
  if (flower) {
    job.phase = 'approach';
    job.route = null;
    if (distance(worker, flower) <= 18 || followRoute(worker, { points: [flower], index: 0 }, stride, seconds)) {
      collectFlower(state, flower.id, worker);
      return true;
    }
    return false;
  }
  job.phase = 'patrol';
  job.route ??= scoutRoute(state, worker);
  return !job.route || followRoute(worker, job.route, stride, seconds, state.industry.roads);
}

function startSleep(state, worker) {
  worker.sleepUntil = state.time + (state.upgrades.includes('naps') ? 5200 : 8000) * (1 - globalUpgradeBonus(state, 'teahouse')) * (state.upgrades.includes('shiftPlanning') ? .8 : 1) * perkEffect(worker, 'rest', 1) * (state.upgrades.includes('orchardTeams') ? .85 : 1);
}

function restAtBed(state, worker) {
  const orchard = orchardById(state, worker.orchardId);
  if (worker.workRole === 'scout' && distance(worker, orchard.basket) > SCOUT_SECTOR) {
    startSleep(state, worker);
    return;
  }
  const beds = orchardBeds(state, orchard);
  const free = beds.filter(bed => !state.workers.some(other => other !== worker && other.sleepUntil !== null && distance(bed, other) < 15)
    && !state.jobs.some(job => job.kind === 'rest' && distance(bed, job.bed) < 15));
  for (const bed of [...free, ...beds]) {
    const route = routeTo(worker, bed);
    if (!route) continue;
    state.jobs.push({ id: state.nextId++, kind: 'rest', workers: [worker.id], orchardId: orchard.id, bed, route });
    return;
  }
  startSleep(state, worker);
}

function moveJobs(state, seconds) {
  const byId = new Map(state.workers.map(worker => [worker.id, worker]));
  const treesById = new Map(state.trees.map(tree => [tree.id, tree]));
  const orchardsById = new Map(state.orchards.map(orchard => [orchard.id, orchard]));
  state.jobs = state.jobs.filter(job => {
    if (job.kind === 'manual') {
      if (!followRoute(job.carrier, job.route, 185, seconds, state.industry.roads)) return true;
      deposit(state, job.cargo, job.orchardId, undefined, industrySite(state, job.homeId) ?? HOUSE);
      return false;
    }
    const workers = job.workers.map(id => byId.get(id));
    const orchard = orchardsById.get(job.orchardId);
    if (job.kind === 'rest') {
      const worker = workers[0];
      if (worker.orchardId !== orchard.id || !orchardBeds(state, orchard).some(bed => distance(bed, job.bed) < 1)) return false;
      if (!followRoute(worker, job.route, speed(state, worker), seconds, state.industry.roads)) return true;
      startSleep(state, worker);
      return false;
    }
    for (const worker of workers) worker.stamina = Math.max(0, worker.stamina - seconds);
    if (TRADE_ROLES.includes(job.kind)) return !moveTradeJob(state, job, workers[0], speed(state, workers[0]), seconds, nearestHome(state, state.trade.stalls.find(stall => stall.id === job.stallId) ?? orchard.basket), state.industry.roads, target => planGardenWalk(state, workers[0], target));
    if (job.kind === 'scout') return !moveScout(state, job, workers[0], seconds);
    if (job.kind === 'transfer') {
      const worker = workers[0];
      const destination = orchardById(state, worker.orchardId);
      return !walkTo(state, worker, job, destination.basket, speed(state, worker), seconds);
    }
    const finished = job.kind === 'pick' ? movePick(state, job, workers, orchard, seconds, treesById.get(job.tree)) : moveDelivery(state, job, workers[0], orchard, seconds);
    return !finished;
  });
}

function startPick(state, orchard, workers, tree, planned) {
  const routes = Object.fromEntries(workers.map((worker, i) => [worker.id, state.upgrades.includes('roots') ? planGardenWalk(state, worker, tree) : routeTo(worker, tree, planned?.[i])]));
  if (Object.values(routes).some(route => !route)) return false;
  const ids = workers.map(worker => worker.id);
  state.jobs.push({ id: state.nextId++, kind: 'pick', phase: 'seek', workers: ids, orchardId: orchard.id, tree: tree.id, load: 0, routes });
  if (ids.length > 1) {
    if (!state.firstCoOp || (state.time - (state.lastTalk ?? -Infinity) >= BALANCE.talkCooldown && random(state) < .25)) {
      state.quote = { workers: ids, lines: choose(state, dialogue), until: state.time + 4300 };
      state.lastTalk = state.time;
    }
    state.firstCoOp = true;
  }
  return true;
}

function dispatchBasket(state, orchard, idle) {
  if (!orchard.ready.length || tractorCollecting(state, orchard.id)
    || state.jobs.some(job => job.orchardId === orchard.id && (job.kind === 'manual' || job.kind === 'delivery' && job.phase !== 'return'))) return;
  const couriers = idle.filter(worker => worker.workRole !== 'collect').sort((a, b) => Number(b.workRole === 'haul') - Number(a.workRole === 'haul'));
  for (const worker of couriers) {
    const route = planGardenWalk(state, worker, orchard.basket);
    if (!route) continue;
    state.jobs.push({ id: state.nextId++, kind: 'delivery', phase: 'toBasket', workers: [worker.id], orchardId: orchard.id, route, cargo: null });
    idle.splice(idle.indexOf(worker), 1);
    return worker.id;
  }
}

function assignJobs(state, seconds) {
  const busy = new Set(state.jobs.flatMap(job => job.workers));
  const drivers = new Set(state.industry.tractors.map(tractor => tractor.trip?.driverId));
  const idle = state.workers.filter(worker => !busy.has(worker.id) && !drivers.has(worker.id));
  const commissionWorkers = new Set();
  for (const worker of idle) {
    if (worker.sleepUntil !== null && worker.sleepUntil <= state.time) {
      worker.stamina = staminaLimit(state, worker);
      worker.sleepUntil = null;
    }
    if (worker.sleepUntil === null && worker.stamina <= 0) {
      if (INDUSTRY_ROLES.includes(worker.workRole)) {
        const home = nearestHome(state, industrySite(state, worker.siteId) ?? worker);
        if (distance(home, worker) <= 1) startSleep(state, worker);
        else {
          if (!worker.restRoute || worker.restRoute.x !== home.x || worker.restRoute.y !== home.y) worker.restRoute = routeTo(worker, home, undefined, state.industry.roads);
          if (!worker.restRoute) startSleep(state, worker);
          else if (followRoute(worker, worker.restRoute, speed(state, worker), seconds, state.industry.roads)) startSleep(state, worker);
        }
      } else restAtBed(state, worker);
    } else if (worker.sleepUntil === null && TRADE_ROLES.includes(worker.workRole)) {
      const job = scheduleTrade(state, worker);
      if (job) state.jobs.push({ ...job, id: state.nextId++ });
    } else if (worker.sleepUntil === null && worker.workRole === 'scout') {
      state.jobs.push({ id: state.nextId++, kind: 'scout', phase: 'patrol', workers: [worker.id], orchardId: worker.orchardId, route: null });
    } else if (worker.sleepUntil === null && worker.workRole === 'auto' && state.trade.stalls.length) {
      const job = scheduleCommission(state, worker);
      if (job) {
        state.jobs.push({ ...job, id: state.nextId++ });
        commissionWorkers.add(worker.id);
      }
    }
  }
  const crews = new Map();
  for (const worker of idle) {
    if (worker.sleepUntil !== null || worker.stamina <= 0 || worker.workRole === 'scout'
      || TRADE_ROLES.includes(worker.workRole) || INDUSTRY_ROLES.includes(worker.workRole) || commissionWorkers.has(worker.id)) continue;
    if (!crews.has(worker.orchardId)) crews.set(worker.orchardId, []);
    crews.get(worker.orchardId).push(worker);
  }
  if (!crews.size) return;
  const reservedTrees = new Set();
  for (const job of state.jobs) {
    for (const workerId of job.workers) busy.add(workerId);
    if (job.kind === 'pick' && job.phase !== 'basket') reservedTrees.add(job.tree);
  }
  const readyTrees = new Map();
  for (const tree of state.trees) {
    if (!tree.fruit || !crews.has(tree.orchardId) || reservedTrees.has(tree.id)) continue;
    if (!readyTrees.has(tree.orchardId)) readyTrees.set(tree.orchardId, []);
    readyTrees.get(tree.orchardId).push(tree);
  }
  for (const orchard of state.orchards) {
    const crew = crews.get(orchard.id);
    if (!crew?.length) continue;
    const courier = dispatchBasket(state, orchard, crew);
    if (courier) busy.add(courier);
    const pickers = crew.filter(worker => worker.workRole !== 'haul');
    const trees = availableSpace(state, orchard) ? readyTrees.get(orchard.id) ?? [] : [];
    const distant = trees.find(tree => tree.fruit >= 4 && distance(orchard.basket, tree) >= BALANCE.coOpDistance);
    if (pickers.length >= 2 && distant && startPick(state, orchard, pickers.slice(0, 2), distant)) {
      for (const worker of pickers.splice(0, 2)) busy.add(worker.id);
      trees.splice(trees.indexOf(distant), 1);
    }
    for (const worker of pickers) {
      const nearest = trees.map(tree => ({ tree, gap: distance(tree, worker) })).sort((a, b) => a.gap - b.gap).slice(0, 6)
        .map(({ tree }) => ({ tree, route: findRoute(worker, tree, state.industry.roads) })).filter(entry => entry.route)
        .sort((a, b) => a.route.cost - b.route.cost)[0];
      if (nearest && startPick(state, orchard, [worker], nearest.tree, [nearest.route])) {
        busy.add(worker.id);
        trees.splice(trees.indexOf(nearest.tree), 1);
      }
    }
    for (const worker of crew) {
      if (!inside(plotBounds(state, orchard.id), worker) && !busy.has(worker.id)) {
        const route = planGardenWalk(state, worker, orchard.basket);
        if (route) state.jobs.push({ id: state.nextId++, kind: 'transfer', phase: 'walk', workers: [worker.id], orchardId: orchard.id, route });
      }
    }
  }
}

export function advance(state, elapsed) {
  if (elapsed <= 0) return state;
  if (!state.trees.length && !state.jobs.length && !state.workers.length && !state.boostUntil && !state.flowerAt && !state.notice && !state.industry.unlocked && !state.trade.stalls.length) return state;
  const next = structuredClone(state);
  next.time += elapsed;
  if (next.quote?.until <= next.time) next.quote = null;
  if (next.notice && next.time - next.notice.at >= 4100) next.notice = null;
  if (next.basketReceipt && next.time - next.basketReceipt.at >= 800) next.basketReceipt = null;
  next.deliveries = next.deliveries.filter(event => next.time - event.at <= BALANCE.productionWindow);
  const plots = orchardPlots(next);
  const rates = new Map(next.orchards.map((orchard, index) => [orchard.id, soilRate(plots[index], plots)]));
  const growthOrchards = new Map(next.orchards.map(orchard => [orchard.id, orchard]));
  for (const tree of next.trees) {
    if (tree.fruit) continue;
    if (isFieldCrop(tree.variety) && tree.readyAt === null
      && growthOrchards.get(tree.orchardId).sprinklers.some(sprinkler => distance(sprinkler, tree) <= SPRINKLER_RADIUS)) startCropGrowth(next, tree);
    if (tree.readyAt !== null && tree.readyAt > state.time) tree.readyAt += elapsed * (1 - rates.get(tree.orchardId));
    if (tree.readyAt !== null && tree.readyAt <= next.time) tree.fruit = treeYield(next, tree.variety, growthOrchards.get(tree.orchardId));
  }
  advanceCustomers(next, elapsed / 1000, random);
  moveJobs(next, elapsed / 1000);
  assignJobs(next, elapsed / 1000);
  advanceIndustry(next, elapsed / 1000, deposit, (actor, target) => planGardenWalk(next, actor, target));
  earnLevels(next);
  if (next.flowerAt && next.time >= next.flowerAt) {
    if (!next.flowers.length) spawnFlower(next);
    next.flowerAt = next.flowers.length ? 0 : next.time + BALANCE.flowerCooldown;
  }
  if (next.boostUntil <= next.time) next.boostUntil = 0;
  return next;
}

function migrateOrchard(state) {
  const basket = terrainKind(state.basket) === 'river' ? START_BASKET : state.basket;
  const orchard = makeOrchard(START_ORCHARD, basket);
  state.orchards = [orchard];
  for (const tree of state.trees) {
    tree.orchardId = START_ORCHARD;
    tree.variety = 'red';
  }
  for (const worker of state.workers) {
    if (terrainKind(worker) === 'river') Object.assign(worker, basket);
    worker.orchardId = START_ORCHARD;
    worker.workRole = 'auto';
    worker.stats = { ...DEFAULT_STATS };
    worker.stamina = staminaLimit(state, worker);
    worker.sleepUntil = null;
    worker.trips ??= 0;
  }
  let carried = state.jobs.reduce((count, job) => count + (job.load ?? 0), 0);
  while (carried >= basketLimit(orchard)) {
    orchard.ready.push({ red: basketLimit(orchard), gold: 0 });
    carried -= basketLimit(orchard);
  }
  orchard.fill.red = carried;
  state.jobs = [];
  state.goldSeeds = 0;
  state.goldDiscovered = false;
  state.eastDelivered = false;
  state.version = 4;
  state.basketCapacityVersion = 1;
  delete state.basket;
  return state;
}

function migrateFieldRules(state) {
  for (const worker of state.workers) {
    worker.workRole ??= 'auto';
    if (worker.workRole === 'water' && state.trade.berryFarm && !isBerryOrchard(worker.orchardId)) worker.orchardId = BERRY_ORCHARD;
  }
  if (!state.basketCapacityVersion) {
    for (const orchard of state.orchards) {
      if (!orchard.ready.length && !waitingForOldPickup(state, orchard)) continue;
      const carried = state.jobs.filter(job => job.kind === 'pick' && job.orchardId === orchard.id && job.load > 0);
      preserveCarriedFruit(orchard, carried);
      state.jobs = state.jobs.filter(job => !carried.includes(job));
    }
    state.basketCapacityVersion = 1;
  }
  for (const orchard of state.orchards) {
    if (orchard.sprinklers) continue;
    const { sprinkler, sprinklerAt } = orchard;
    orchard.sprinklers = [];
    orchard.irrigationLevel = sprinkler ?? 0;
    orchard.compostLevel = 0;
    orchard.loadingLevel = 0;
    orchard.trailLevel = 0;
    orchard.specialtyLevel = 0;
    delete orchard.sprinkler;
    delete orchard.sprinklerAt;
    if (!sprinkler) continue;
    let point = sprinklerAt;
    if (point === undefined) {
      const anchor = state.trees.find(tree => tree.orchardId === orchard.id) ?? orchard.basket;
      const offsets = [[55, 0], [-55, 0], [0, 55], [0, -55], [65, 55], [-65, -55]];
      point = offsets.map(([dx, dy]) => ({ x: anchor.x + dx, y: anchor.y + dy }))
        .find(candidate => canPlaceSprinkler(state, candidate, orchard.id));
    }
    if (point) orchard.sprinklers.push({ id: state.nextId++, ...point });
    if (sprinklerAt === undefined) {
      for (const tree of state.trees.filter(tree => tree.orchardId === orchard.id && !tree.fruit)) {
        const watered = orchard.sprinklers.some(item => distance(item, tree) <= SPRINKLER_RADIUS);
        if (!watered) tree.readyAt = state.time + Math.max(0, tree.readyAt - state.time) * (1 + sprinkler * .12);
      }
    }
  }
  return state;
}

function updateBalance(state) {
  if (state.balanceVersion === 1) return state;
  for (const orchard of state.orchards) {
    const previous = orchard.sprinklers;
    if (previous.length > SPRINKLER_LIMIT) {
      const extras = previous.slice(SPRINKLER_LIMIT);
      state.apples += extras.reduce((refund, _, i) => refund + Math.ceil(45 * 1.4 ** (SPRINKLER_LIMIT + i)), 0);
      orchard.sprinklers = previous.slice(0, SPRINKLER_LIMIT);
    }
    rescaleGrowth(state, orchard, tree => {
      const water = previous.some(item => distance(item, tree) <= SPRINKLER_RADIUS) ? orchard.irrigationLevel * .12 : 0;
      const amber = orchard.id === EAST_ORCHARD && tree.variety === 'gold' ? orchard.specialtyLevel * .25 : 0;
      const base = VARIETIES[tree.variety].regrowth;
      const fence = state.upgrades.includes('roots') ? base * .75 / (base - 1000) : 1;
      return (1 + water) * (1 + amber) * fence;
    });
  }
  state.balanceVersion = 1;
  return state;
}

function migrateTerrain(state) {
  if (state.mapVersion >= MAP_VERSION) return state;
  const orchard = orchardById(state,FOREST_ORCHARD);
  if (orchard) {
    const move = item => {
      item.x += FOREST_CLEARING.x - PREVIOUS_FOREST_CLEARING.x;
      item.y += FOREST_CLEARING.y - PREVIOUS_FOREST_CLEARING.y;
    };
    for (const item of [orchard.basket, ...orchard.sprinklers, ...state.trees.filter(tree => tree.orchardId === orchard.id)]) move(item);
    const forestWorkers = new Set(state.jobs.filter(job => job.orchardId === orchard.id).flatMap(job => job.workers));
    const movedWorkers = new Set();
    for (const worker of state.workers) {
      if ((worker.orchardId === orchard.id || forestWorkers.has(worker.id)) && inside(PREVIOUS_FOREST_CLEARING,worker)) {
        move(worker);
        movedWorkers.add(worker.id);
      }
    }
    state.jobs = state.jobs.filter(job => {
      const affected = job.orchardId === orchard.id || job.workers.some(id => movedWorkers.has(id));
      if (!affected || job.kind === 'manual') return true;
      if (job.kind === 'rest') return false;
      if (job.kind === 'pick') {
        job.routes = {};
        if (job.phase === 'pick') job.phase = 'seek';
      } else job.route = null;
      return true;
    });
  }
  migrateTradeSites(state,constructionPlots(state));
  state.mapVersion = MAP_VERSION;
  return state;
}

function readGame(raw, legacy) {
  try {
    const state = JSON.parse(raw);
    if ((([3,4].includes(state?.version) && Array.isArray(state.orchards)) || (state?.version === 2 && state.basket))
      && Array.isArray(state.trees) && Array.isArray(state.workers) && Array.isArray(state.upgrades)) {
      const previousBalance = state.xpProgress === undefined;
      state.xpProgress ??= 0;
      state.level ??= previousLevel(state);
      state.shelvesLevel ??= 0;
      state.forestSeeds ??= 0;
      state.trade ??= newTrade();
      state.industry = { ...newIndustry(), logisticsVersion: 0, ...state.industry };
      if (!validIndustry(state.industry)) return null;
      if (!migrateLogistics(state)) return null;
      if (state.crews !== undefined && (!Array.isArray(state.crews) || !state.crews.every(crew => hedgehogName(crew?.name)
        && Array.isArray(crew.members) && crew.members.every(member => typeof member?.id === 'string'
          && typeof member.place === 'string' && Object.hasOwn(WORK_ROLES, member.role))))) return null;
      if (state.workers.some(worker => worker.industryCargo && (!Object.hasOwn(GOODS, worker.industryCargo.item)
        || !Number.isSafeInteger(worker.industryCargo.amount) || worker.industryCargo.amount <= 0))) return null;
      const offer = state.recruitOffer;
      if (offer && (typeof offer.id !== 'string' || !hedgehogName(offer.name)
        || !Object.keys(DEFAULT_STATS).every(key => Number.isFinite(offer.stats?.[key])))) return null;
      migrateMarketProgress(state);
      state.version = 4;
      const previousGoal = BALANCE.firstLevelXp + (state.level - 1) * 2;
      if (!Number.isSafeInteger(state.xpProgress) || state.xpProgress < 0 || !Number.isSafeInteger(state.level) || state.level < 1
        || state.xpProgress >= previousGoal) return null;
      earnLevels(state);
      state.basketReceipt ??= null;
      state.flowers = (state.flowers ?? []).slice(0, 1);
      if (previousBalance) state.flowerAt = state.flowers.length ? 0 : state.time + BALANCE.flowerCooldown;
      state.seedPurchases ??= Math.max(0, state.trees.length + state.seeds - 1);
      if ((state.mapVersion ?? 0) < 2) {
        state.basket = moveToNewMap(state.basket);
        state.trees = state.trees.map(moveToNewMap);
        state.workers = state.workers.map(moveToNewMap);
        state.flowers = state.flowers.map(moveToNewMap).filter(flower => terrainKind(flower) === 'ground');
        if (!state.flowers.length && !state.flowerAt) spawnFlower(state);
        state.mapVersion = 2;
      }
      return migrateTerrain(updateBalance(state.basket ? migrateOrchard(state) : migrateFieldRules(state)));
    }
    const previous = state?.version === 1 ? state : JSON.parse(legacy);
    if (previous?.version === 1 && Array.isArray(previous.trees)) {
      const migrated = newGame();
      migrated.apples = previous.apples;
      migrated.xp = previous.xp;
      migrated.seeds = previous.seeds?.red ?? 0;
      migrated.goldSeeds = previous.seeds?.gold ?? 0;
      migrated.trees = previous.trees.map(tree => {
        const variety = tree.kind === 'gold' ? 'gold' : 'red';
        return moveToNewMap({ id: migrated.nextId++, orchardId: START_ORCHARD, variety, x: 985 + tree.x * 64, y: 596 + tree.y * 59, fruit: Math.min(VARIETIES[variety].yield, tree.fruit), readyAt: 0 });
      });
      migrated.goldDiscovered = migrated.goldSeeds > 0 || migrated.trees.some(tree => tree.variety === 'gold');
      migrated.seedPurchases = Math.max(0, migrated.trees.filter(tree => tree.variety === 'red').length + migrated.seeds - 1);
      if (previous.expanded) migrated.upgrades.push('plot1', 'plot2');
      if (previous.capacity > 2) migrated.upgrades.push('group1');
      migrated.level = previousLevel(migrated);
      if (previous.hedgehogs?.some(hedge => hedge.id === 'potato')) {
        migrated.unlocked = true;
        generateWorker(migrated);
        for (const legacyWorker of previous.hedgehogs.filter(hedge => hedge.id !== 'potato')) {
          const worker = generateWorker(migrated);
          if (previous.favorites?.includes(legacyWorker.id) && migrated.favorites.length < groupCapacity(migrated)) migrated.favorites.push(worker.id);
        }
        for (const worker of migrated.workers) {
          worker.stats = { ...DEFAULT_STATS };
          worker.stamina = staminaLimit(migrated, worker);
        }
        guide(migrated, 'Теперь я подсказываю из интерфейса, а в саду помогает мой друг. Твои деревья и яблоки на месте.', 'migration');
      }
      return migrated;
    }
  } catch { return null; }
  return null;
}

export function restoreGame(raw, legacy = null) {
  return readGame(raw, legacy) ?? newGame();
}

export function importGame(raw) {
  const state = readGame(raw, null);
  const validPlot = orchard => {
    const plot = orchard.plot;
    return plot && [plot.x, plot.y, plot.width, plot.height].every(Number.isFinite) && plot.width > 0 && plot.height > 0
      && (!isBerryOrchard(orchard.id) || [plot.water?.x, plot.water?.y].every(Number.isFinite));
  };
  if (!state || ![state.time, state.apples, state.xp, state.level, state.seeds, state.random, state.nextId].every(value => Number.isFinite(value) && value >= 0)
    || !state.level || !Array.isArray(state.jobs) || !Array.isArray(state.favorites) || !Array.isArray(state.deliveries)
    || !state.orchards.length || new Set(state.orchards.map(orchard => orchard.id)).size !== state.orchards.length
    || !state.orchards.every(orchard => orchardName(orchard.id) && Array.isArray(orchard.ready)
      && (!(isPurchasedGarden(orchard.id) || (isBerryOrchard(orchard.id) && orchard.id !== BERRY_ORCHARD)) || validPlot(orchard))
      && [orchard.basket?.x, orchard.basket?.y, orchard.fill?.red, orchard.fill?.gold, orchard.basketLevel, orchard.irrigationLevel].every(Number.isFinite))
    || !state.workers.every(worker => Object.hasOwn(WORK_ROLES, worker.workRole) && orchardById(state, worker.orchardId)
      && typeof worker.name === 'string' && [worker.x, worker.y, worker.stamina].every(Number.isFinite)
      && Object.keys(DEFAULT_STATS).every(id => Number.isFinite(worker.stats?.[id])))
    || !state.trees.every(tree => Object.hasOwn(VARIETIES, tree.variety) && orchardById(state, tree.orchardId)
      && [tree.x, tree.y, tree.fruit].every(Number.isFinite) && (tree.readyAt === null || Number.isFinite(tree.readyAt)))
    || !state.jobs.every(job => ['manual', 'pick', 'delivery', 'transfer', 'rest', 'scout', ...TRADE_ROLES].includes(job.kind)
      && orchardById(state, job.orchardId) && Array.isArray(job.workers)
      && job.workers.every(id => state.workers.some(worker => worker.id === id))
      && (job.kind === 'manual' ? job.carrier && job.route && job.cargo : job.workers.length > 0))) return null;
  return state;
}

export function loadGame(storage) {
  return restoreGame(storage?.getItem(SAVE_KEY) ?? storage?.getItem(ORCHARD_SAVE) ?? storage?.getItem(PREVIOUS_SAVE) ?? null, storage?.getItem(OLD_SAVE) ?? null);
}
