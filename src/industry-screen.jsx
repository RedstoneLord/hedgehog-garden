import { GameSelect } from './game-select.jsx';
import { useEffect, useRef, useState } from 'react';
import { Glyph } from './art.jsx';
import { IndustryArt } from './industry-art.jsx';
import { BUILDINGS, buildingPrice, canCraft, factoryReady, GOODS, homeId, homesFor, homeStock, housingCapacity, incomingGoods, industryStations, JAR_PRICE, PRODUCTION_PRICE, RECIPES, ROAD_PRICE, stationCapacity, stationUpgradePrice, STATION_UPGRADES, stockCount, upgradeWorkshopPrice } from './industry.js';
import { orchardName } from './orchard.js';
import { plotBounds } from './game.js';
import { soilRate } from './siting.js';
import { frontCustomer, orderLines } from './trade.js';
import { Tooltip } from './tooltip.jsx';

const number = new Intl.NumberFormat('ru-RU');
const Money = ({ amount }) => <><Glyph name="coin"/> {number.format(amount)}</>;
const Good = ({ item, qty }) => <span className="industry-good"><Glyph name={GOODS[item].icon}/> {GOODS[item].label} ×{qty}</span>;

function StationUpgrades({ site, state, send }) {
  return <div className="industry-buttons">
    {Object.entries(STATION_UPGRADES).map(([key, item]) => {
      if (key === 'efficiency' && site.level !== 3) return null;
      const level = site.improvements?.[key] ?? 0;
      const max = site.level === 3 ? key === 'efficiency' ? 1 : 2 : 1;
      const price = stationUpgradePrice(site, key);
      return <button className="pixel-button mini" key={key} type="button" disabled={level >= max || state.trade.coins < price}
        onClick={() => send('upgradeStation', { key })}>{item.label} {level}/{max}{level < max && <> · <Money amount={price}/></>}</button>;
    })}
  </div>;
}

function FreightControl({ state, id, dispatch }) {
  return <div className="industry-buttons">
    <GameSelect label="Приоритет доставки" value={state.industry.priority[id] ?? 1} onChange={priority => dispatch('setFreight', { id, priority })}
      options={[{value:1,label:'Обычный'},{value:2,label:'Высокий'},{value:3,label:'Срочный'}]}/>
    <button type="button" className="pixel-button mini" aria-pressed={Boolean(state.industry.paused[id])}
      onClick={() => dispatch('setFreight', { id, paused: !state.industry.paused[id] })}>
      {state.industry.paused[id] ? 'Возобновить перевозки' : 'Приостановить перевозки'}
    </button>
  </div>;
}

function Workshop({ site, state, send }) {
  const recipe = RECIPES[site.recipe];
  const output = Object.entries(site.output).filter(([, qty]) => qty > 0);
  const progress = site.batch ? Math.max(0, (site.batch.until - state.time) / 1000) : 0;
  return <>
    {site.automatic === false && <p className="shortage">Автоматическая смена на паузе. Ручное приготовление доступно.</p>}
    <div className="industry-recipe"><GameSelect label="Рецепт" value={site.recipe} onChange={key => send('chooseRecipe', { key })}
      options={Object.entries(RECIPES).map(([key, item]) => ({ value: key, disabled: site.level < item.level,
        label: GOODS[key].label + (site.level < item.level ? ' · мастерская II' : '') }))}/></div>
    <div className="industry-ingredients">{Object.entries(recipe.needs).map(([item, qty]) => (
      <Tooltip key={item} label={GOODS[item].label} detail={`На станции ${site.inputs[item] ?? 0} · в домах ${stockCount(state, item)}`}>
        <span tabIndex={0} className={(site.inputs[item] ?? 0) < qty ? 'shortage' : ''}><Good item={item} qty={qty}/> · на месте {site.inputs[item] ?? 0}</span>
      </Tooltip>))}
      <span aria-hidden="true">→</span><Good item={site.recipe} qty={recipe.amount + Number(state.upgrades.includes('largerBatches'))}/>
    </div>
    {site.batch && <p><Glyph name={GOODS[site.batch.key].icon}/> {GOODS[site.batch.key].label} · {Math.ceil(progress)} с</p>}
    {site.automatic !== false && site.level === 3 && site.recipe !== 'fuel' && !site.inputs.fuel && <p className="shortage">Фабрика ждёт топливо на станции.</p>}
    {output.length > 0 && <div className="industry-ingredients">{output.map(([item, qty]) => <Good key={item} item={item} qty={qty}/>)}</div>}
    <div className="industry-buttons">
      <button className="pixel-button mini" type="button" disabled={!canCraft(state, site, site.recipe, true)} onClick={() => send('craft', { key: site.recipe })}><Glyph name="hand"/> Приготовить вручную с подносом из дома</button>
      <button className="pixel-button mini" type="button" aria-pressed={site.automatic !== false} onClick={() => send('toggleWorkshop')}>
        {site.automatic === false ? 'Запустить смену' : 'Остановить смену'}
      </button>
      {output.length > 0 && <button className="pixel-button mini" type="button" onClick={() => send('takeIndustryStock')}><Glyph name="crate"/> Отнести до 24 ед. в ближайший дом</button>}
      {site.level < 3 && <button className="pixel-button mini" type="button" disabled={state.trade.coins < upgradeWorkshopPrice(site) || site.level === 2 && !factoryReady(site)} onClick={() => send('upgradeWorkshop')}>
        {site.level === 1 ? 'Улучшить мастерскую' : 'Построить фабрику'} · <Money amount={upgradeWorkshopPrice(site)}/>
      </button>}
    </div>
    {site.level === 2 && !factoryReady(site) && <p>Для фабрики купи скорость, партию и склад мастерской.</p>}
    <StationUpgrades site={site} state={state} send={send}/>
  </>;
}

