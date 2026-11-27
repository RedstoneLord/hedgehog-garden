import { researchUnlocked } from './commission.js';
import { adjustStock, housingCapacity, nearestHome, stockCount } from './industry.js';
import { HOUSE, DEFAULT_STATS } from './orchard.js';
import { PERKS, rollPerk, workerPerks } from './perks.js';
import { hasResearch, researchSite } from './research.js';
import { distance, followRoute } from './routes.js';

export const RETIRE_WINDOW = 15 * 60 * 1000;
const stats = Object.keys(DEFAULT_STATS);
const bounded = value => Math.max(1,Math.min(20,Math.round(value)));
function draw(state) {
  state.random = (Math.imul(state.random,1664525) + 1013904223) >>> 0;
  return state.random / 4294967296;
}
const pick = (state,list) => list[Math.floor(draw(state) * list.length)];
export function trainingCost(state, worker, stat) {
  const level = worker?.stats[stat] ?? 20;
  const duration = Math.round(5500 * (level + 1) ** 1.52 * (level < 10 && state.upgrades.includes('apprenticeship') ? .9 : 1));
  return { duration, materials: level >= 14 ? Math.ceil((level - 12) * 4 * (state.upgrades.includes('instructorBench') ? .9 : 1)) : 0,
    available: level < 20 && (level < 14 || hasResearch(state,'advancedCourses')) };
}
export function chooseOffspring(state, first, second) {
  const result = { ...first.stats };
  const extreme = draw(state) < .0006 ? pick(state,stats) : undefined;
  for (const key of stats) {
    const initialA = first.originalStats?.[key] ?? first.stats[key];
    const initialB = second.originalStats?.[key] ?? second.stats[key];
    const mean = (initialA + initialB + .5 * (first.stats[key] - initialA + second.stats[key] - initialB)) / 2;
    result[key] = extreme ? (key === extreme ? 20 : 1) : bounded(mean + (draw(state) < .28 ? pick(state,[-2,-1,1,2]) : 0));
  }
  const a = workerPerks(first), b = workerPerks(second);
  const perks = [...new Set([...a,...b])].map(id => ({
    id, rank: draw(state),
    eligible: draw(state) < (PERKS[id]?.tier === 'unique' ? .006 : a.includes(id) && b.includes(id) ? .6 : .28),
  })).filter(item => item.eligible).sort((a,b) => a.rank-b.rank).slice(0,3).map(item => item.id);
  if (perks.length < 3 && draw(state) < .085) {
    const perk = rollPerk(draw(state)*100,draw(state));
    if (!perks.includes(perk)) perks.push(perk);
  }
  const parent = draw(state) < .5 ? first : second;
  return { stats:result, originalStats:{...result}, perks, perk:null,
    quills: draw(state) < .18 ? Math.floor(draw(state)*8) : parent.quills,
    skin: draw(state) < .18 ? Math.floor(draw(state)*8) : parent.skin,
    hat: draw(state) < .12 ? pick(state,[null,'berry','leaf','acorn']) : parent.hat };
}
export const reservedHousing = state => (state.pairingJobs ?? []).length;
const busy = (state, worker) => state.jobs.some(job => job.workers.includes(worker.id))
  || state.industry.workshops.some(site => site.batch?.workerId === worker.id)
  || state.industry.tractors.some(({trip}) => trip?.driverId === worker.id) || worker.industryCargo || worker.fuelCan || worker.powerCargo;
