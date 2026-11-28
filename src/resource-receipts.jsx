import { Glyph } from './art.jsx';

const number = new Intl.NumberFormat('ru-RU', { signDisplay: 'always' });

export function ResourceReceipts({ receipts, className = '' }) {
  if (!receipts?.length) return null;
  return <span className={`resource-receipts ${className}`} aria-hidden="true">
    {receipts.filter(receipt => receipt.amount).map(({ anchor, icon, amount, at }) =>
      <span key={`${anchor}:${icon}:${at}`} className="resource-receipt">{number.format(amount)} <Glyph name={icon}/></span>)}
  </span>;
}
