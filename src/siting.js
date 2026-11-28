import { HOUSE } from './orchard.js';
import { distance } from './routes.js';

export const SOIL_SPACING = 250;
export function plotGap(a, b) {
  return Math.hypot(
    Math.max(0, a.x - b.x - b.width, b.x - a.x - a.width),
    Math.max(0, a.y - b.y - b.height, b.y - a.y - a.height),
  );
}

export function soilRate(plot, others) {
  const gap = others.reduce((nearest, other) => other === plot ? nearest : Math.min(nearest, plotGap(plot, other)), SOIL_SPACING);
  return .21 + .79 * gap / SOIL_SPACING;
}

export const MARKET_REACH = 700;

export function marketDemand(state, point, road, id) {
  const homes = [HOUSE, ...(state.industry?.houses ?? [])];
  const base = homes.some(home => distance(home, point) < 450) ? .28 : [1, .56, .48, .78, .7][road] ?? 0;
  const rivals = state.trade.stalls.filter(stall => stall.id !== id && distance(stall, point) < MARKET_REACH);
  const pressure = rivals.reduce((sum, stall) => sum + .85 * (1 - distance(stall, point) / MARKET_REACH), 0);
  const competition = Math.max(.28, 1 / (1 + pressure));
  return { base, rivals, competition, score: base * competition };
}
export const demandScore = (state, point, road, id) => marketDemand(state, point, road, id).score;
export const trafficLevel = score => score >= .85 ? 'high' : score >= .6 ? 'medium' : 'low';
