import { distance } from './routes.js';

const harvestTogether = [
  ['Пойдём вместе?', 'Я с тобой!'],
  ['Вон сколько яблок.', 'Унесём за раз!'],
  ['Я возьму крайние.', 'А я остальные.'],
  ['Держишь ветку?', 'Держу. Собирай!'],
  ['Эта ветка пониже.', 'Оставь её мне!'],
  ['Яблоко покатилось!', 'Поймал!'],
  ['Подвинь корзинку?', 'Вот, поближе.'],
  ['С этой стороны краснее.', 'Я уже иду!'],
];

const friends = [
  ['Как твои дела?', 'Сегодня как-то особенно хорошо.'],
  ['Зайдёшь после смены?', 'Да, принесу чай.'],
  ['Слышишь реку?', 'Да. Сегодня тихая.'],
  ['Как иголки?', 'Все на месте!'],
  ['Видел облако над садом?', 'Похоже на большую корзину.'],
  ['Покажешь короткую тропу?', 'Встретимся у моста.'],
  ['Не забыл про обед?', 'Уже грею чайник.'],
  ['Тебе помочь?', 'Пока справляюсь, спасибо!'],
  ['Скамейку у дома заметил?', 'Ага, вечером посидим.'],
  ['Встретимся у старой яблони?', 'Как обычно!'],
];

const lines = {
  idle: [
    'У реки всегда хорошо дышится.', 'Сколько здесь тропинок!', 'Надо бы выпрямить иголки.',
    'Вот бы посидеть минутку на солнышке.', 'Отсюда видно почти весь сад.',
    'У моста ветер свежее.', 'Интересно, кто сегодня зайдёт в гости?',
    'Вечером заварю чай.', 'Люблю, когда в саду так тихо.', 'Кажется, я знаю каждый камешек на этой тропе.',
  ],
  pick: [
    'Спелое яблоко само просится в лапы.', 'Сначала нижние ветки.',
    'Вот это яблоко! Еле держу.', 'Только бы не уронить в траву.', 'И ещё одно в корзинку.',
  ],
  crop: [
    'Аккуратно, чтобы веточки не сломать.', 'Здесь ещё кое-что созрело.',
    'Урожай сегодня хорош.', 'Наполню корзину и вернусь за остальным.',
  ],
  delivery: ['Полная корзина, пора домой.', 'Вот теперь дважды посмотрю под лапы.', 'Ещё через тропу, и я дома.', 'Держись, корзинка!'],
  rest: ['Найду тенёк и передохну.', 'Лапам тоже нужен перерыв.', 'На подстилке бы сейчас полежать.', 'Поправлю иголки и полежу.'],
  transfer: ['Так, мне теперь в другую сторону.', 'Навещу соседний сад.', 'Интересно, кто там сегодня работает?'],
  scout: ['Где-то здесь пахнет цветами.', 'За тем деревом ещё не смотрел.', 'Надо проверить поляну.', 'Вот здесь уже искал.'],
  forage: ['Самые спелые прячутся под листьями.', 'Не помять бы ягоды по дороге.', 'Загляну под этот куст.', 'От ягод теперь все лапы красные.'],
  water: ['Сначала полью вот этот ряд.', 'Лейка тяжёлая, зато грядки рады.', 'Ещё немного воды сюда.', 'Хорошо, что река рядом.'],
  restock: ['Этот груз ждут в лавке.', 'Всё на месте, можно нести.', 'Надеюсь, к открытию успею.', 'Поставлю ящик рядом с прилавком.'],
  vendor: ['Добрый день! Чем угостить?', 'Минуточку, уже собираю заказ.', 'Есть ещё место на прилавке.', 'Спасибо, заходите ещё!'],
  maker: ['Ещё минутка, и партия готова.', 'Главное, всё отмерить как следует.', 'Проверю, как там следующая партия.', 'Дело спорится, когда всё под лапой.'],
  buyer: ['Надо проверить, сколько осталось банок.', 'Банки лучше нести осторожно.', 'Хорошо бы пополнить запас тары.'],
  miner: ['Вот здесь виднеется уголь.', 'Ещё удар, и кусок отойдёт.', 'После смены придётся отмывать лапы.', 'В шахте хорошо слышно каждый удар.'],
  porter: ['Главное, ничего не перепутать.', 'Следующий груз уже ждёт.', 'У этого ящика свой адрес.', 'Донесу и вернусь за остальным.'],
  driver: ['Поворот пройду потише.', 'Груз на месте, едем!', 'Надеюсь, на пути сухо.', 'Хорошо, что здесь проложили дорогу.'],
  refuel: ['Пора пополнить бак.', 'Канистру лучше держать ровнее.', 'Заправлюсь и поеду.'],
  researcher: ['Запишу, пока не забыл.', 'А если проверить ещё один раз?', 'Кажется, результаты сходятся.', 'Над этой задачей ещё подумаю.'],
  operator: ['Проверю, сколько осталось топлива.', 'Послушаю, ровно ли работает.', 'Посмотрим, хватает ли заряда.', 'За проводами тоже нужен глаз.'],
  training: ['Ещё один подход.', 'Сегодня получается увереннее.', 'Потихоньку втягиваюсь.', 'Этому стоит ещё поучиться.'],
};

