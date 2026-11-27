import { ScientistPanel } from './research-screen.jsx';
import { scientistStall } from './commission.js';
import { GameSelect } from './game-select.jsx';
import { useEffect, useRef, useState } from 'react';
import { Glyph } from './art.jsx';
import { CustomerGallery } from './customer-gallery.jsx';
import { GOODS, incomingGoods, stockCount } from './industry.js';
import { CUSTOMERS } from './customers.js';
import { CustomerPortrait, MarketLandscape, MarketStallArt } from './trade-art.jsx';
import { canServe, frontCustomer, MARKET_UPGRADES, marketStock, marketUpgradePrice, orderLines, orderPayment, queueCapacity, stallCapacity } from './trade.js';
import './market.css';

const number = new Intl.NumberFormat('ru-RU');

function deliveryStatus(state, stall, key, couriers, canDispatch) {
  const name = GOODS[key].label;
  const trips = couriers.filter(job => job.key === key);
  const inTransit = trips.reduce((sum, job) => sum + (job.cargo?.amount ?? 0), 0) + incomingGoods(state, `stall:${stall.id}`, key);
  if (inTransit) return `${name} в пути · ${number.format(inTransit)}.`;
  if (trips.length) return `Ёжик идёт за товаром · ${name.toLowerCase()}.`;
  if (marketStock(stall) >= stallCapacity(stall)) return 'Освободи место в лавке для доставки.';
  if (stockCount(state, key) <= (key === 'apples' ? stall.reserve : 0)) return `Нужно пополнить склад · ${name.toLowerCase()}.`;
  if (!canDispatch) return 'Назначь снабженца или водителя трактора.';
  return `Товар ждёт доставки · ${name.toLowerCase()}.`;
}

