import { BALANCE, canPlant, canSendBasket, hirePrice, plotBounds, seedPrice } from './game.js';
import { housingCapacity, industrySite } from './industry.js';
import { basketLimit, fruitCount, HOUSE, isBerryOrchard, isFieldCrop } from './orchard.js';
import { researchUnlocked } from './commission.js';

const lesson = (id, title, text) => ({ id, title, text });

export const STOCK_LESSON = lesson('stock', 'Яблоки добрались до дома',
  'Счётчик вверху показывает, сколько яблок уже можно потратить. Урожай на деревьях и в корзине в него пока не входит. Чтобы накопить быстрее, можно посадить ещё деревья.');

function plantingSpot(state, variety) {
  for (const orchard of state.orchards) {
    if (isBerryOrchard(orchard.id)) continue;
    const plot = plotBounds(state, orchard.id);
    if (!plot) continue;
    for (const y of [.45, .6, .3, .75, .85]) {
      for (const x of [.48, .64, .32, .78, .2, .88]) {
        const point = { x: Math.round(plot.x + plot.width * x), y: Math.round(plot.y + plot.height * y) };
        if (canPlant(state, point, variety)) return point;
      }
    }
  }
  return null;
}

export function beginnerTask(state, now = Date.now()) {
  if (state.workers.length) return null;

  const goal = state.unlocked ? hirePrice(state) : BALANCE.mystery;
  const task = (chapter, target, hint, orchard, point) => ({
    chapter, target, hint, point, goal,
    basket: orchard ? { count: fruitCount(orchard.fill), limit: basketLimit(orchard) } : null,
  });

  if (!state.unlocked && state.apples >= goal) {
    return task(lesson('unlock', 'Пора познакомиться',
      `У тебя уже есть ${goal} яблок. Открой «Лавку» и нажми «Открыть» под портретом ???. Я представлюсь и познакомлю тебя с первым помощником.`),
    'mystery', 'Загляни в «Лавку» и открой ???.');
  }

  if (state.unlocked && state.workers.length < housingCapacity(state)) {
    if (researchUnlocked(state) && state.lodge?.waiting.some(entry => entry.until > now)) {
      return task(lesson('return', 'Помощник может вернуться',
        'Открой «Ёжики», затем «Домик отдыха». Пока время на возвращение не истекло, нажми «Вернуть», чтобы ёжик снова поселился в саду.'),
      'lodge', 'Открой «Ёжики» → «Домик отдыха».');
    }
    if (state.apples >= goal) {
      return task(lesson('recruit', 'Найми помощника',
        `Открой «Ёжики» и посмотри кандидата. Его карточка покажет характеристики, навык и подходящие работы. Если он подходит, нажми «Нанять» за ${goal} яблок.`),
      'recruit', 'Открой «Ёжики» и посмотри кандидата.');
    }
  }

  const delivery = state.jobs.find(job => job.kind === 'manual');
  if (delivery) {
    const home = industrySite(state, delivery.homeId) ?? HOUSE;
    return task(lesson('delivery', 'Корзина едет к дому',
      'Доставка идёт сама. Можешь продолжать собирать яблоки, пока корзина в пути. Когда она доедет, яблоки появятся в запасе у дома.'),
    delivery.homeId ?? 'house', 'Дождись, когда корзина доедет к дому.', null, home);
  }

  const basket = state.orchards.find(orchard => !isBerryOrchard(orchard.id) && canSendBasket(state, orchard));
  if (basket) {
    return task(lesson('basket', 'Отправь полную корзину',
      'У корзины появилась надпись «Полная». Нажми на корзину в саду один раз, и она отправится к дому. Так собранный урожай можно будет потратить.'),
    `basket-${basket.id}`, 'Нажми на полную корзину.', null, basket.basket);
  }

  const trees = state.trees.filter(tree => !isFieldCrop(tree.variety));
  const tree = trees.find(tree => tree.fruit > 0)
    ?? trees.reduce((earliest, item) => !earliest || item.readyAt < earliest.readyAt ? item : earliest, null);
  if (tree) {
    const orchard = state.orchards.find(item => item.id === tree.orchardId);
    const hint = tree.fruit ? 'Нажми на яблоню, чтобы собрать урожай.' : 'Дождись новых яблок и снова нажми на яблоню.';
    return task(lesson('harvest', 'Собери яблоки',
      `Нажми на яблоню со спелыми плодами. Яблоки попадут в корзину этого сада. Новые плоды вырастут сами. Собирай, пока в корзине не будет ${orchard ? basketLimit(orchard) : 'достаточно'} яблок.`),
    `tree-${tree.id}`, hint, orchard, tree);
  }

  const mode = state.seeds ? 'plant' : state.goldSeeds ? 'plantGold' : state.forestSeeds ? 'plantForest' : null;
  if (mode) {
    const point = plantingSpot(state, { plant: 'red', plantGold: 'gold', plantForest: 'forest' }[mode]);
    return {
      ...task(lesson('plant', 'Посади первую яблоню',
        'В сумке уже есть саженец. Нажми на подсвеченное место или выбери свободную землю внутри сада. Перетаскивай карту, чтобы осмотреться. Для приближения используй колёсико, жест двумя пальцами или кнопки «+» и «−».'),
      'plant', 'Нажми на подсвеченное место в саду.', null, point), mode,
    };
  }

  return task(lesson('seed', 'Возьми саженец в лавке',
    `Открой «Лавку». Если в доме есть ${seedPrice(state)} яблок, купи саженец, затем нажми «Посадить яблоню».`),
  'seed', 'Купи саженец в «Лавке».');
}
