import { FOREST_CLEARING } from './terrain.js';

export const HOUSE = { x: 2945, y: 1443 };
export const STOREHOUSE = { x: 3035, y: 1400 };
export const START_ORCHARD = 'west';
export const EAST_ORCHARD = 'east';
export const FOREST_ORCHARD = 'forest';
export const BERRY_ORCHARD = 'berry';
export const FOREST_BASKET = { x: FOREST_CLEARING.x + 130, y: FOREST_CLEARING.y + 410 };
export const EAST_PLOT = { x: 3055, y: 1510, width: 610, height: 420 };
export const EAST_BASKET = { x: 3110, y: 1568 };
export const SPRINKLER_RADIUS = 175;
export const SPRINKLER_LIMIT = 4;
export const GARDEN_RATES = { water: .09, amber: .2, loading: .14, hauling: .08, shelves: .16 };
export const ORCHARD_NAMES = { west: 'Сад у моста', east: 'Восточный сад', forest: 'Лесной сад', berry: 'Ферма' };
const addedGarden = /^apple-([1-9]\d*)$/;
const addedBerryFarm = /^berry-([1-9]\d*)$/;
export const isBerryOrchard = id => id === BERRY_ORCHARD || addedBerryFarm.test(id);
export const isPurchasedGarden = id => addedGarden.test(id);
export const orchardName = id => {
  if (Object.hasOwn(ORCHARD_NAMES, id)) return ORCHARD_NAMES[id];
  const apple = addedGarden.exec(id);
  if (apple) return `Яблоневый сад ${apple[1]}`;
  const berries = addedBerryFarm.exec(id);
  return berries ? `Ферма ${berries[1]}` : undefined;
};

export const VARIETIES = {
  red: { label: 'Обычная яблоня', seed: 'Саженец', yield: 5, regrowth: 5500, value: 1 },
  gold: { label: 'Янтарная яблоня', seed: 'Янтарный саженец', yield: 4, regrowth: 8500, value: 2 },
  forest: { label: 'Лесная яблоня', seed: 'Лесной саженец', yield: 9, regrowth: 10500, value: 3 },
  wheat: { label: 'Пшеница', seed: 'Семена пшеницы', yield: 7, regrowth: 16000, value: 0 },
  berry: { label: 'Ягодный куст', seed: 'Ягодный саженец', yield: 8, regrowth: 18000, value: 0 },
};

export const isFieldCrop = variety => variety === 'berry' || variety === 'wheat';

export const SHOP = {
  secondPlot: { label: 'Восточный сад', desc: 'Открывает второй участок.', icon: 'map', base: 220, growth: 1, max: 1, unlock: EAST_ORCHARD },
  forestPlot: { label: 'Лесной сад', desc: 'Плодородная земля, лесные яблони и вместительные корзины.', icon: 'seed', base: 1750, growth: 1, max: 1, unlock: FOREST_ORCHARD },
  shelves: { label: 'Полки у дома', desc: 'Ускоряют разгрузку корзин из всех садов на 16% за уровень.', icon: 'shelves', base: 130, growth: 1.8, max: 3, field: 'shelvesLevel', general: true },
  sprinkler: { label: 'Система полива', desc: 'В зоне полива яблоки созревают на 9% быстрее за уровень.', icon: 'water', base: 45, growth: 1.75, max: 3, field: 'irrigationLevel' },
  basket: { label: 'Большая корзина', desc: 'Вмещает на 4 яблока больше за уровень.', icon: 'basket', base: 65, growth: 1.7, max: 3, field: 'basketLevel' },
  compost: { label: 'Компост', desc: 'Каждая яблоня даёт на одно яблоко больше за уровень.', icon: 'soil', base: 95, growth: 1.8, max: 2, field: 'compostLevel' },
  loading: { label: 'Стол для корзин', desc: 'Ускоряет погрузку на 14% за уровень.', icon: 'table', base: 75, growth: 1.65, max: 3, field: 'loadingLevel' },
  trail: { label: 'Удобный выход', desc: 'Ускоряет ходьбу с полной корзиной на 8% за уровень.', icon: 'track', base: 105, growth: 1.7, max: 3, field: 'trailLevel' },
  rootstock: { label: 'Садовые подвои', desc: 'Обычные яблони у моста дают ещё 2 яблока за урожай.', icon: 'apple', base: 170, growth: 1, max: 1, field: 'specialtyLevel', orchardId: START_ORCHARD },
  amberGrove: { label: 'Янтарная роща', desc: 'Янтарные яблоки в Восточном саду созревают на 20% быстрее.', icon: 'gold', base: 170, growth: 1, max: 1, field: 'specialtyLevel', orchardId: EAST_ORCHARD },
  forestHarness: { label: 'Лесная упряжь', desc: 'Ёжики несут полную корзину из Лесного сада на 18% быстрее.', icon: 'fastBasket', base: 360, growth: 1, max: 1, field: 'specialtyLevel', orchardId: FOREST_ORCHARD },
};