export function MarketScreen({ state, stall, dispatch, onClose, onMove, onFindBerries }) {
  const dialog = useRef(null);
  const [remove, setRemove] = useState(false);
  const [gallery, showGallery] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);
  const customer = frontCustomer(stall);
  const person = customer && CUSTOMERS[customer.kind];
  const order = customer?.order;
  const queued = stall.customers.filter(person => person.phase === 'queue').length;
  const traveling = stall.customers.filter(person => person.phase === 'walk').length;
  const staffed = state.workers.some(worker => worker.stallId === stall.id && worker.workRole === 'vendor');
  const couriers = state.jobs.filter(job => job.kind === 'restock' && job.stallId === stall.id);
  const canDispatch = state.workers.some(worker => worker.workRole === 'auto' || (worker.workRole === 'restock' && worker.stallId === stall.id));
  const deliveryMessages = order?.accepted ? [...new Set(orderLines(order).map(line => line.key).filter(key => order[key] > (stall.stock[key] ?? 0))
    .map(key => deliveryStatus(state, stall, key, couriers, canDispatch)))] : [];
  const act = (action, fields = {}) => dispatch(action, { stallId: stall.id, ...fields });
  function toggleGallery() {
    showGallery(!gallery);
    dialog.current.scrollTop = 0;
  }
  return <dialog ref={dialog} className="game-screen market-screen" aria-labelledby="market-title"
    onCancel={event => { event.preventDefault(); if (gallery) toggleGallery(); else onClose(); }}>
    <header className="screen-header market-header">
      <h2 id="market-title"><Glyph name={gallery ? 'group' : 'market'}/>{gallery ? 'Посетители' : `Лавка ${state.trade.stalls.indexOf(stall) + 1}`}</h2>
      <p><Glyph name="coin"/> {number.format(state.trade.coins)} <span>монет</span></p>
      <div className="market-header-actions">
        <button type="button" className="pixel-button" aria-pressed={gallery} onClick={toggleGallery}><Glyph name={gallery ? 'market' : 'group'}/>{gallery ? 'Лавка' : 'Гости'}</button>
        <button type="button" className="pixel-button" onClick={onClose}><Glyph name="back"/> Карта</button>
      </div>
    </header>
    {gallery ? <CustomerGallery seen={state.trade.visitorsSeen}/> : <div className="market-content">
      <div className="market-left">
        {scientistStall(state)?.id === stall.id && <ScientistPanel state={state} stall={stall} dispatch={dispatch}/>}
        <section className="market-scene" aria-label="Прилавок">
          <MarketLandscape/>
          <div className="market-scene-stall"><MarketStallArt level={stall.levels.sign} levels={stall.levels} stock={stall.stock}/></div>
          {person && <div className="market-portrait-frame" key={customer.id}>
            <CustomerPortrait look={person.look} speaking/>
          </div>}
          {person && <div className="market-speech" key={`speech-${customer.id}`} role="status">
            <strong>{person.name}</strong>
            <p>{order.line}</p>
          </div>}
          {!person && <p className="market-wait">У прилавка пока тихо</p>}
        </section>
        <div className="market-scene-footer">
          <span>В очереди {queued}/{queueCapacity(stall,state)}{traveling > 0 ? ` · В пути ${traveling}` : ''}</span>
          <span>{staffed ? 'За прилавком ёжик' : 'Прилавок открыт'}</span>
        </div>
        <section className="market-order pixel-window" aria-label="Заказ покупателя">
          <h3>{order ? order.commission ? 'Заказ на дикие ягоды' : 'Заказ покупателя' : 'Следующий покупатель'}</h3>
          {order ? <>
            <div className="market-request">
              {orderLines(order).map(({ key, label, icon, quantity }) => <span key={key}><Glyph name={icon}/> {label} ×{quantity}</span>)}
              <strong><Glyph name="coin"/> {number.format(orderPayment(state, stall, order))}</strong>
            </div>
            <div className="market-actions">
              <button type="button" className="pixel-button"
                disabled={order.accepted && !canServe(stall,order)}
                onClick={() => act(order.accepted ? 'fillOrder' : 'acceptOrder', { customerId: customer.id })}>
                <Glyph name="check"/>{order.accepted ? 'Выполнить заказ' : 'Принять заказ'}
              </button>
              <button type="button" className="pixel-button market-dismiss" onClick={() => act('declineOrder', { customerId: customer.id })}>Пропустить</button>
            </div>
            {deliveryMessages.length > 0 && <div role="status">
              {deliveryMessages.map(message => <p className="market-help" key={message}>{message}</p>)}
            </div>}
            {order.accepted && order.berries > (stall.stock.berries ?? 0) && state.trade.wild.length > 0 &&
              <button type="button" className="pixel-button mini" onClick={onFindBerries}><Glyph name="berry"/> Показать дикие ягоды</button>}
          </> : <p className="market-help">Снабженцы возят запасы из дома. Свободные ёжики помогают после приёма заказа.</p>}
        </section>
      </div>
      <div className="market-sidebar">
        {stall.recentSales?.length > 0 && <details className="market-box pixel-window market-sales">
          <summary>Последние продажи</summary>
          <ul>{stall.recentSales.map(sale => <li key={sale.id}>
            <strong>{CUSTOMERS[sale.guest]?.name ?? 'Покупатель'}</strong>
            <span>{sale.items.map(({ key, quantity }) => `${GOODS[key].label} ×${quantity}`).join(', ')}</span>
            <span><Glyph name="coin"/> +{number.format(sale.earned)}</span>
          </li>)}</ul>
        </details>}
        <section className="market-box pixel-window" aria-label="Запасы лавки">
          <h3>Запасы <small>{marketStock(stall)}/{stallCapacity(stall)}</small></h3>
          <div className="market-inventory">
            <span>Товар</span><span>Дома</span><span>В лавке</span>
            <b><Glyph name="apple"/> Яблоки</b><span>{number.format(state.apples)}</span><span>{number.format(stall.stock.apples)}</span>
            {state.trade.berryKnown && <><b><Glyph name="berry"/> Ягоды</b><span>{number.format(state.trade.berries)}</span><span>{number.format(stall.stock.berries)}</span></>}
            {state.industry.knownProducts.map(key => <div className="market-stock-line" key={key}><b><Glyph name={GOODS[key].icon}/> {GOODS[key].label}</b>
              <span>{number.format(stockCount(state, key))}</span><span>{number.format(stall.stock[key] ?? 0)}</span></div>)}
          </div>
          {marketStock(stall) > 0 && <div className="market-stock-actions">
            <button type="button" className="pixel-button mini" onClick={() => act('returnStock')}>Вернуть запас домой</button>
          </div>}
          <GameSelect label="Приоритет доставки" value={state.industry.priority[`stall:${stall.id}`] ?? 1}
            options={[{ value: 1, label: 'Обычный' }, { value: 2, label: 'Высокий' }, { value: 3, label: 'Срочный' }]}
            onChange={priority => dispatch('setFreight', { id: `stall:${stall.id}`, priority })}/>
          <div className="market-reserve"><GameSelect label="Оставлять яблок дома" value={stall.reserve}
            options={[...new Set([0, 100, 250, 500, 1000, 2500, 5000, stall.reserve])].sort((a, b) => a - b).map(amount => ({ value: amount, label: number.format(amount) }))}
            onChange={amount => act('setReserve', { amount })}/></div>
        </section>
        <section className="market-box pixel-window" aria-label="Улучшения лавки">
          <h3>Улучшения</h3>
          <div className="market-upgrade-list">
          {Object.entries(MARKET_UPGRADES).map(([id, upgrade]) => {
            const level = stall.levels[id], price = marketUpgradePrice(stall,id);
            return <div key={id} className="market-upgrade">
              <div><b>{upgrade.label} <small>{level}/{upgrade.max}</small></b><span>{upgrade.desc}</span></div>
              <button type="button" className="pixel-button mini" aria-label={`Улучшить: ${upgrade.label}`}
                disabled={state.trade.coins < price || level >= upgrade.max} onClick={() => act('buyMarketUpgrade',{key:id})}>
                {level >= upgrade.max ? 'Макс.' : <><Glyph name="coin"/> {price}</>}
              </button>
            </div>;
          })}
          </div>
          <div className="market-actions">
            <button type="button" className="pixel-button mini" disabled={state.trade.coins < 80} onClick={onMove}><Glyph name="map"/> Перенести · 80</button>
            {remove ? <><button type="button" className="pixel-button mini" onClick={() => { act('removeMarket'); onClose(); }}>Подтвердить снос</button>
              <button type="button" className="pixel-button mini" onClick={() => setRemove(false)}>Отмена</button></>
              : <button type="button" className="pixel-button mini" onClick={() => setRemove(true)}><Glyph name="axe"/> Снести</button>}
          </div>
        </section>
      </div>
    </div>}
  </dialog>;
}