const workTypes = new Set(['delivery', 'rest', 'transfer', 'scout', 'forage', 'water', 'restock', 'vendor']);

function activity(state, worker) {
  const job = state.jobs.find(job => job.workers.includes(worker.id));
  if (job?.kind === 'pick') return ['berry', 'wheat'].includes(job.variety ?? state.trees.find(tree => tree.id === job.tree)?.variety) ? 'crop' : 'pick';
  if (workTypes.has(job?.kind)) return job.kind;
  if (worker.train) return 'training';
  if (worker.fuelCan || worker.refueling) return 'refuel';
  if (worker.industryCargo) return 'porter';
  if (state.industry.tractors.some(tractor => tractor.trip?.driverId === worker.id)) return 'driver';
  if (state.industry.workshops.some(shop => shop.batch?.workerId === worker.id)) return 'maker';
  if (state.industry.mines.some(mine => mine.minerId === worker.id && mine.mineAt)) return 'miner';
  if (worker.workRole === 'operator' || worker.workRole === 'buyer' || worker.workRole === 'researcher') return worker.workRole;
  return 'idle';
}

export function advanceDialogue(state, cooldown) {
  if (!state.workers.length || state.quote) return;
  if (state.lastTalk != null && state.time - state.lastTalk < cooldown) return;

  const awake = state.workers.filter(worker => worker.sleepUntil === null);
  if (!awake.length) return;

  const awakeIds = new Set(awake.map(worker => worker.id));
  const coOp = state.jobs.find(job => job.kind === 'pick' && job.workers.length === 2 && job.workers.every(id => awakeIds.has(id)));
  const turn = Math.floor(state.time / cooldown);
  const lead = awake[turn % awake.length];
  let workers;
  let options;
  if (coOp && (!state.firstCoOp || turn % 3 === 0)) {
    state.firstCoOp = true;
    workers = coOp.workers;
    options = harvestTogether;
  } else {
    if (state.guide || state.time < cooldown) return;
    const friend = turn % 3 === 1 && awake.find(other => other.id !== lead.id && distance(lead, other) < 95);
    workers = !friend ? [lead.id] : friend.x < lead.x ? [friend.id, lead.id] : [lead.id, friend.id];
    options = friend ? friends : lines[turn % 5 === 0 ? 'idle' : activity(state, lead)];
  }

  const line = options[turn % options.length];
  state.quote = { workers, lines: Array.isArray(line) ? line : [line], until: state.time + 4300 };
  state.lastTalk = state.time;
}