function StatusBoard({ state, onFocus }) {
  const rows = state.orchards.map(orchard => {
    const soil = soilRate(plotBounds(state, orchard.id), state.orchards.map(item => plotBounds(state, item.id)));
    const staff = state.workers.filter(worker => worker.orchardId === orchard.id && ['auto', 'collect', 'haul', 'water'].includes(worker.workRole));
    const dry = state.trees.filter(tree => tree.orchardId === orchard.id && tree.readyAt === null && !tree.fruit).length;
    const good = Boolean(staff.length) && !orchard.ready.length && !dry && soil > .7;
    const status = soil < .8 ? `Тесные участки · рост ${Math.round(soil * 100)}%` : dry ? `Нужен полив · ${dry}`
      : orchard.ready.length ? `Полных корзин · ${orchard.ready.length}` : staff.length ? `Ёжиков · ${staff.length}` : 'Нужен садовник';
    return { id: orchard.id, label: orchardName(orchard.id), point: orchard.basket, good, status };
  });
  state.trade.stalls.forEach((stall, i) => {
    const order = frontCustomer(stall)?.order;
    const shortages = orderLines(order).filter(line => (stall.stock[line.key] ?? 0) < line.quantity);
    const incoming = shortages.reduce((total, { key }) => total + incomingGoods(state, `stall:${stall.id}`, key), 0) +
      state.jobs.filter(job => job.stallId === stall.id).reduce((total, job) => total + (job.cargo?.amount ?? 0), 0);
    const staffed = state.workers.some(worker => worker.stallId === stall.id && worker.workRole === 'vendor');
    rows.push({ id: `stall:${stall.id}`, point: stall, label: `Лавка ${i + 1}`, good: staffed && !shortages.length,
      status: shortages.length ? `Нужно: ${shortages.map(line => line.label.toLowerCase()).join(', ')}${incoming ? ` · в пути ${incoming}` : ''}` : staffed ? 'Продавец на месте' : 'Нужен продавец' });
  });
  return <div className="industry-board">{rows.map(row => <button key={row.id} type="button" className="pixel-button" onClick={() => onFocus(row.point)}>
    <span><Glyph name={row.good ? 'check' : 'pin'}/> {row.label}</span><small>{row.status}</small>
  </button>)}</div>;
}

