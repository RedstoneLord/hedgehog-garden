import { incomingGoods } from './industry.js';

const storageGroup = key => key === 'apples' || key === 'berries' ? key : 'products';
export const stallCapacity = stall => 240 + stall.levels.shelves * 100;

export function shelfStock(stall, key) {
  const group = storageGroup(key);
  return Object.entries(stall.stock).reduce((sum, [item, amount]) => sum + (storageGroup(item) === group ? amount : 0), 0);
}

export function shelfRoom(state, stall, key, reservations = true) {
  const group = storageGroup(key);
  let left = stallCapacity(stall) - shelfStock(stall, key);
  if (reservations) {
    for (const job of state.jobs) {
      if (job.kind === 'restock' && job.stallId === stall.id && job.cargo
        && storageGroup(job.cargo.key) === group) left -= job.cargo.amount;
    }
    const id = `stall:${stall.id}`;
    const items = new Set(state.industry.tractors.map(({ trip }) => trip?.item).filter(item => item && storageGroup(item) === group));
    for (const item of items) left -= incomingGoods(state, id, item);
  }
  return Math.max(0, left);
}

export function incomingStallGoods(state, stall, key) {
  return incomingGoods(state, `stall:${stall.id}`, key) + state.jobs.reduce((sum, job) =>
    sum + (job.kind === 'restock' && job.stallId === stall.id && job.cargo?.key === key ? job.cargo.amount : 0), 0);
}

export function stallStockTarget(state, stall, key, requested = 0) {
  if (stall.stocking === false) return requested;
  const buffer = key === 'apples' ? 100 : key === 'berries' ? state.trade.berryKnown ? 60 : 0
    : state.industry.knownProducts.includes(key) ? 8 : 0;
  return Math.max(requested, buffer);
}
