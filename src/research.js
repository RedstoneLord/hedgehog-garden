import { movementPerks, perkEffect } from './perks.js';
import { researchUnlocked } from './commission.js';
import { HOUSE, isFieldCrop, skilledWorkRate } from './orchard.js';
import { adjustStock, canCraft, GOODS, industryStations, nearestHome, homeStock, stockCount } from './industry.js';
import { distance, followRoute } from './routes.js';
import { regionAt, riverDistance, terrainKind, WORLD } from './terrain.js';
import { recordReceipt } from './resource-receipts.js';

export const RESEARCH_BRANCHES = {
  agricultural: 'Земледелие', electrical: 'Электричество', industry: 'Производство',
  workforce: 'Ёжики', comfort: 'Декор и уют', leisure: 'Досуг', shared: 'Общие технологии',
};
// Each project has work, a material order, and a coin charge. The first tier is
// deliberately small relative to the commission so it has an immediate payoff.
export const PROJECTS = {
  irrigation: ['Полив', 'agricultural', 1, [], 4, 250, {wheat:30, berries:40}, 'Открывает насос для ягод и пшеницы.'],
  wideSpray: ['Широкий полив', 'agricultural', 2, ['irrigation'], 12, 750, {wheat:160, flour:50}, 'Увеличивает радиус насоса.'],
  orchardCare: ['Уход за яблонями', 'agricultural', 3, ['wideSpray'], 22, 1450, {apples:400, compote:80}, 'Полив ускоряет созревание яблонь.'],
  fieldTrials: ['Полевые опыты', 'agricultural', 3, ['wideSpray'], 21, 1550, {wheat:350, berries:300}, 'Добавляет по два плода или зерна за урожай.'],
  electricity: ['Электричество', 'electrical', 1, [], 4, 300, {coal:20, fuel:10}, 'Открывает генератор, столбы и работу исследователя.'],
  metering: ['Учёт нагрузки', 'electrical', 2, ['electricity'], 10, 650, {fuel:40, flour:70}, 'Открывает прогноз нагрузки и времени работы.'],
  battery: ['Аккумуляторы', 'electrical', 3, ['metering'], 18, 1350, {fuel:120, coal:150}, 'Открывает большие аккумуляторы.'],
  waterwheel: ['Водяное колесо', 'electrical', 3, ['metering'], 21, 1600, {coal:200, bread:80}, 'Открывает генерацию у реки.'],
  wind: ['Ветряная турбина', 'electrical', 4, ['battery'], 34, 2700, {fuel:210, wheat:360}, 'Открывает генерацию на открытых участках.'],
  bearings: ['Надёжные подшипники', 'electrical', 3, ['metering'], 20, 1400, {coal:200, fuel:100}, 'Генератор дольше работает между поломками.'],
  factoryEfficiency: ['Экономная фабрика', 'industry', 2, ['electricity'], 14, 1050, {slices:120, fuel:85}, 'Фабрики делают партии на 15% быстрее.'],
  retrofit: ['Электропривод', 'industry', 3, ['factoryEfficiency'], 23, 1750, {coal:200, compote:100, fuel:100}, 'Переводит выбранную фабрику на электричество.'],
  modular: ['Сборный склад', 'industry', 3, ['factoryEfficiency'], 19, 1350, {bread:100, flour:175}, 'Увеличивает рабочие запасы станций.'],
  freight: ['Служба доставки', 'industry', 2, ['electricity'], 14, 1000, {bread:100, fuel:85}, 'Увеличивает грузоподъёмность тракторов.'],
  labExpansion: ['Расширение лаборатории', 'industry', 4, ['retrofit'], 34, 2800, {jam:160, bread:200, fuel:180}, 'Лаборатории производят больше ОИ.'],
  training: ['Учебная площадка', 'workforce', 2, ['irrigation'], 11, 850, {provisions:45, bread:60}, 'Открывает курсы для ёжиков.'],
  advancedCourses: ['Сложные курсы', 'workforce', 3, ['training'], 23, 1550, {provisions:140, pie:45}, 'Разрешает тренировать характеристики до 20.'],
  mating: ['Семейный домик', 'workforce', 3, ['training'], 21, 1700, {provisions:90, jam:65}, 'Открывает станцию для появления потомства.'],
  recovery: ['Восстановление', 'workforce', 3, ['training'], 18, 1350, {provisions:110, puree:120}, 'Ёжики быстрее отдыхают.'],
  decoration: ['Садовая мастерская', 'comfort', 2, ['irrigation'], 9, 650, {apples:210, puree:50}, 'Открывает скамьи и клумбы.'],
  frontage: ['Уютная витрина', 'comfort', 3, ['decoration'], 17, 1200, {compote:95, mixedJam:45}, 'Открывает украшения, привлекающие покупателей.'],
  comfort: ['Уютное рабочее место', 'comfort', 3, ['decoration'], 18, 1250, {bread:100, provisions:60}, 'Открывает навесы для ускорения работы.'],
  landscape: ['Садовая коллекция', 'comfort', 3, ['decoration'], 18, 1300, {berries:250, berryCompote:95}, 'Открывает статуи, дорожки и цветники.'],
  wardrobe: ['Гардероб', 'comfort', 3, ['decoration'], 17, 1250, {jam:65, wheat:200}, 'Открывает выбор из трёх новых образов.'],
  puzzle: ['Стол головоломок', 'leisure', 2, ['irrigation'], 10, 700, {apples:180, flour:70}, 'Открывает игры на логику за монеты.'],
  games: ['Садовые игры', 'leisure', 3, ['puzzle'], 17, 1300, {bread:120, slices:160}, 'Добавляет игры на память и счёт.'],
  chance: ['Стол удачи', 'leisure', 3, ['puzzle'], 16, 1400, {pie:75, compote:140}, 'Открывает игры со ставками в монетах.'],
  recreation: ['Уголок отдыха', 'leisure', 3, ['games'], 19, 1450, {provisions:140, berryCompote:95}, 'Открывает мебель для зоны досуга.'],
  efficientPumps: ['Экономный насос', 'shared', 3, ['irrigation','metering'], 16, 1250, {coal:150, wheat:225}, 'Снижает потребление насосов с 4 до 3.'],
  biofuel: ['Плодовое биотопливо', 'shared', 4, ['fieldTrials','electricity'], 24, 1650, {apples:400, berries:320, fuel:65}, 'Открывает новое топливо из яблок и ягод.'],
  poweredLoading: ['Электропогрузка', 'shared', 3, ['metering','freight'], 21, 1500, {fuel:100, flour:180}, 'Сокращает погрузку корзин возле сети.'],
  lounge: ['Комната отдыха', 'shared', 4, ['recovery','comfort'], 26, 2000, {provisions:180, bread:175}, 'Открывает место для быстрого отдыха.'],
  lamps: ['Светлая лавка', 'shared', 4, ['electricity','frontage'], 23, 1750, {berryCompote:140, mixedJam:80}, 'Освещённые украшения привлекают покупателей.'],
  festival: ['Праздничная поляна', 'shared', 4, ['landscape','games'], 26, 2200, {pie:110, berries:460}, 'Открывает украшения для оживлённой площади.'],
  controls: ['Управление сетью', 'shared', 5, ['bearings','labExpansion'], 40, 3200, {fuel:320, jam:220, coal:460}, 'Упрощает диагностику и снижает затраты на ремонт.'],
};
export const RESEARCH_BUILDINGS = {
  lab: ['Лаборатория','table',650,null],
  generator: ['Генератор','fuel',900,'electricity'],
  pole: ['Столб','track',65,'electricity'],
  battery: ['Аккумулятор','fuel',550,'battery'],
  wheel: ['Водяное колесо','water',1350,'waterwheel'],
  turbine: ['Ветряная турбина','flower',1700,'wind'],
  pump: ['Насос','water',420,'irrigation'],
  trainer: ['Учебная площадка','strength',850,'training'],
  mating: ['Семейный домик','house',1100,'mating'],
  wardrobe: ['Гардероб','edit',600,'wardrobe'],
  puzzle: ['Стол головоломок','table',400,'puzzle'],
  chance: ['Стол удачи','coin',500,'chance'],
  bench: ['Скамья','bed',90,'decoration'],
  gardenPath: ['Садовая тропинка','track',55,'decoration'],
  gardenFence: ['Декоративная ограда','fence',95,'landscape'],
  flowers: ['Цветник','flower',140,'decoration'],
  sign: ['Вывеска','market',210,'frontage'],
  shelter: ['Навес','house',240,'comfort'],
  statue: ['Статуя','crown',380,'landscape'],
  lounge: ['Место отдыха','bed',400,'lounge'],
  lamp: ['Фонарь','gold',250,'lamps'],
  square: ['Праздничная клумба','flower',440,'festival'],
  playset: ['Игровой стол','table',350,'recreation'],
};
export const hasResearch = (state, key) => state.research?.projects?.includes(key) ?? false;
export const researchSites = state => state.research?.sites ?? [];
export const researchSite = (state, id) => researchSites(state).find(site => site.id === id);
export const stationLabel = site => RESEARCH_BUILDINGS[site.kind]?.[0] ?? '';
export const FUELS = { coal: 22, fuel: 60, biofuel: 46 };
const WIRE_RANGE = 360;
export const GRID_COVERAGE = 290;
export const wireRange = state => state.upgrades.includes('insulatedPoles') ? WIRE_RANGE * 1.1 : WIRE_RANGE;
const output = { generator: 12, wheel: 7, turbine: 9 };
const consumerTypes = { lab: 5, pump: 4, lamp: 1 };
const capacities = { generator: 14, battery: 130 };
export const fuelCapacity = state => hasResearch(state, 'controls') ? 32 : 24;
const workerAt = (worker, site) => distance(worker, site) < 12;
const typeFor = { lab:'researcher', generator:'operator' };

