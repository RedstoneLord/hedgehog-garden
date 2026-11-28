export const RECEIPT_DURATION = 1450;
const receiptLimit = 48;

export function restoreReceipts(state) {
  if (!Array.isArray(state.resourceReceipts)) {
    delete state.resourceReceipts;
    return;
  }
  state.resourceReceipts = state.resourceReceipts.slice(-receiptLimit).filter(receipt =>
    typeof receipt?.anchor === 'string' && typeof receipt.icon === 'string'
    && Number.isSafeInteger(receipt.amount) && Number.isFinite(receipt.at)
    && receipt.at <= state.time && state.time - receipt.at < RECEIPT_DURATION);
}

export function recordReceipt(state, anchor, icon, amount) {
  if (!amount) return;
  const receipts = state.resourceReceipts ??= [];
  const recent = receipts.find(receipt => receipt.anchor === anchor && receipt.icon === icon
    && state.time - receipt.at < 180);
  if (recent) recent.amount += amount;
  else {
    receipts.push({ anchor, icon, amount, at: state.time });
    if (receipts.length > receiptLimit) receipts.shift();
  }
}
