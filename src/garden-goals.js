import { SCIENTIST_GOODS, SCIENTIST_PRICE, scientistStall } from './commission.js';
import { PRODUCTION_PRICE, stockCount } from './industry.js';
import { FOREST_ORCHARD, SHOP } from './orchard.js';
import { hasResearch, researchSites } from './research.js';
import { farmAvailable, landPrice, PERMIT_PRICE } from './trade.js';

const format = new Intl.NumberFormat('ru-RU');
const counter = (amount, target, unit) => `${format.format(Math.min(amount, target))} / ${format.format(target)} ${unit}`;
const goal = (id, title, text, action, progress) => ({ id, title, text, action, progress });
const firstStall = state => state.trade.stalls[0];

export function gardenGoals(state) {
  if (!state.workers.length) return [];
  const { trade, industry } = state;
  const market = firstStall(state);
  if (!trade.permit) {
    if (!state.orchards.some(orchard => orchard.id === FOREST_ORCHARD)) {
      return [goal('forest', 'Открой Лесной сад', 'Купи Лесной сад в «Лавке». Большие лесные яблоки помогут накопить запас для торговли.',
        { kind:'shop', label:'Лавка' }, counter(state.apples, SHOP.forestPlot.base, 'яблок'))];
    }
    return [goal('permit', 'Получи разрешение на торговлю', 'Разрешение в «Лавке» даёт место под первую торговую лавку. По дороге к ней будут приходить путники.',
      { kind:'shop', label:'Лавка' }, counter(state.apples, PERMIT_PRICE, 'яблок'))];
  }

  if (!market) return [goal('stall', 'Поставь торговую лавку', 'В «Лавке» выбери место для торговой лавки. Зелёная обочина означает больший поток, а рядом с домами и другими лавками спрос ниже.',
    { kind:'placement', mode:'market', label:'Выбрать место' })];

  const goals = [];
  if (!industry.unlocked) {
    if (trade.marketUpgrades < 2) goals.push(goal('market-upgrades', 'Купи два улучшения лавки',
      'Открой торговую лавку и выбери любые два улучшения. Чтобы держать фрукты на прилавке даже между заказами, назначь ёжика снабженцем.',
      { kind:'market', id:market.id, label:'Торговая лавка' }, counter(trade.marketUpgrades, 2, 'улучшения')));
    else if (!trade.berryFarm) {
      goals.push(farmAvailable(state)
        ? goal('farm', 'Поставь первую ферму', 'Купи ферму и поставь её на свободной поляне. Посади кусты, набери воду у реки и полей посадки. Полив можно поручить ёжику.',
          { kind:'placement', mode:'farm', label:'Выбрать место' }, counter(trade.coins, landPrice(state,true), 'монет'))
        : goal('berry-order', 'Прими заказ на ягоды', 'Через некоторое время после открытия лавки кто-нибудь попросит ягоды. Прими этот заказ, чтобы открыть дикие кусты и покупку фермы. Пока гости идут, продолжай продавать яблоки.',
          { kind:'market', id:market.id, label:'Торговая лавка' }));
    }
    if (trade.coins >= PRODUCTION_PRICE) {
      goals.unshift(goal('production', 'Открой производство', 'Открой «Хозяйство» → «Строительство» и купи производство за 10 000 монет. Затем можно поставить мастерскую рядом с дорогой.',
        { kind:'build', label:'Строительство' }, counter(trade.coins, PRODUCTION_PRICE, 'монет')));
    } else if (trade.marketUpgrades >= 2) {
      goals.push(goal('production-coins', 'Накопи 10 000 монет', 'Продажи приносят монеты. Вывески привлекают гостей, репутация повышает оплату, а снабженцы и продавцы могут работать без тебя.',
        { kind:'market', id:market.id, label:'Торговая лавка' }, counter(trade.coins, PRODUCTION_PRICE, 'монет')));
    }
    return goals;
  }

  const workshop = industry.workshops[0];
  if (!workshop) goals.push(goal('workshop', 'Поставь мастерскую', 'В «Хозяйстве» можно поставить мастерскую рядом с дорогой или домом. Начни с яблочных долек: для этого рецепта нужны только яблоки.',
    { kind:'build', label:'Строительство' }));
  else if (!industry.firstManualBatch && !industry.knownProducts.length && !workshop.batch) {
    goals.push(goal('batch', 'Приготовь первую партию', 'Открой мастерскую, выбери рецепт и приготовь партию вручную. Ёжик-мастер может готовить сам, если ингредиенты доставлены на станцию.',
      { kind:'station', id:workshop.id, label:'Мастерская' }));
  } else if (!industry.firstWorkshopDelivery && !industry.knownProducts.some(key => stockCount(state,key) > 0)) {
    goals.push(goal('delivery', 'Отнеси готовую партию на склад', 'Когда партия готова, открой мастерскую и отнеси товар в ближайшее хранилище. Для следующих партий можно назначить грузчика.',
      { kind:'station', id:workshop.id, label:'Мастерская' }));
  }
  if (!(industry.warehouses?.length > 0)) goals.push(goal('warehouse', 'Поставь отдельный склад', 'Открой «Хозяйство» → «Строительство» и поставь склад рядом с мастерской или на маршруте доставки. Он принимает грузы и доступен снабженцам, грузчикам и тракторам.',
    { kind:'build', label:'Строительство' }));
  if (workshop && !industry.mines.length) goals.push(goal('mine', 'Поставь угольную шахту', 'Открой «Хозяйство» → «Строительство» и выбери месторождение в северных горах. Из угля мастерская делает топливо.',
    { kind:'build', label:'Строительство' }));
  else if (industry.mines.length && !stockCount(state,'fuel') && !industry.knownGoods?.includes('fuel')) {
    goals.push(goal('fuel', 'Сделай первое топливо', 'Добудь уголь, доставь его в дом и запусти рецепт «Топливо» в мастерской. Топливо нужно для тракторов и фабрик.',
      { kind:'station', id:industry.mines[0].id, label:'Шахта' }));
  } else if (workshop && !industry.tractors.length) {
    goals.push(goal('tractor', 'Подготовь первый трактор', 'Поставь трактор рядом с дорогой, назначь водителя и приготовь запас топлива. Водитель сам заберёт груз для доступного рейса.',
      { kind:'build', label:'Строительство' }));
  }
  if (!trade.berryFarm) goals.push(goal('farm', 'Поставь первую ферму', 'На ферме можно выращивать ягоды и пшеницу. Посадки нужно полить у реки. Пшеница превращается в муку в мастерской.',
    { kind:'placement', mode:'farm', label:'Выбрать место' }, counter(trade.coins, landPrice(state,true), 'монет')));

  const science = state.scientist;
  const scientistMarket = scientistStall(state);
  if (science?.stage === 'offered' && scientistMarket) {
    goals.unshift(goal('scientist', 'Встреть учёного', 'У старейшей лавки ждёт необычный гость. Открой лавку и прочитай его предложение.',
      { kind:'market', id:scientistMarket.id, label:'К учёному' }));
  } else if (science?.stage === 'accepted') {
    const ready = Object.entries(SCIENTIST_GOODS).filter(([key, count]) => (science.bank[key] ?? 0) >= count).length;
    goals.unshift(goal('commission', 'Выполни заказ учёного', 'Образцы можно отвезти вручную или поручить доставку ёжикам и тракторам. Когда все товары зачислены, заверши заказ в лавке и заплати 25 000 монет.',
      scientistMarket ? { kind:'market', id:scientistMarket.id, label:'К заказу' } : { kind:'placement', mode:'market', label:'Поставить лавку' },
      ready === Object.keys(SCIENTIST_GOODS).length ? counter(trade.coins, SCIENTIST_PRICE, 'монет') : counter(ready, Object.keys(SCIENTIST_GOODS).length, 'позиций')));
  } else if (science?.stage === 'complete') {
    if (!hasResearch(state,'electricity') && !hasResearch(state,'irrigation')) {
      goals.unshift(goal('first-project', 'Изучи первый проект', 'Открой «Исследования» и реши задачу в разделе «Ручная работа». Очки, монеты и материалы можно потратить на электричество или полив.',
        { kind:'research', label:'Исследования' }));
    } else if (hasResearch(state,'electricity') && !researchSites(state).some(site => site.kind === 'lab')) {
      goals.unshift(goal('lab', 'Запусти лабораторию', 'В исследованиях поставь генератор и лабораторию рядом или соедини их столбами. Заправь генератор и назначь ёжика-исследователя.',
        { kind:'research', label:'Исследования' }));
    } else if (hasResearch(state,'irrigation') && !researchSites(state).some(site => site.kind === 'pump')) {
      goals.unshift(goal('pump', 'Поставь насос для полива', 'Насос ставится у реки. Подведи к нему питание, чтобы поливать ближайшие посевы.',
        { kind:'research', label:'Исследования' }));
    }
  }
  return goals;
}