export const STAT_INFO = {
  speed: { label: 'Скорость', icon: 'speed', desc: 'Скорость ходьбы.' },
  strength: { label: 'Сила', icon: 'strength', desc: 'Яблоки за поход к дереву и скорость с тяжёлой корзиной.' },
  endurance: { label: 'Выносливость', icon: 'endurance', desc: 'Время работы до сна.' },
  dexterity: { label: 'Ловкость', icon: 'dexterity', desc: 'Скорость сбора плодов.' },
  handling: { label: 'Сноровка', icon: 'handling', desc: 'Скорость погрузки и разгрузки корзины.' },
  foraging: { label: 'Поиск', icon: 'foraging', desc: 'Дальность обнаружения цветов и шанс найти редкий саженец в корзине.' },
};
export const WORK_ROLES = { auto: 'Сбор и доставка', collect: 'Собирать яблоки', haul: 'Возить корзины', scout: 'Искать цветы', restock: 'Снабжать лавку', vendor: 'Продавать', forage: 'Искать дикие ягоды', water: 'Поливать посевы', maker: 'Готовить продукты', buyer: 'Покупать банки', miner: 'Добывать уголь', driver: 'Водить трактор' };
export const WORK_ROLE_ICONS = { auto: 'work', collect: 'apple', haul: 'basket', scout: 'flower', restock: 'fastBasket', vendor: 'coin', forage: 'berry', water: 'water', maker: 'table', buyer: 'jar', miner: 'fuel', driver: 'fastBasket' };
export const DEFAULT_STATS = Object.fromEntries(Object.keys(STAT_INFO).map(id => [id, 5]));

export const emptyCargo = () => ({ red: 0, gold: 0 });
export const fruitCount = cargo => Object.keys(VARIETIES).reduce((count,key) => count + (cargo[key] ?? 0),0);
export const fruitValue = cargo => Object.entries(VARIETIES).reduce((value,[key,variety]) => value + (cargo[key] ?? 0) * variety.value,0);

export const orchardById = (state, id) => state.orchards.find(orchard => orchard.id === id);
export const berryBounds = (state, id = BERRY_ORCHARD) => id === BERRY_ORCHARD
  ? state.trade.berryFarm : isBerryOrchard(id) ? orchardById(state, id)?.plot : null;
export const basketLimit = orchard => orchard.id === FOREST_ORCHARD ? 18 + orchard.basketLevel * 8 : 10 + orchard.basketLevel * 4;
export const shopLevel = (state, id, orchard) => SHOP[id].unlock
  ? Number(Boolean(orchardById(state, SHOP[id].unlock))) : (SHOP[id].general ? state : orchard)[SHOP[id].field];
export const shopPrice = (id, level) => Math.ceil(SHOP[id].base * SHOP[id].growth ** level);
export const sprinklerPrice = orchard => orchard.irrigationLevel && !orchard.sprinklers.length
  ? 0 : Math.ceil(45 * 1.4 ** orchard.sprinklers.length);

export function makeOrchard(id, basket) {
  return { id, basket: { ...basket }, fill: emptyCargo(), ready: [], sprinklers: [], irrigationLevel: 0, basketLevel: 0,
    compostLevel: 0, loadingLevel: 0, trailLevel: 0, specialtyLevel: 0, pulse: null };
}

function packBasket(orchard) {
  const capacity = basketLimit(orchard);
  if (fruitCount(orchard.fill) < capacity) return false;
  const cargo = emptyCargo();
  let remaining = capacity;
  for (const key of Object.keys(VARIETIES)) {
    const count = Math.min(orchard.fill[key] ?? 0, remaining);
    if (!count) continue;
    orchard.fill[key] -= count;
    cargo[key] = count;
    remaining -= count;
  }
  orchard.ready.push(cargo);
  return true;
}

function seal(orchard) {
  if (!orchard.ready.length) packBasket(orchard);
}

export function preserveCarriedFruit(orchard, jobs) {
  for (const job of jobs) orchard.fill[job.variety] = (orchard.fill[job.variety] ?? 0) + job.load;
  while (packBasket(orchard)) { /* Carry over full baskets from the old save. */ }
}

export const spaceForFruit = orchard => orchard.ready.length ? 0 : Math.max(0, basketLimit(orchard) - fruitCount(orchard.fill));

export function stageFruit(orchard, kind, amount) {
  seal(orchard);
  const accepted = Math.min(amount, spaceForFruit(orchard));
  if (accepted) orchard.fill[kind] = (orchard.fill[kind] ?? 0) + accepted;
  seal(orchard);
  return accepted;
}

export function takeReady(orchard) {
  const cargo = orchard.ready.shift();
  seal(orchard);
  return cargo;
}
