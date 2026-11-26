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

export function demandScore(state, point, road, id) {
  const homes = [HOUSE, ...(state.industry?.houses ?? [])];
  if (homes.some(home => distance(home, point) < 450)) return .28;
  const score = [1, .56, .48, .78, .7][road] ?? 0;
  const competition = state.trade.stalls.filter(stall => stall.id !== id && distance(stall, point) < 530).length;
  return Math.max(.18, score - competition * .24);
}
export const trafficLevel = score => score >= .85 ? 'high' : score >= .6 ? 'medium' : 'low';