export function researchWorkplaces(state) {
  return researchSites(state).filter(site => typeFor[site.kind]).map(site => ({
    id: site.id, industryId: site.id, kind: site.kind, label: stationLabel(site), icon: RESEARCH_BUILDINGS[site.kind][1], roles: [typeFor[site.kind]],
  }));
}
const workshopDemand = (state, site) => site.electric && (site.batch?.method === 'factory' || !site.batch && site.automatic !== false && canCraft(state,site,site.recipe)) ? 8 : 0;
export const chargeCapacity = site => capacities[site.kind] ?? 0;
export function researchBuildSite(state, kind, point) {
  if (!researchUnlocked(state) || !Object.hasOwn(RESEARCH_BUILDINGS, kind) || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  const { x, y } = point;
  if (x < WORLD.x + 24 || y < WORLD.y + 24 || x > WORLD.x + WORLD.width - 24 || y > WORLD.y + WORLD.height - 24
    || terrainKind(point) !== 'ground' || kind === 'wheel' && riverDistance(point) > 140
    || kind === 'turbine' && regionAt(x,y) === 'forest') return null;
  const clearance = kind === 'pole' ? 28 : 57;
  if ([HOUSE, ...researchSites(state), ...industryStations(state), ...state.trade.stalls, ...state.orchards.map(plot => plot.basket)].some(site => distance(site, point) < clearance)
    || state.trees.some(tree => distance(tree, point) < 28)) return null;
  return { x, y };
}
export function researchBlocked(state, key) {
  const project = PROJECTS[key];
  if (!researchUnlocked(state) || !project || hasResearch(state,key) || key === 'biofuel' && !state.industry.workshops.length) return true;
  return !project[3].every(id => hasResearch(state,id)) || (state.research?.rp ?? 0) < project[4]
    || state.trade.coins < project[5] || Object.entries(project[6]).some(([item, qty]) => stockCount(state,item) < qty);
}
export function initializeResearch(state) {
  state.research ??= { rp: 0, preview: 0, projects: [], sites: [], challenge: null, training: {}, pairings: {}, wardrobe: {} };
  return state.research;
}
const pick = (state, count) => {
  state.random = (1664525 * state.random + 1013904223) >>> 0;
  return Math.floor(state.random / 4294967296 * count);
};
const questions = [
  ['Какой ресурс производит угольная шахта?', ['Уголь','Мука','Яблоки','Стекло']],
  ['Что нужно всходам пшеницы после посадки?', ['Вода','Топливо','Монеты','Мука']],
  ['Как называется плод дуба?', ['Жёлудь','Орех','Груша','Шишка']],
  ['Из чего получается мука в мастерской?', ['Пшеница','Банки','Ягоды','Уголь']],
];
function makeChallenge(state, type, difficulty) {
  const a = 2 + pick(state, 4 + difficulty * 6), b = 2 + pick(state, 4 + difficulty * 5);
  if (type === 'quiz') {
    const [text, values] = questions[pick(state,questions.length)];
    const offset = pick(state,values.length);
    return { text, values:[...values.slice(offset),...values.slice(0,offset)], answer: values[0] };
  }
  if (type === 'memory') {
    const code = Array.from({length:difficulty + 2}, () => 1 + pick(state,9)).join('');
    return { text:code, answer:code, memory:true };
  }
  if (type === 'logic') {
    const step = difficulty * 2;
    return { text: `${a}, ${a+step}, ${a+step*2}, ${a+step*3}, …`, answer: a+step*4 };
  }
  return { text: difficulty === 1 ? `${a} + ${b} = ?` : difficulty === 2 ? `${a} × ${b} = ?` : `${a} × ${b} − ${b} = ?`,
    answer: difficulty === 1 ? a + b : difficulty === 2 ? a*b : a*b-b };
}

export const researchActions = {
  buyResearch(state, { key }) {
    if (researchBlocked(state,key)) return false;
    const [, , , , rp, coins, goods] = PROJECTS[key];
    state.research.rp -= rp;
    state.trade.coins -= coins;
    for (const [item, qty] of Object.entries(goods)) adjustStock(state,item,-qty);
    state.research.projects.push(key);
    return true;
  },
  startChallenge(state, { type, difficulty, stationId }) {
    const site = researchSite(state,stationId);
    const leisure = site?.kind === 'puzzle';
    if (!researchUnlocked(state) || !['math','logic','quiz',...(leisure && hasResearch(state,'games') ? ['memory'] : [])].includes(type)
      || ![1,2,3].includes(difficulty) || stationId !== undefined && !leisure) return false;
    const research = initializeResearch(state);
    if (research.challenge) return false;
    research.challenge = { ...makeChallenge(state,type,difficulty), difficulty, leisure, stationId, serial:state.nextId++ };
    return true;
  },
  solveChallenge(state, { guess }) {
    const challenge = state.research?.challenge;
    if (!challenge || String(guess).trim() !== String(challenge.answer)) return false;
    const amount = [0,4,7,10][challenge.difficulty];
    if (challenge.leisure) state.trade.coins += amount * 3;
    else state.research.rp += amount;
    recordReceipt(state, challenge.stationId ?? 'manual-research', challenge.leisure ? 'coin' : 'flask', challenge.leisure ? amount * 3 : amount);
    state.research.challenge = null;
    return true;
  },
  abandonChallenge(state) {
    if (!state.research?.challenge) return false;
    state.research.challenge = null;
    return true;
  },
  buildResearch(state, { kind, point }) {
    const site = researchBuildSite(state, kind, point);
    if (!site) return false;
    const [, , coins, gate] = RESEARCH_BUILDINGS[kind];
    if (gate && !hasResearch(state,gate) || state.trade.coins < coins) return false;
    state.trade.coins -= coins;
    initializeResearch(state).sites.push({ ...site, kind, id: `research:${state.nextId++}`,
      ...(kind === 'generator' ? { fuel: 'coal', stock: {}, charge: 0, wear: 0 } : kind === 'battery' ? { charge: 0 } : {}) });
    return true;
  },
  selectFuel(state, { id, key }) {
    const site = researchSite(state,id);
    if (site?.kind !== 'generator' || !Object.hasOwn(FUELS,key) || key === 'biofuel' && !hasResearch(state,key)) return false;
    site.fuel = key;
    return true;
  },
  carryFuel(state, { id }) {
    const site = researchSite(state,id);
    if (site?.kind !== 'generator') return false;
    const amount = Math.min(8, fuelCapacity(state) - (site.stock[site.fuel] ?? 0), stockCount(state,site.fuel));
    if (amount <= 0) return false;
    adjustStock(state,site.fuel,-amount);
    site.stock[site.fuel] = (site.stock[site.fuel] ?? 0) + amount;
    recordReceipt(state, site.id, GOODS[site.fuel].icon, amount);
    return true;
  },
  repairGenerator(state, { id }) {
    const site = researchSite(state,id);
    const cost = hasResearch(state,'controls') ? 4 : 8;
    if (site?.kind !== 'generator' || !site.broken || stockCount(state,'coal') < cost) return false;
    adjustStock(state,'coal',-cost);
    site.broken = false;
    site.wear = 0;
    return true;
  },
  retrofitFactory(state, { id }) {
    const site = state.industry.workshops.find(site => site.id === id);
    if (!hasResearch(state,'retrofit') || site?.level !== 3 || site.batch) return false;
    site.electric = !site.electric;
    return true;
  },
  playChance(state, { id, stake }) {
    if (researchSite(state,id)?.kind !== 'chance' || ![10,25,50].includes(stake) || state.trade.coins < stake) return false;
    const won = pick(state,100) < 46;
    state.trade.coins += won ? stake : -stake;
    recordReceipt(state, id, 'coin', won ? stake : -stake);
    state.research.chance = { id, won, stake, serial: state.nextId++ };
    return true;
  },
};

export function powerNetworks(state) {
  const sites = researchSites(state);
  const anchors = sites.filter(site => site.kind === 'pole' || Object.hasOwn(output,site.kind) || site.kind === 'battery');
  const networks = [];
  const seen = new Set();
  const range = wireRange(state);
  for (const anchor of anchors) {
    if (seen.has(anchor.id)) continue;
    const nodes = [anchor], links = [];
    seen.add(anchor.id);
    for (const node of nodes) for (const other of anchors) {
      if (!seen.has(other.id) && distance(node,other) <= range) {
        links.push([node,other]); nodes.push(other); seen.add(other.id);
      }
    }
    networks.push({ nodes, links, consumers: [], supply: 0, demand: 0, fraction: 0 });
  }
  const consumers = sites.filter(site => Object.hasOwn(consumerTypes,site.kind))
    .concat(state.industry.workshops.filter(site => site.electric));
  for (const site of consumers) {
    let selected, nearest = GRID_COVERAGE;
    for (const net of networks) for (const node of net.nodes) {
      const gap = distance(site,node);
      if (gap > nearest) continue;
      selected = net; nearest = gap;
    }
    selected?.consumers.push(site);
  }
  return networks;
}
export function gridPlacement(state, kind, point) {
  const connector = ['generator','pole','battery','wheel','turbine'].includes(kind);
  const consumer = kind === 'lab' || kind === 'lamp' || kind === 'pump';
  if (!connector && !consumer) return null;
  const range = connector ? wireRange(state) : GRID_COVERAGE;
  const nets = powerNetworks(state).filter(net => net.nodes.some(site => distance(point,site) <= range));
  if (!connector && nets.length > 1) nets.sort((a,b) => Math.min(...a.nodes.map(node => distance(point,node))) - Math.min(...b.nodes.map(node => distance(point,node)))).splice(1);
  const links = nets.map(net => net.nodes.reduce((nearest,node) => distance(point,node) < distance(point,nearest) ? node : nearest, net.nodes[0]));
  const supply = (output[kind] ?? 0) + nets.reduce((sum,net) => sum + (net.nodes[0].grid?.supply ?? 0),0);
  const demand = (consumerTypes[kind] ?? 0) + nets.reduce((sum,net) => sum + (net.nodes[0].grid?.demand ?? 0),0);
  return { links, supply, demand, coverage:range, consumers:nets.reduce((sum,net) => sum + net.consumers.length,0) };
}
const fuelSeconds = site => (site.residual?.[site.fuel] ?? 0) + (site.stock[site.fuel] ?? 0) * FUELS[site.fuel];
function useFuel(site, seconds) {
  site.residual ??= {};
  let left = site.residual[site.fuel] ?? 0;
  while (left < seconds && site.stock[site.fuel] > 0) {
    site.stock[site.fuel]--;
    left += FUELS[site.fuel];
  }
  site.residual[site.fuel] = Math.max(0,left-seconds);
}
export function poweredNear(state, point) {
  if (!hasResearch(state,'poweredLoading')) return false;
  return researchSites(state).some(site => (site.output > 0 || site.power > 0) && distance(site,point) <= GRID_COVERAGE);
}
export function loungeNear(state, worker) {
  return hasResearch(state,'lounge') && researchSites(state).some(site => site.kind === 'lounge' && distance(site,worker) <= 230);
}
export function decorationBonus(state, point, kind) {
  const sites = researchSites(state);
  return kind === 'work'
    ? Math.min(.12, sites.filter(site => site.kind === 'shelter' && distance(site,point) < 230).length * .04)
    : Math.min(.28, sites.filter(site => (['sign','square'].includes(site.kind) || site.kind === 'lamp' && site.power > 0) && distance(site,point) < 265).length
      * (state.upgrades.includes('marketBeautification') ? .077 : .07));
}

export function advanceResearch(state, seconds, plan, water, earned) {
  if (!state.research || !seconds) return;
  const sites = researchSites(state);
  if (!sites.length && !state.industry.workshops.some(site => site.electric)) return;
  const busy = new Set(state.jobs.flatMap(job => job.workers));
  const atSite = new Map();
  for (const worker of state.workers) {
    if (busy.has(worker.id) || worker.stayAt || worker.pairing || ((worker.pendingAssignment || worker.retirePending) && !worker.powerCargo) || worker.sleepUntil !== null || !['researcher','operator'].includes(worker.workRole)) continue;
    const site = researchSite(state,worker.siteId);
    if (!site || atSite.has(site.id)) continue;
    if (site.kind === 'generator') {
      if (worker.powerCargo) {
        if (workerAt(worker,site)) {
          const { key, amount } = worker.powerCargo;
          const accepted = Math.min(amount,Math.max(0,fuelCapacity(state) - (site.stock[key] ?? 0)));
          site.stock[key] = (site.stock[key] ?? 0) + accepted;
          recordReceipt(state, site.id, GOODS[key].icon, accepted);
          if (amount > accepted) adjustStock(state,key,amount - accepted,nearestHome(state,site));
          delete worker.powerCargo;
        }
      } else if (!site.broken && (site.stock[site.fuel] ?? 0) < 5) {
        const home = nearestHome(state,site,site.fuel);
        if (home && workerAt(worker,home)) {
          const amount = Math.min(homeStock(state,home,site.fuel),fuelCapacity(state) - (site.stock[site.fuel] ?? 0),10 + perkEffect(worker,'fuelCarry'));
          adjustStock(state,site.fuel,-amount,home);
          worker.powerCargo = { key:site.fuel, amount };
        } else if (home) {
          walk(worker,home);
          continue;
        }
      }
    }
    if (!workerAt(worker,site)) walk(worker,site);
    if (workerAt(worker,site)) atSite.set(site.id,worker);
  }
  function walk(worker,target) {
    const route = worker.researchRoute;
    if (!route || route.x !== target.x || route.y !== target.y) worker.researchRoute = plan(worker,target);
    if (worker.researchRoute) followRoute(worker,worker.researchRoute,(115 + (worker.stats.speed - 5) * 6) * movementPerks(state,worker),seconds,state.industry.roads);
  }
  for (const site of [...sites,...state.industry.workshops.filter(site => site.electric)]) { site.power = 0; if (output[site.kind]) site.output = 0; }
  for (const net of powerNetworks(state)) {
    const want = site => site.kind === 'lab' ? (atSite.has(site.id) ? 5 : 0)
      : site.kind === 'pump' && hasResearch(state,'efficientPumps') ? 3 : consumerTypes[site.kind] ?? workshopDemand(state,site);
    net.demand = net.consumers.reduce((sum,site) => sum + want(site),0);
    const generators = net.nodes.filter(site => site.kind === 'generator' && !site.broken);
    const banks = net.nodes.filter(site => chargeCapacity(site));
    const renewable = net.nodes.reduce((sum,site) => sum + (site.kind === 'wheel' ? output.wheel : site.kind === 'turbine' ? output.turbine : 0),0);
    const thermal = generators.map(site => [site, Math.min(12, 12 * fuelSeconds(site) / seconds)]);
    for (const site of net.nodes) if (['wheel','turbine'].includes(site.kind)) site.output = output[site.kind];
    net.supply = renewable + thermal.reduce((sum,[,cap]) => sum + cap,0);
    let remaining = Math.max(0,net.demand - renewable);
    const charging = net.demand > 0 && net.supply >= net.demand
      ? Math.min(2,banks.reduce((sum,site) => sum + (chargeCapacity(site) - (site.charge ?? 0)) / seconds,0)) : 0;
    remaining = Math.max(0,net.demand + charging - renewable);
    for (const [site,cap] of thermal) {
      const spent = Math.min(remaining,cap);
      remaining -= spent;
      site.output = spent;
      if (spent) useFuel(site,seconds * spent / 12);
      const operator = atSite.get(site.id);
      if (spent) {
        site.wear = (site.wear ?? 0) + seconds * spent / 12 * (operator ? .32 * perkEffect(operator,'wear',1) : 1);
        if (site.wear >= (hasResearch(state,'bearings') ? 450 : 270)) site.broken = true;
        if (operator && Math.floor(site.wear / 40) > Math.floor((site.wear - seconds * spent / 12 * .32) / 40)) earned?.(operator,'operator');
      }
    }
    const served = Math.max(0,net.demand - remaining);
    let storageNeed = net.demand - served;
    for (const bank of banks) if (storageNeed > 0 && bank.charge > 0) {
      const drawn = Math.min(4,storageNeed,bank.charge / seconds);
      bank.charge -= drawn * seconds;
      storageNeed -= drawn;
    }
    let surplus = Math.max(0,charging - remaining);
    for (const bank of banks) if (surplus > 0) {
      const stored = Math.min(surplus,(chargeCapacity(bank) - (bank.charge ?? 0)) / seconds);
      bank.charge = (bank.charge ?? 0) + stored * seconds;
      surplus -= stored;
    }
    for (const node of net.nodes) node.grid = { supply:net.supply, demand:net.demand };
    net.fraction = net.demand ? (net.demand - storageNeed) / net.demand : 0;
    for (const site of net.consumers) site.power = net.fraction;
  }
  for (const site of sites) {
    const operator = atSite.get(site.id);
    if (operator && site.kind === 'generator' && site.broken) {
      site.repair = (site.repair ?? 0) + seconds * skilledWorkRate(operator,'handling',.016);
      if (site.repair >= (state.upgrades.includes('maintainerKit') ? 9 : 10) * perkEffect(operator,'repair',1) && researchActions.repairGenerator(state,{id:site.id})) {
        site.repair = 0; earned?.(operator,'operator');
      }
    } else if (site.kind === 'lab' && operator && site.power) {
      site.work = (site.work ?? 0) + seconds * site.power * (hasResearch(state,'labExpansion') ? 1.6 : 1) * perkEffect(operator,'research',1) * skilledWorkRate(operator,'foraging',.018) * (state.upgrades.includes('fieldNotes') ? 1.05 : 1);
      const reward = Math.floor(site.work / 12);
      if (reward) {
        site.work -= reward * 12;
        state.research.rp += reward;
        recordReceipt(state, site.id, 'flask', reward);
        earned?.(operator,'researcher');
      }
    } else if (site.kind === 'pump' && site.power) {
      site.work = (site.work ?? 0) + seconds * site.power;
      if (site.work >= 4) {
        site.work %= 4;
        const radius = hasResearch(state,'wideSpray') ? 215 : 155;
        for (const tree of state.trees) if (distance(site,tree) <= radius) {
          if (isFieldCrop(tree.variety) && !tree.fruit && tree.readyAt === null) water(tree);
          else if (hasResearch(state,'orchardCare') && !isFieldCrop(tree.variety) && tree.readyAt > state.time) tree.readyAt -= 800;
        }
      }
    }
  }
}

export function validResearch(data) {
  if (data === undefined) return true;
  return data && Number.isSafeInteger(data.rp) && data.rp >= 0 && Array.isArray(data.projects)
    && data.projects.every(key => Object.hasOwn(PROJECTS,key)) && Array.isArray(data.sites)
    && new Set(data.sites.map(site => site?.id)).size === data.sites.length
    && data.sites.every(site => site && Object.hasOwn(RESEARCH_BUILDINGS,site.kind) && typeof site.id === 'string'
      && Number.isFinite(site.x) && Number.isFinite(site.y)
      && (site.kind !== 'generator' || Object.hasOwn(FUELS,site.fuel) && site.stock && Object.entries(site.stock).every(([key,qty]) => Object.hasOwn(FUELS,key) && Number.isSafeInteger(qty) && qty >= 0)));
}