const present = (state, id) => state.workers.find(worker => worker.id === id);
const validSite = (state, id, kind) => researchSite(state,id)?.kind === kind;
export const developmentActions = {
  startTraining(state, { id, siteId, stat }) {
    const worker = present(state,id);
    if (!Object.hasOwn(DEFAULT_STATS,stat) || !worker || worker.retirePending || worker.train || worker.pairing
      || !validSite(state,siteId,'trainer') || state.workers.some(other => other.train?.siteId === siteId) || busy(state,worker)) return false;
    const quote = trainingCost(state,worker,stat);
    if (!quote.available || stockCount(state,'provisions') < quote.materials) return false;
    adjustStock(state,'provisions',-quote.materials);
    worker.originalStats ??= { ...worker.stats };
    worker.train = { stat, siteId, duration:quote.duration };
    worker.stayAt = siteId;
    return true;
  },
  startPairing(state, { siteId, first, second }) {
    const a = present(state,first), b = present(state,second);
    if (!validSite(state,siteId,'mating') || !a || !b || a === b || a.train || b.train || a.pairing || b.pairing || a.retirePending || b.retirePending
      || busy(state,a) || busy(state,b) || state.workers.length + reservedHousing(state) >= housingCapacity(state)
      || stockCount(state,'provisions') < 8 || state.pairingJobs?.some(job => job.siteId === siteId)) return false;
    adjustStock(state,'provisions',-8);
    const result = chooseOffspring(state,a,b);
    const job = { id:state.nextId++, siteId, first, second, result };
    (state.pairingJobs ??= []).push(job);
    a.pairing = job.id; b.pairing = job.id;
    return true;
  },
  previewWardrobe(state, { id, siteId }) {
    const worker = present(state,id);
    if (!worker || !validSite(state,siteId,'wardrobe') || worker.wardrobe || state.trade.coins < 40) return false;
    state.trade.coins -= 40;
    const looks = [];
    const seen = new Set([`${worker.quills}/${worker.skin}/${worker.hat}`]);
    while (looks.length < 3) {
      const look = { quills:Math.floor(draw(state)*8), skin:Math.floor(draw(state)*8), hat:pick(state,[null,'berry','leaf','acorn']) };
      const key = `${look.quills}/${look.skin}/${look.hat}`;
      if (!seen.has(key)) { seen.add(key); looks.push(look); }
    }
    worker.wardrobe = looks;
    return true;
  },
  applyWardrobe(state, { id, index }) {
    const worker = present(state,id);
    if (!worker?.wardrobe || !Number.isInteger(index) || index < -1 || index > 2) return false;
    if (index >= 0) Object.assign(worker,worker.wardrobe[index]);
    delete worker.wardrobe;
    return true;
  },
  retireWorker(state, { id, now = Date.now() }) {
    const worker = present(state,id);
    if (!researchUnlocked(state) || !worker || !Number.isFinite(now) || worker.train || worker.pairing || worker.retirePending) return false;
    worker.retirePending = true;
    if (!busy(state,worker)) sendToLodge(state,worker,now);
    return true;
  },
  retrieveWorker(state, { id, now = Date.now() }) {
    const worker = state.lodge?.waiting.find(entry => entry.worker.id === id);
    if (!worker || !Number.isFinite(now) || worker.until <= now || state.workers.length + reservedHousing(state) >= housingCapacity(state)) return false;
    state.workers.push(worker.worker);
    state.lodge.waiting = state.lodge.waiting.filter(entry => entry !== worker);
    return true;
  },
  replacePerk(state, { id, earn, replace }) {
    const worker = present(state,id);
    const perks = worker && workerPerks(worker);
    if (!worker?.pendingPerks?.includes(earn) || perks.includes(earn) || (perks.length >= 3 && !perks.includes(replace))) return false;
    worker.perks = perks.length >= 3 ? perks.map(perk => perk === replace ? earn : perk) : [...perks,earn];
    worker.pendingPerks = worker.pendingPerks.filter(perk => perk !== earn);
    return true;
  },
  dismissPerkReveal(state, { id }) {
    if (state.perkReveals?.[0]?.id !== id) return false;
    state.perkReveals.shift();
    return true;
  },
};
function sendToLodge(state, worker, now) {
  state.lodge ??= { waiting:[], names:[] };
  delete worker.retirePending;
  delete worker.stayAt;
  delete worker.pendingAssignment;
  state.workers = state.workers.filter(other => other.id !== worker.id);
  state.favorites = state.favorites.filter(id => id !== worker.id);
  state.lodge.waiting.push({ worker, until:now + RETIRE_WINDOW });
}
export function expireLodge(state, now = Date.now()) {
  if (!state.lodge) return;
  state.lodge.waiting = state.lodge.waiting.filter(entry => {
    if (entry.until > now) return true;
    state.lodge.names.push(entry.worker.name);
    return false;
  });
}
export function advanceDevelopment(state, seconds, plan, createWorker, applyAssignment, maxStamina, now = Date.now()) {
  expireLodge(state,now);
  const at = (worker,site) => {
    if (distance(worker,site) <= 8) return true;
    if (worker.developmentRoute?.x !== site.x || worker.developmentRoute?.y !== site.y) worker.developmentRoute = plan(worker,site);
    return worker.developmentRoute && followRoute(worker,worker.developmentRoute,100,seconds,state.industry.roads);
  };
  for (const worker of state.workers) {
    if (worker.retirePending && !busy(state,worker)) sendToLodge(state,worker,now);
    else if (worker.train) {
      const course = worker.train, site = researchSite(state,course.siteId);
      if (!site || !at(worker,site)) continue;
      course.until ??= state.time + course.duration;
      if (course.until <= state.time) {
        worker.stats[course.stat] = bounded(worker.stats[course.stat] + 1);
        worker.stamina = Math.min(worker.stamina,maxStamina(worker));
        delete worker.train;
      }
    } else if (worker.pendingAssignment && !worker.pairing && !busy(state,worker)) {
      const fields = worker.pendingAssignment;
      delete worker.pendingAssignment;
      applyAssignment(fields);
    }
  }
  if (!state.pairingJobs?.length) return;
  state.pairingJobs = state.pairingJobs.filter(job => {
    const a = present(state,job.first), b = present(state,job.second), site = researchSite(state,job.siteId);
    if (!a || !b || !site) {
      if (a) delete a.pairing;
      if (b) delete b.pairing;
      adjustStock(state,'provisions',8,nearestHome(state,site ?? HOUSE));
      return false;
    }
    const arrived = [a,b].map(worker => at(worker,site)).every(Boolean);
    if (!arrived) return true;
    job.until ??= state.time + 90000;
    if (job.until > state.time) return true;
    delete a.pairing; delete b.pairing;
    const child = createWorker();
    Object.assign(child,job.result,site && {x:site.x,y:site.y});
    child.stamina = maxStamina(child);
    state.notice = { text:`В семейном домике появился ёжик: ${child.name}!`, symbol:'hedge', at:state.time, serial:state.nextId++ };
    return false;
  });
}
