export const PERK_TIERS = [
  { id: 'common', label: 'Обычный', weight: 50 },
  { id: 'uncommon', label: 'Необычный', weight: 27 },
  { id: 'rare', label: 'Редкий', weight: 14 },
  { id: 'epic', label: 'Эпический', weight: 6 },
  { id: 'legendary', label: 'Легендарный', weight: 2.7 },
  { id: 'godly', label: 'Божественный', weight: .3 },
];
const byTier = [
  [
    ['pockets', 'Полные карманы', 'Берёт на один плод больше.', 'basket', { carry: 1 }],
    ['glean', 'Внимательный', '22% шанс найти дополнительный плод.', 'apple', { glean: .22 }],
    ['bloom', 'Любит цветы', 'Бодрость даёт ещё 15 процентных пунктов скорости.', 'flower', { bloom: .15 }],
    ['trail', 'Знает тропинки', 'Ходит на 8% быстрее.', 'speed', { speed: 1.08 }],
    ['hearty', 'Крепкое здоровье', '+8 к запасу сил.', 'endurance', { stamina: 8 }],
  ], [
    ['satchel', 'Плотная сумка', 'Два дополнительных плода за поход.', 'basket', { carry: 2 }],
    ['sharp', 'Чуткий нос', 'Замечает цветы на 40 шагов дальше.', 'foraging', { detect: 40 }],
    ['steady', 'Проворные лапки', 'На 15% меньше времени на сбор.', 'apple', { harvest: .85 }],
    ['early', 'Ранний подъём', 'На 15% меньше времени на сон.', 'bed', { rest: .85 }],
    ['runner', 'Быстрый ход', 'Ходит на 17% быстрее.', 'speed', { speed: 1.17 }],
  ], [
    ['oak', 'Дубовая выносливость', '+24 к запасу сил.', 'endurance', { stamina: 24 }],
    ['picker', 'Знаток спелости', 'На 30% меньше времени на сбор.', 'apple', { harvest: .7 }],
    ['hauler', 'Грузчик', '+3 плода за поход. Ходит на 10% медленнее.', 'basket', { carry: 3, speed: .9 }],
    ['nimble', 'Подвижный', 'Ходит на 28% быстрее, но запас сил меньше на 12.', 'speed', { speed: 1.28, stamina: -12 }],
    ['dawn', 'Первые лучи', 'На 28% меньше времени на сон.', 'bed', { rest: .72 }],
  ], [
    ['pollen', 'Следопыт', 'Замечает цветы на 100 шагов дальше. Бодрость даёт ещё 20 пунктов скорости.', 'flower', { detect: 100, bloom: .2 }],
    ['sweep', 'Чистый сбор', '50% шанс найти дополнительный плод.', 'apple', { glean: .5 }],
    ['iron', 'Железный ёж', '+36 к запасу сил, ходит на 12% медленнее.', 'endurance', { stamina: 36, speed: .88 }],
    ['sprint', 'Спринтер', '+50% скорости, запас сил меньше на 24.', 'speed', { speed: 1.5, stamina: -24 }],
    ['laden', 'Плечистый', '+4 плода за поход, сон на 20% дольше.', 'basket', { carry: 4, rest: 1.2 }],
  ], [
    ['moon', 'Лунный сон', 'Спит вдвое меньше. Запас сил меньше на 14.', 'bed', { rest: .5, stamina: -14 }],
    ['wind', 'Попутный ветер', '+70% скорости. Берёт на один плод меньше.', 'speed', { speed: 1.7, carry: -1 }],
    ['granary', 'Живая кладовая', '+6 плодов за поход. На сбор уходит на 30% больше времени.', 'basket', { carry: 6, harvest: 1.3 }],
    ['bees', 'Друг пчёл', 'Цветы видны на 160 шагов дальше. Бодрость даёт ещё 40 пунктов скорости.', 'flower', { detect: 160, bloom: .4 }],
    ['twilight', 'Сумеречный сбор', 'Собирает вдвое быстрее, но спит на 30% дольше.', 'apple', { harvest: .5, rest: 1.3 }],
  ], [
    ['lightning', 'Молния', 'Двигается втрое быстрее. Запас сил вдвое меньше.', 'speed', { speed: 3, endurance: .5 }],
    ['mountain', 'Гора', '+70 к запасу сил, +5 плодов за поход. Скорость вдвое ниже.', 'strength', { stamina: 70, carry: 5, speed: .5 }],
    ['star', 'Путеводная звезда', 'Замечает цветы на 260 шагов дальше. Сон на 60% дольше.', 'flower', { detect: 260, rest: 1.6 }],
    ['marathon', 'Нескончаемая смена', 'Запас сил удвоен. Сон в полтора раза дольше.', 'endurance', { endurance: 2, rest: 1.5 }],
    ['handful', 'Щедрая земля', 'Сбор вдвое быстрее и всегда даёт лишний плод, если есть место. Скорость ходьбы ниже на 30%.', 'apple', { harvest: .5, glean: 1, speed: .7 }],
  ],
];
export const PERKS = Object.fromEntries(byTier.flatMap((entries, i) => entries.map(([id, name, desc, icon, effects]) =>
  [id, { name, desc, icon, tier: PERK_TIERS[i].id, effects }])));
export const perkEffect = (worker, key, fallback = 0) => PERKS[worker.perk]?.effects[key] ?? fallback;
export function rollPerk(roll, choice) {
  const tier = PERK_TIERS.find(item => (roll -= item.weight) < 0) ?? PERK_TIERS.at(-1);
  const entries = byTier[PERK_TIERS.indexOf(tier)];
  return entries[Math.floor(choice * entries.length)][0];
}
