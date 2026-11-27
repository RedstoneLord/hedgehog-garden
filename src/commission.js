import { adjustStock, incomingGoods, nearestHome, stockCount } from './industry.js';

export const SCIENTIST_GOODS = {
  apples: 20000, berries: 10000, wheat: 10000, flour: 5000, coal: 1000, fuel: 500,
  slices: 5000, compote: 2000, puree: 5000, bread: 2000, pie: 500, jam: 2000, mixedJam: 500, berryCompote: 2000,
};
export const SCIENTIST_TRIGGER = 10000;
export const SCIENTIST_PRICE = 25000;
export const SCIENTIST_TARGET = 'scientist-commission';

export function scientistStall(state) {
  return state.trade.stalls.reduce((oldest, stall) => !oldest || stall.id < oldest.id ? stall : oldest, null);
}
export const researchUnlocked = state => state.scientist?.stage === 'complete';
export const scientistRemaining = (state, key) => Math.max(0, (SCIENTIST_GOODS[key] ?? 0) - (state.scientist?.bank[key] ?? 0));
export const scientistInTransit = (state, key) => (state.scientist?.intake[key] ?? 0) + incomingGoods(state, SCIENTIST_TARGET, key)
  + state.jobs.reduce((sum, job) => sum + (job.scientist && job.key === key ? job.cargo?.amount ?? 0 : 0), 0);
export const scientistDemand = (state, key) => state.scientist?.stage === 'accepted'
  ? Math.max(0, scientistRemaining(state, key) - scientistInTransit(state, key)) : 0;
export const scientistReady = state => state.scientist?.stage === 'accepted' && Object.keys(SCIENTIST_GOODS).every(key => !scientistRemaining(state, key));

export function advanceScientist(state, clearCounterId) {
  const stall = scientistStall(state);
  if (!stall) return;
  if (!state.scientist && state.industry.unlocked && state.trade.coins >= SCIENTIST_TRIGGER) {
    state.scientist = { stage: 'offered', bank: {}, intake: {}, intakeUntil: 0 };
    state.guide = { key: 'scientist', serial: state.nextId++, text: 'У самой старой лавки необычный гость. Кажется, учёный приехал с большим заказом!' };
  }
  const commission = state.scientist;
  if (commission?.stage !== 'accepted' || (clearCounterId !== stall.id && stall.customers.some(customer => customer.phase === 'queue'))) return;
  for (const [key, amount] of Object.entries(commission.intake)) {
    commission.bank[key] = (commission.bank[key] ?? 0) + amount;
    delete commission.intake[key];
  }
}
export function depositScientist(state, key, amount, point) {
  const commission = state.scientist;
  const stall = scientistStall(state);
  const accepted = commission?.stage === 'accepted' && stall ? Math.min(amount, Math.max(0, scientistRemaining(state, key) - (commission.intake[key] ?? 0))) : 0;
  if (accepted) {
    commission.intake[key] = (commission.intake[key] ?? 0) + accepted;
    commission.intakeUntil = state.time + 1500;
    advanceScientist(state);
  }
  if (amount > accepted) adjustStock(state, key, amount - accepted, nearestHome(state, point));
}
export const waitForScientistIntake = (state, stall) => scientistStall(state)?.id === stall.id && state.scientist?.stage === 'accepted'
  && (state.scientist.intakeUntil > state.time || Object.keys(state.scientist.intake).length > 0);
export const scientistActions = {
  acceptScientist(state, { stallId }) {
    if (state.scientist?.stage !== 'offered' || scientistStall(state)?.id !== stallId) return false;
    state.scientist.stage = 'accepted';
    return true;
  },
  supplyScientist(state, { key }) {
    const stall = scientistStall(state);
    if (!stall || !Object.hasOwn(SCIENTIST_GOODS, key)) return false;
    const amount = Math.min(250, scientistDemand(state, key), stockCount(state, key));
    if (!amount) return false;
    adjustStock(state, key, -amount);
    depositScientist(state, key, amount, stall);
    return true;
  },
  completeScientist(state) {
    if (!scientistStall(state) || !scientistReady(state) || state.trade.coins < SCIENTIST_PRICE) return false;
    state.trade.coins -= SCIENTIST_PRICE;
    state.scientist.stage = 'complete';
    state.guide = { key: 'research', serial: state.nextId++, text: 'Учёный вернулся! Открыты исследования. В лаборатории можно заработать первые очки вручную и выбрать электричество или полив.' };
    return true;
  },
};
export function validScientist(scientist) {
  if (scientist === undefined) return true;
  if (!scientist || !['offered','accepted','complete'].includes(scientist.stage) || !Number.isFinite(scientist.intakeUntil)) return false;
  for (const stock of [scientist.bank, scientist.intake]) {
    if (!stock || Array.isArray(stock) || typeof stock !== 'object'
      || !Object.entries(stock).every(([key, amount]) => Object.hasOwn(SCIENTIST_GOODS, key) && Number.isSafeInteger(amount) && amount >= 0)) return false;
  }
  return Object.entries(SCIENTIST_GOODS).every(([key, amount]) => (scientist.bank[key] ?? 0) + (scientist.intake[key] ?? 0) <= amount
    && (scientist.stage !== 'complete' || scientist.bank[key] === amount));
}