export function IndustryScreen({ state, dispatch, initialSite, onClose, onBuild, onFocus }) {
  const dialog = useRef(null);
  const [tab, setTab] = useState(initialSite ? 'stations' : 'build');
  const [expanded, setExpanded] = useState(initialSite ?? null);
  const sites = industryStations(state);
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);
  useEffect(() => {
    if (!initialSite) return;
    dialog.current.querySelector('[data-open="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [initialSite]);
  return <dialog ref={dialog} className="game-screen industry-screen" aria-labelledby="industry-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="screen-header market-header">
      <h2 id="industry-title"><Glyph name="table"/> Хозяйство</h2>
      <p><Money amount={state.trade.coins}/></p>
      <button type="button" className="pixel-button" onClick={onClose}><Glyph name="back"/> Карта</button>
    </header>
    <div className="industry-body">
      <nav className="industry-tabs" aria-label="Раздел хозяйства">
        {[['build', 'Строительство'], ['stations', 'Станции'], ['board', 'Сводка'], ['stock', 'Склад']].map(([id, label]) =>
          <button className="pixel-button" type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {tab === 'build' && <>
        {state.industry.unlocked && !state.industry.firstWorkshopDelivery && <section className="pixel-window industry-panel">
          <h3>Первая партия</h3>
          <ol>
            <li>{state.industry.workshops.length ? 'Мастерская построена' : 'Поставь мастерскую рядом с домом или дорогой'}.</li>
            <li>{state.industry.firstManualBatch ? 'Ручная партия запущена' : 'Выбери яблочные дольки и приготовь первую партию вручную'}.</li>
            <li>Отнеси готовый товар в дом или доставь его трактором в лавку. В лавках появятся новые заказы.</li>
          </ol>
          <p>Для первого топлива добудь уголь, забери его из шахты и выбери «Топливо» в мастерской.</p>
        </section>}
        {!state.industry.unlocked && <section className="pixel-window industry-panel">
          <h3>Открыть производство</h3><p>Начни с мастерской. Из яблок можно приготовить дольки или компот и продать их в лавке. Из пшеницы делают муку для выпечки.</p>
          <button type="button" className="pixel-button" disabled={state.trade.coins < PRODUCTION_PRICE} onClick={() => dispatch('unlockProduction')}>Открыть · <Money amount={PRODUCTION_PRICE}/></button>
        </section>}
        <div className="industry-grid">
          {Object.entries(BUILDINGS).filter(([kind]) => state.industry.unlocked || kind === 'house').map(([kind, data]) => <section key={kind} className="pixel-window industry-panel">
            <div className="industry-art"><IndustryArt site={{kind}}/></div>
            <h3>{data.label}</h3>
            <p>{{ workshop: 'Готовит продукты. Фабрика работает на топливе.', mine: 'Северные горы. Запасы угля не иссякают.', tractor: 'Доставляет грузы. Нужны водитель и топливо.', house: '+5 мест для ёжиков. Запасы у домов общие.' }[kind]}</p>
            <button type="button" className="pixel-button" disabled={state.trade.coins < buildingPrice(state, kind)} onClick={() => onBuild(kind)}>Поставить · <Money amount={buildingPrice(state, kind)}/></button>
          </section>)}
        </div>
        {state.industry.unlocked && <section className="pixel-window industry-panel">
          <h3>Дороги</h3><p>Соедини существующую дорогу с корзиной сада или входом в мастерскую. Выбери начало и конец участка. Укреплённая дорога ускоряет доставки.</p>
          <div className="industry-buttons">
            <button type="button" className="pixel-button" onClick={() => onBuild('road')}>Проложить · <Money amount={ROAD_PRICE}/> / 480</button>
            <button type="button" className="pixel-button" onClick={() => onBuild('pave')}>Укрепить существующую</button>
          </div>
          {state.industry.roads.map((road, index) => <div className="industry-road-row" key={road.id}>
            <button type="button" className="pixel-button mini" onClick={() => onFocus(road.from)}>Дорога {index + 1}</button>
            {road.level === 1 && <button type="button" className="pixel-button mini" onClick={() => dispatch('upgradeRoad', { id: road.id })}>Укрепить · <Money amount={Math.ceil(ROAD_PRICE * 1.75 * Math.hypot(road.from.x - road.to.x, road.from.y - road.to.y) / 480)}/></button>}
          </div>)}
        </section>}
      </>}
      {tab === 'stations' && <>
        {!sites.length && <section className="pixel-window industry-panel"><p>Поставь станцию на карте.</p></section>}
        {sites.map(site => {
          const staff = state.workers.filter(worker => worker.siteId === site.id);
          const send = (action, fields) => dispatch(action, { id: site.id, ...fields });
          const label = site.level === 3 ? 'Фабрика' : BUILDINGS[site.kind].label;
          return <section key={site.id} className="pixel-window industry-panel" data-open={expanded === site.id}>
            <div className="industry-station">
              <button className="pixel-button" type="button" aria-expanded={expanded === site.id} onClick={() => setExpanded(expanded === site.id ? null : site.id)}><Glyph name={BUILDINGS[site.kind].icon}/> {label} {site.number}</button>
              <small>{site.kind === 'house' ? '+5 мест' : site.automatic === false ? 'На паузе'
                : staff.map(worker => worker.name).join(', ') || (site.level === 3 ? 'Автоматизация' : 'Нужен ёжик')}</small>
              <button className="pixel-button mini square" type="button" aria-label={`Показать на карте: ${label} ${site.number}`} onClick={() => onFocus(site)}><Glyph name="map"/></button>
            </div>
            {expanded === site.id && <div className="industry-details">
              {site.kind === 'workshop' && <Workshop site={site} state={state} send={send}/>}
              {site.kind === 'mine' && <><p>Уголь · {site.coal}/{stationCapacity(site)}{site.fuel > 0 ? ` · старый запас топлива ${site.fuel}` : ''}{site.mineAt ? ' · идёт добыча' : ''}</p>
                <div className="industry-buttons">
                  <button type="button" className="pixel-button mini" disabled={Boolean(site.mineAt) || site.coal >= stationCapacity(site)} onClick={() => send('mineCoal')}>Добыть уголь</button>
                  <button type="button" className="pixel-button mini" disabled={!site.coal && !site.fuel} onClick={() => send('takeIndustryStock')}>Отнести до 24 ед. в ближайший дом</button>
                </div>
                <StationUpgrades site={site} state={state} send={send}/></>}
              {site.kind === 'tractor' && <p>{site.trip ? `Рейс · ${GOODS[site.trip.item]?.label ?? 'корзины'} ×${site.trip.amount} · ${site.trip.loaded ? 'к получателю' : 'к месту погрузки'}` :
                !staff.length ? 'Назначь водителя в профиле ёжика.' : !site.tank && !stockCount(state, 'fuel') ? 'Ждёт топливо' : 'Ждёт подходящий груз и дорогу'} · Топливо: {site.tank ?? 0}</p>}
              {site.kind === 'house' && <><p>Запасы хранятся в этом доме. Другие станции получают их доставкой.</p>
                <div className="industry-stock">{Object.entries(site.stock ?? {}).filter(([, qty]) => qty > 0).map(([item, qty]) => <Good key={item} item={item} qty={qty}/>)}</div></>}
              <FreightControl id={site.id} state={state} dispatch={dispatch}/>
            </div>}
          </section>;
        })}
      </>}
      {tab === 'board' && <>
        <section className="pixel-window industry-panel">
          <h3>Доставки</h3>
          <p>Тракторных рейсов {state.industry.deliveries} · В пути {state.industry.tractors.filter(site => site.trip).length} · Ёжики {state.workers.length}/{housingCapacity(state)}</p>
          <StatusBoard state={state} onFocus={onFocus}/>
          <div className="industry-board">{sites.filter(site => site.kind !== 'house').map(site => {
            const staff = state.workers.some(worker => worker.siteId === site.id);
            return <button className="pixel-button" type="button" key={site.id} onClick={() => { setExpanded(site.id); setTab('stations'); }}>
              <span><Glyph name={staff || site.level === 3 ? 'check' : 'pin'}/> {site.level === 3 ? 'Фабрика' : BUILDINGS[site.kind].label} {site.number}</span>
              <small>{site.batch || site.trip || site.refineAt || site.mineAt ? 'В работе' : site.automatic === false ? 'На паузе'
                : (site.level === 3 || site.kind === 'tractor') && !stockCount(state, 'fuel') ? 'Нужно топливо'
                : !staff && site.level !== 3 ? 'Нужен ёжик' : site.kind === 'workshop' && !canCraft(state, site, site.recipe) ? 'Нужны ингредиенты'
                : site.kind === 'mine' && site.fuel > 0 ? 'Топливо ждёт вывоза' : site.kind === 'tractor' ? 'Нет подходящего груза или маршрута' : 'Ожидает'}</small>
            </button>;
          })}</div>
        </section>
      </>}
      {tab === 'stock' && <>
        <section className="pixel-window industry-panel">
          <h3>Запасы во всех домах</h3><div className="industry-stock">{Object.keys(GOODS).map(item => <Good key={item} item={item} qty={stockCount(state, item)}/>)}</div>
          {state.industry.unlocked && <div className="industry-buttons">{[4, 8, 20].map(amount => <button key={amount} className="pixel-button" type="button"
            disabled={state.trade.coins < JAR_PRICE * amount} onClick={() => dispatch('buyJars', { amount })}>Банки ×{amount} · <Money amount={amount * JAR_PRICE}/></button>)}
            <button type="button" className="pixel-button" disabled={!stockCount(state, 'provisions') || !state.workers.some(worker => worker.sleepUntil === null && worker.stamina < 35)}
              onClick={() => dispatch('useProvisions')}>Раздать дорожный паёк</button></div>}
        </section>
        {homesFor(state).map(home => <section key={homeId(home)} className="pixel-window industry-panel">
          <h3>{home.id ? `Дом для ёжиков ${home.number}` : 'Первый дом'}</h3>
          <div className="industry-stock">{Object.keys(GOODS).filter(item => homeStock(state, home, item) > 0).map(item =>
            <Good key={item} item={item} qty={homeStock(state, home, item)}/>)}</div>
          <button type="button" className="pixel-button mini" onClick={() => onFocus(home)}>Показать на карте</button>
        </section>)}
      </>}
    </div>
  </dialog>;
}
