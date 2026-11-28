import { canImproveFactoryBatch, freightPerkBonus, perkEffect } from './perks.js';

const tempo = (worker, key) => 8 * (1 - perkEffect(worker,key,1));
const quicker = (worker, key) => 8 * (perkEffect(worker,key,1) - 1);
const freight = worker => freightPerkBonus(worker) / 6;
const walking = worker => 2 * (perkEffect(worker,'speed',1) - 1);
const stamina = worker => ((worker.stats.endurance + perkEffect(worker,'stamina') / 8)
  * perkEffect(worker,'endurance',1) - 5) * .18 + tempo(worker,'rest') * .2;
const crafting = (worker, stats) => .18 * stats.speed + .3 * stats.endurance + .52 * stats.dexterity
  + tempo(worker,'craft') + 1.4 * perkEffect(worker,'batch') + walking(worker) + stamina(worker);

const jobs = {
  collect: { label:'Сбор урожая', group:'garden', score:(w,s) => .62*s.dexterity + .22*s.strength + .16*s.speed + tempo(w,'harvest') + 1.5*perkEffect(w,'glean') + perkEffect(w,'carry')/2 + walking(w) },
  vendor: { label:'Продажа в лавке', group:'trade', score:(w,s) => .75*s.handling + .15*s.speed + .1*s.endurance + tempo(w,'service') + 10*perkEffect(w,'sale') + walking(w)/2 },
  maker: { label:'Готовка в мастерской', group:'workshops', score:crafting },
  factory: { label:'Настройка фабрики', group:'workshops', score:(w,s) => crafting(w,s) + .15 },
  haul: { label:'Доставка корзин', group:'freight', score:(w,s) => .33*s.speed + .34*s.strength + .23*s.handling + .1*s.endurance + quicker(w,'haul') + walking(w) },
  restock: { label:'Снабжение лавки', group:'freight', score:(w,s) => .38*s.speed + .49*s.strength + .13*s.endurance + freight(w) + walking(w) },
  porter: { label:'Перевозка грузов', group:'freight', score:(w,s) => .38*s.speed + .48*s.strength + .14*s.endurance + freight(w) + walking(w) },
  driver: { label:'Вождение трактора', group:'freight', score:(w,s) => .47*s.speed + .41*s.endurance + .12*s.foraging + quicker(w,'drive') + perkEffect(w,'refuel')/2 + stamina(w) + walking(w)/2 },
  scout: { label:'Поиск цветов', group:'forest', score:(w,s) => .68*s.foraging + .22*s.speed + .1*s.endurance + perkEffect(w,'detect')/80 + walking(w) },
  forage: { label:'Сбор диких ягод', group:'forest', score:(w,s) => .7*s.foraging + .2*s.speed + .1*s.endurance + perkEffect(w,'extraBerries')/3 + walking(w) },
  water: { label:'Полив на ферме', group:'garden', score:(w,s) => .64*s.speed + .36*s.endurance + perkEffect(w,'extraWater') + walking(w) + stamina(w) },
  buyer: { label:'Закупка банок', group:'workshops', score:(w,s) => .54*s.speed + .46*s.endurance + tempo(w,'buy') + walking(w) + stamina(w) },
  miner: { label:'Добыча угля', group:'mines', score:(w,s) => .15*s.speed + .33*s.endurance + .52*s.strength + tempo(w,'mine') + perkEffect(w,'coal') + stamina(w) + walking(w)/2 },
  operator: { label:'Обслуживание генератора', group:'power', score:(w,s) => 2.5 + .17*s.speed + .33*s.handling + 7*(1 - perkEffect(w,'wear',1)) + tempo(w,'repair') + perkEffect(w,'fuelCarry')/2 + walking(w) },
  researcher: { label:'Работа в лаборатории', group:'research', score:(w,s) => 2.5 + .16*s.speed + .34*s.foraging + quicker(w,'research') + walking(w)/2 },
};

export function recommendJobs(places, worker) {
  const candidates = new Set();
  for (const place of places) for (const role of place.roles) {
    if (role === 'buyer' && place.level < 2) continue;
    if (role === 'maker' && place.level === 3) {
      if (canImproveFactoryBatch(worker)) candidates.add('factory');
    } else if (Object.hasOwn(jobs,role)) candidates.add(role);
  }

  const ranked = Object.entries(jobs).filter(([key]) => candidates.has(key)).map(([key,job]) => ({
    key, role:key === 'factory' ? 'maker' : key, label:job.label, group:job.group, score:job.score(worker,worker.stats),
  })).sort((a,b) => b.score - a.score);
  const used = new Set();
  return ranked.filter(({group}) => {
    if (used.has(group)) return false;
    used.add(group);
    return true;
  }).slice(0,3);
}
