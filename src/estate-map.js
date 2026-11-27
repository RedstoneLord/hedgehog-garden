import { researchUnlocked } from './commission.js';
import { homeId, homesFor } from './industry.js';
import { hasResearch, researchSites } from './research.js';

const RECORD_INTERVAL = 300;
const NEAR_SITE = 48;
const MAX_LINKS = 40;
const MAX_POINTS = 64;
const location = ({ x, y }) => ({ x: Math.round(x), y: Math.round(y) });
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function estateMapAreas(state) {
  return {
    home: true,
    garden: true,
    stall: state.trade.permit,
    production: state.industry.unlocked,
    research: researchUnlocked(state),
    power: researchUnlocked(state) && hasResearch(state, 'electricity'),
  };
}

export function estateMapSites(state, areas = estateMapAreas(state)) {
  return {
    home: homesFor(state).map(site => ({ site, id: homeId(site) })),
    garden: state.orchards.map(orchard => ({ site: orchard.basket, id: orchard.id, orchard })),
    stall: areas.stall ? state.trade.stalls.map(site => ({ site, id: `stall:${site.id}` })) : [],
    production: areas.production ? [...state.industry.workshops, ...state.industry.mines].map(site => ({ site, id: site.id })) : [],
    research: areas.research ? researchSites(state).map(site => ({ site, id: site.id })) : [],
  };
}

function appendPoint(points, point) {
  const start = points.at(-2), end = points.at(-1);
  if (end && gap(end, point) < 24) return;
  if (start && gap(start, end) + gap(end, point) - gap(start, point) < 3) points.pop();
  if (points.length === MAX_POINTS - 1) points.splice(1, points.length - 1, ...points.slice(1).filter((_, index) => index % 2 === 0));
  points.push(location(point));
}

export function recordEstateWalks(state, previous) {
  if (!state.workers.length
    || Math.floor(state.time / RECORD_INTERVAL) === Math.floor(previous.time / RECORD_INTERVAL)) return;
  const sites = Object.values(estateMapSites(state)).flat();
  const sitePoints = new Map(sites.map(({ id, site }) => [id, site]));
  const riders = new Set([...state.industry.tractors, ...previous.industry.tractors].map(tractor => tractor.trip?.driverId));
  const walks = state.estateWalks ?? [];
  const recent = [];
  const links = state.estateLinks ?? [];
  for (const worker of state.workers) {
    if (riders.has(worker.id)) continue;
    const oldWorker = previous.workers.find(item => item.id === worker.id);
    if (!oldWorker || gap(oldWorker, worker) > Math.max(100, (state.time - previous.time) * .65)) continue;
    let visit = null;
    let nearest = NEAR_SITE;
    for (const { id, site } of sites) {
      if (Math.abs(worker.x - site.x) > nearest || Math.abs(worker.y - site.y) > nearest) continue;
      const distance = gap(worker, site);
      if (distance <= nearest) {
        nearest = distance;
        visit = { id, site };
      }
    }
    const walk = walks.find(entry => entry.worker === worker.id);
    const origin = walk && sitePoints.get(walk.from);
    const valid = origin && gap(origin, walk.points[0]) < 2;
    if (visit) {
      if (valid && walk.from !== visit.id) {
        const points = [...walk.points, location(visit.site)];
        const index = links.findIndex(link => link.from === walk.from && link.to === visit.id || link.from === visit.id && link.to === walk.from);
        if (index !== -1) links.splice(index, 1);
        links.push({ from: walk.from, to: visit.id, points });
      }
      recent.push({ worker: worker.id, from: visit.id, points: [location(visit.site)] });
    } else if (valid) {
      appendPoint(walk.points, worker);
      recent.push(walk);
    }
  }
  state.estateWalks = recent;
  state.estateLinks = links.slice(-MAX_LINKS);
}

export function visibleEstateLinks(state, sites) {
  const points = new Map(Object.values(sites).flat().map(({ id, site }) => [id, site]));
  return (state.estateLinks ?? []).filter(link => {
    const from = points.get(link.from), to = points.get(link.to);
    return from && to && gap(from, link.points[0]) < 2 && gap(to, link.points.at(-1)) < 2;
  });
}

export function restoreEstateWalks(state) {
  const validPoints = points => Array.isArray(points) && points.length > 0 && points.length <= MAX_POINTS
    && points.every(point => Number.isFinite(point?.x) && Number.isFinite(point?.y));
  if (Array.isArray(state.estateLinks)) state.estateLinks = state.estateLinks.slice(-MAX_LINKS).filter(link =>
    typeof link?.from === 'string' && typeof link.to === 'string' && validPoints(link.points) && link.points.length >= 2);
  else delete state.estateLinks;
  if (Array.isArray(state.estateWalks)) {
    const workers = new Set(state.workers.map(worker => worker.id));
    state.estateWalks = state.estateWalks.filter(walk => workers.has(walk?.worker) && typeof walk.from === 'string'
      && validPoints(walk.points) && workers.delete(walk.worker));
  } else delete state.estateWalks;
}
