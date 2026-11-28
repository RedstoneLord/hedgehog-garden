import { estateMapAreas, estateMapSites, visibleEstateLinks } from './estate-map.js';
import landscape from './pixel-landscape.png?inline';
import { SCIENTIST_GOODS, scientistStall, scientistInTransit } from './commission.js';
import { hasResearch, powerNetworks, researchSites, stationLabel } from './research.js';
import { WORLD } from './terrain.js';
import { GameSelect } from './game-select.jsx';
import { useEffect, useRef, useState } from 'react';
import { Glyph } from './art.jsx';
import { IndustryArt } from './industry-art.jsx';
import { BUILDINGS, buildingPrice, canCraft, discoveredGoods, factoryReady, GOODS, homeId, homesFor, homeStock, housingCapacity, incomingGoods, industryStations, isStockSite, JAR_PRICE, PRODUCTION_PRICE, RECIPES, ROAD_PRICE, stationCapacity, stationUpgradePrice, STATION_UPGRADES, stockCount, storageLabel, upgradeWorkshopPrice } from './industry.js';
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
      options={Object.entries(RECIPES).filter(([key, item]) => key === site.recipe || site.level >= item.level && (key !== 'biofuel' || hasResearch(state,key)))
        .map(([key]) => ({ value: key, label: GOODS[key].label }))}/></div>
    <div className="industry-ingredients">{Object.entries(recipe.needs).map(([item, qty]) => (
      <Tooltip key={item} label={GOODS[item].label} detail={`На станции ${site.inputs[item] ?? 0} · на складах ${stockCount(state, item)}`}>
        <span tabIndex={0} className={(site.inputs[item] ?? 0) < qty ? 'shortage' : ''}><Good item={item} qty={qty}/> · на месте {site.inputs[item] ?? 0}</span>
      </Tooltip>))}
      <span aria-hidden="true">→</span><Good item={site.recipe} qty={recipe.amount + Number(state.upgrades.includes('largerBatches'))}/>
    </div>
    {site.batch && <p><Glyph name={GOODS[site.batch.key].icon}/> {GOODS[site.batch.key].label} · {Math.ceil(progress)} с</p>}
    {site.automatic !== false && site.level === 3 && !site.electric && site.recipe !== 'fuel' && !site.inputs.fuel && <p className="shortage">Фабрика ждёт топливо на станции.</p>}
    {output.length > 0 && <div className="industry-ingredients">{output.map(([item, qty]) => <Good key={item} item={item} qty={qty}/>)}</div>}
    <div className="industry-buttons">
      <button className="pixel-button mini" type="button" disabled={!canCraft(state, site, site.recipe, true)} onClick={() => send('craft', { key: site.recipe })}><Glyph name="hand"/> Приготовить вручную с доставкой ингредиентов</button>
      <button className="pixel-button mini" type="button" aria-pressed={site.automatic !== false} onClick={() => send('toggleWorkshop')}>
        {site.automatic === false ? 'Запустить смену' : 'Остановить смену'}
      </button>
      {output.length > 0 && <button className="pixel-button mini" type="button" onClick={() => send('takeIndustryStock')}><Glyph name="crate"/> Отнести до 24 ед. в ближайшее хранилище</button>}
      {site.level < 3 && <button className="pixel-button mini" type="button" disabled={state.trade.coins < upgradeWorkshopPrice(site) || site.level === 2 && !factoryReady(site)} onClick={() => send('upgradeWorkshop')}>
        {site.level === 1 ? 'Улучшить мастерскую' : 'Построить фабрику'} · <Money amount={upgradeWorkshopPrice(site)}/>
      </button>}
    </div>
    {site.level === 2 && !factoryReady(site) && <p>Для фабрики купи скорость, партию и склад мастерской.</p>}
    {site.level === 3 && <p>Ловкий ёжик ускоряет партию, а подходящие перки могут увеличить выпуск. Работа для него — «Настраивать фабрику».</p>}
    {site.level === 3 && hasResearch(state,'retrofit') && <div className="industry-buttons">
      <p>{site.electric ? `Питание от сети · ${Math.round((site.power ?? 0)*100)}%` : 'Фабрика работает на топливе.'}</p>
      <button type="button" className="pixel-button mini" disabled={Boolean(site.batch)} onClick={() => send('retrofitFactory')}>
        {site.electric ? 'Вернуть топливный привод' : 'Перейти на электричество'}
      </button></div>}
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

const zoneColors = { home:'#f2aa6a', garden:'#d2f293', stall:'#f6d685', production:'#f68f7c', research:'#8aeeec' };
const categoryGoods = {
  all:['Все', Object.keys(GOODS)], crops:['Урожай', ['apples','berries','wheat']],
  ingredients:['Ингредиенты', ['flour','jars','provisions']], outputs:['Продукты', Object.keys(GOODS).filter(key => GOODS[key].value)],
  fuel:['Топливо', ['coal','fuel','biofuel']],
};
const quantity = amounts => Object.values(amounts).reduce((sum,count) => sum + count,0);

function GardenOverview({ state, onFocus }) {
  const [selected, setArea] = useState('garden');
  const [zoom, setZoom] = useState(1);
  const [power, showPower] = useState(false);
  const [paths, showPaths] = useState(true);
  const [center, setCenter] = useState({x:WORLD.x + WORLD.width/2,y:WORLD.y + WORLD.height/2});
  const areas = estateMapAreas(state);
  const area = areas[selected] ? selected : 'garden';
  const labels = { home:'Жильё', garden:state.trade.berryFarm ? 'Сады и фермы' : 'Сады', stall:'Лавки', production:'Производство', research:areas.power ? 'Исследования и сеть' : 'Исследования' };
  const mapSites = estateMapSites(state, areas);
  const links = visibleEstateLinks(state, mapSites);
  const networks = power && areas.power ? powerNetworks(state) : [];
  const zones = {
    home:mapSites.home.map(({site,id}) => ({...site,id,label:storageLabel(site),
      status:`Запасы · ${number.format(Object.keys(GOODS).reduce((sum,key) => sum + homeStock(state,site,key),0))}`})),
    garden:mapSites.garden.map(({site,id,orchard}) => ({...site,id,label:orchardName(id),
      status:`Готовых корзин · ${orchard.ready.length}`, workers:state.workers.filter(worker => worker.orchardId === id)})),
    stall:mapSites.stall.map(({site,id},index) => ({...site,id,label:`Лавка ${index+1}`,
      status:`В очереди · ${site.customers.filter(customer => customer.phase === 'queue').length}`, workers:state.workers.filter(worker => worker.stallId === site.id)})),
    production:(areas.production ? [...mapSites.production.map(({site}) => site), ...state.industry.tractors] : []).map(site => ({
      ...site,label:`${site.level === 3 ? 'Фабрика' : BUILDINGS[site.kind].label} ${site.number}`,
      status:site.automatic === false ? 'На паузе' : site.batch || site.trip || site.mineAt ? 'В работе' : 'Ожидает',
      workers:state.workers.filter(worker => worker.siteId === site.id)})),
    research:mapSites.research.map(({site}) => ({...site,label:stationLabel(site),
      status:site.broken ? 'Требуется ремонт' : !areas.power ? '' : site.kind === 'generator' ? `Мощность · ${site.output ?? 0}` : `Питание · ${Math.round((site.power ?? 0)*100)}%`,
      workers:state.workers.filter(worker => worker.siteId === site.id)})),
  };
  const names = new Map(Object.values(zones).flat().map(site => [site.id, site.label]));
  const width = WORLD.width/zoom, height = WORLD.height/zoom;
  const x = Math.max(WORLD.x,Math.min(WORLD.x + WORLD.width-width,center.x-width/2));
  const y = Math.max(WORLD.y,Math.min(WORLD.y + WORLD.height-height,center.y-height/2));
  const map = useRef(null);
  const start = useRef(null);
  return <section className="pixel-window industry-panel garden-overview"><h3>Карта хозяйства</h3>
    <div className="industry-buttons">
      <button type="button" className="pixel-button mini" disabled={zoom === 1} onClick={() => setZoom(Math.max(1,zoom-.5))} aria-label="Отдалить сводку">−</button>
      <button type="button" className="pixel-button mini" disabled={zoom === 4} onClick={() => setZoom(Math.min(4,zoom+.5))} aria-label="Приблизить сводку">+</button>
      {links.length > 0 && <button type="button" className="pixel-button mini" aria-pressed={paths} onClick={() => showPaths(!paths)}><Glyph name="track"/> Маршруты ёжиков</button>}
      {areas.power && <button type="button" className="pixel-button mini" aria-pressed={power} onClick={() => showPower(!power)}><Glyph name="speed"/> Схема питания</button>}
    </div>
    <svg ref={map} className="industry-minimap" viewBox={`${x} ${y} ${width} ${height}`} role="group" aria-label="Карта построек и участков"
      onPointerDown={event => { start.current = {x:event.clientX,y:event.clientY,worldX:x + width/2,worldY:y+height/2}; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => {
        if (!start.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const bounds = map.current.getBoundingClientRect();
        const scale = Math.min(bounds.width / width, bounds.height / height);
        setCenter({ x:start.current.worldX + (start.current.x - event.clientX) / scale,
          y:start.current.worldY + (start.current.y - event.clientY) / scale });
      }} onLostPointerCapture={() => { start.current = null; }}>
      <image href={landscape} x={WORLD.x} y={WORLD.y} width={WORLD.width} height={WORLD.height} opacity=".55"/>
      {networks.flatMap(net => net.links.map(([a,b]) => <line key={a.id+b.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="estate-wire"/>))}
      {paths && links.map(link => {
        const routeLabel = `${names.get(link.from)} ↔ ${names.get(link.to)}`;
        return <Tooltip key={link.from+'→'+link.to} label={routeLabel}>
          <polyline className="estate-walk" tabIndex={0} aria-label={routeLabel}
            points={link.points.map(({x,y}) => `${x},${y}`).join(' ')}/>
        </Tooltip>;
      })}
      {Object.entries(zones).flatMap(([kind,points]) => points.map((site,index) => <circle key={kind+index} cx={site.x} cy={site.y} r={(kind === area ? 70 : 46)/Math.sqrt(zoom)}
        fill={zoneColors[kind]} opacity={kind === area ? 1 : .58} stroke="#30263b" strokeWidth={18/zoom}/>))}
    </svg>
    <div className="industry-buttons">{Object.entries(labels).filter(([key]) => areas[key]).map(([key,label]) => <button className="pixel-button mini" key={key} type="button"
      aria-pressed={area === key} onClick={() => { setArea(key); if (zones[key][0]) setCenter(zones[key][0]); }}><i className="zone-key" style={{backgroundColor:zoneColors[key]}}/>{label}</button>)}</div>
    <div className="industry-board">{zones[area].map((site,index) => <button key={site.id ?? index} className="pixel-button" type="button" onClick={() => onFocus(site)}>
      <span>{site.label}</span><small>{site.status}{site.workers ? ` · Ёжиков ${site.workers.length}` : ''}</small>
    </button>)}</div>
    {networks.map(net => <p key={net.nodes[0].id}>Мощность {Math.round(net.nodes[0].grid?.supply ?? 0)} / {net.nodes[0].grid?.demand ?? 0} · Заряд {Math.round(net.nodes.reduce((sum,site) => sum + (site.charge ?? 0),0))}</p>)}
  </section>;
}

function Warehouse({ state, onFocus, dispatch }) {
  const [filter, setFilter] = useState('all');
  const discovered = discoveredGoods(state);
  const categories = Object.entries(categoryGoods).filter(([, [,items]]) => items.some(item => discovered.includes(item)));
  const current = categories.some(([key]) => key === filter) ? filter : 'all';
  const keys = categoryGoods[current][1].filter(item => discovered.includes(item));
  const allSites = [...homesFor(state).map(home => ({ home, id:homeId(home), site:home, label:storageLabel(home) })),
    ...industryStations(state).filter(site => !isStockSite(site)).map(site => ({ site,id:site.id,label:`${BUILDINGS[site.kind].label} ${site.number}` })),
    ...researchSites(state).filter(site => site.kind === 'generator').map(site => ({site,id:site.id,label:stationLabel(site)}))];
  return <>
    <section className="pixel-window industry-panel warehouse-panel">
      <h3>Запасы хозяйства</h3><GameSelect label="Категория" value={current} options={categories.map(([value, [label]]) => ({value,label}))} onChange={setFilter}/>
      <div className="industry-stock">{keys.map(item => <Good key={item} item={item} qty={stockCount(state,item)}/>)}</div>
      {state.industry.unlocked && <div className="industry-buttons">{[4,8,20].map(amount => <button key={amount} type="button" className="pixel-button"
        disabled={state.trade.coins < JAR_PRICE * amount} onClick={() => dispatch('buyJars',{amount})}>Банки ×{amount} · <Money amount={amount * JAR_PRICE}/></button>)}
        {discovered.includes('provisions') && <button type="button" className="pixel-button" disabled={!stockCount(state,'provisions') || !state.workers.some(worker => worker.sleepUntil === null && worker.stamina < 35)}
          onClick={() => dispatch('useProvisions')}>Раздать дорожный паёк</button>}</div>}
    </section>
    <div className="industry-grid">{allSites.map(({home,id,site,label}) => {
      const onSite = item => home ? homeStock(state,home,item) : (site.output?.[item] ?? 0) + (site.inputs?.[item] ?? 0) + (site.stock?.[item] ?? 0)
        + (site.kind === 'mine' && ['fuel','coal'].includes(item) ? site[item] ?? 0 : 0) + (site.kind === 'tractor' && item === 'fuel' ? Math.floor(site.tank ?? 0) : 0);
      const reserved = item => state.industry.tractors.reduce((sum,{trip}) => sum + (trip?.source === id && trip.item === item && !trip.loaded ? trip.amount : 0),0);
      return <section className="pixel-window industry-panel warehouse-panel" key={id}><h3>{label}</h3>
        <div className="industry-stock">{keys.filter(item => onSite(item) || incomingGoods(state,id,item) || reserved(item)).map(item => <div key={item}>
          <Good item={item} qty={Math.max(0,onSite(item)-reserved(item))}/>
          {reserved(item) > 0 && <small> · резерв {reserved(item)}</small>}
          {incomingGoods(state,id,item) > 0 && <small> · в пути {incomingGoods(state,id,item)}</small>}
        </div>)}</div>
        <button type="button" className="pixel-button mini" onClick={() => onFocus(site)}>Показать на карте</button>
      </section>;
    })}</div>
    {state.scientist && <section className="pixel-window industry-panel warehouse-panel">
      <h3>Счёт заказа учёного</h3>
      <p>Зачислено {number.format(quantity(state.scientist.bank))} / {number.format(quantity(SCIENTIST_GOODS))} · В пути {number.format(Object.keys(SCIENTIST_GOODS).reduce((sum,key) => sum + scientistInTransit(state,key),0))}</p>
      {state.scientist.stage !== 'complete' && (scientistStall(state) ? <button type="button" className="pixel-button" onClick={() => onFocus(scientistStall(state))}>Показать лавку</button> : <p>Поставь лавку, чтобы продолжить получение образцов.</p>)}
      {state.scientist.stage === 'accepted' && <details><summary>Образцы по видам</summary>{Object.entries(SCIENTIST_GOODS).filter(([key]) => discovered.includes(key)).map(([key,amount]) => <p key={key}>{GOODS[key].label} · {number.format(state.scientist.bank[key] ?? 0)} / {number.format(amount)}</p>)}</details>}
    </section>}
  </>;
}

export function IndustryScreen({ state, dispatch, initialSite, initialTab, onClose, onBuild, onFocus }) {
  const dialog = useRef(null);
  const [tab, setTab] = useState(initialTab ?? (initialSite ? 'stations' : 'board'));
  const [expanded, setExpanded] = useState(initialSite ?? null);
  const sites = industryStations(state);
  const industryOpen = state.industry.unlocked;
  const canManageSites = industryOpen || state.industry.houses.length > 0;
  const activeTab = tab === 'stations' && !canManageSites ? 'board' : tab;
  const tabs = [['build', 'Строительство'], ...(canManageSites ? [['stations', industryOpen ? 'Станции' : 'Дома']] : []),
    ['board', 'Сводка'], ['stock', 'Склад']];
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);
  useEffect(() => {
    if (!initialSite) return;
    dialog.current.querySelector('[data-open="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [initialSite]);
  return <dialog ref={dialog} className="game-screen industry-screen" style={{'--estate-backdrop': `url("${landscape}")`}} aria-labelledby="industry-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="screen-header market-header">
      <h2 id="industry-title"><Glyph name="table"/> Хозяйство</h2>
      <p><Money amount={state.trade.coins}/></p>
      <button type="button" className="pixel-button" onClick={onClose}><Glyph name="back"/> Карта</button>
    </header>
    <div className="industry-body">
      <nav className="industry-tabs" aria-label="Раздел хозяйства">
        {tabs.map(([id, label]) =>
          <button className="pixel-button" type="button" key={id} aria-pressed={activeTab === id} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {activeTab === 'build' && <>
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
            <p>{{ workshop: 'Готовит продукты. Фабрика работает на топливе.', mine: 'Северные горы. Запасы угля не иссякают.', tractor: 'Доставляет грузы. Нужны водитель и топливо.', house: '+5 мест для ёжиков. Запасы у домов общие.', warehouse: 'Дополнительное место приёма грузов. Работники и тракторы могут забирать отсюда товары.' }[kind]}</p>
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
      {activeTab === 'stations' && <>
        {!sites.length && <section className="pixel-window industry-panel"><p>Поставь станцию на карте.</p></section>}
        {sites.filter(site => industryOpen || site.kind === 'house').map(site => {
          const staff = state.workers.filter(worker => worker.siteId === site.id);
          const send = (action, fields) => dispatch(action, { id: site.id, ...fields });
          const label = site.level === 3 ? 'Фабрика' : BUILDINGS[site.kind].label;
          return <section key={site.id} className="pixel-window industry-panel" data-open={expanded === site.id}>
            <div className="industry-station">
              <button className="pixel-button" type="button" aria-expanded={expanded === site.id} onClick={() => setExpanded(expanded === site.id ? null : site.id)}><Glyph name={BUILDINGS[site.kind].icon}/> {label} {site.number}</button>
              <small>{site.kind === 'house' ? '+5 мест' : site.kind === 'warehouse' ? 'Хранилище грузов' : site.automatic === false ? 'На паузе'
                : staff.map(worker => worker.name).join(', ') || (site.level === 3 ? 'Автоматизация' : 'Нужен ёжик')}</small>
              <button className="pixel-button mini square" type="button" aria-label={`Показать на карте: ${label} ${site.number}`} onClick={() => onFocus(site)}><Glyph name="map"/></button>
            </div>
            {expanded === site.id && <div className="industry-details">
              {site.kind === 'workshop' && <Workshop site={site} state={state} send={send}/>}
              {site.kind === 'mine' && <><p>Уголь · {site.coal}/{stationCapacity(site,state)}{site.fuel > 0 ? ` · старый запас топлива ${site.fuel}` : ''}{site.mineAt ? ' · идёт добыча' : ''}</p>
                <div className="industry-buttons">
                  <button type="button" className="pixel-button mini" disabled={Boolean(site.mineAt) || site.coal >= stationCapacity(site,state)} onClick={() => send('mineCoal')}>Добыть уголь</button>
                  <button type="button" className="pixel-button mini" disabled={!site.coal && !site.fuel} onClick={() => send('takeIndustryStock')}>Отнести до 24 ед. в ближайшее хранилище</button>
                </div>
                <StationUpgrades site={site} state={state} send={send}/></>}
              {site.kind === 'tractor' && <p>{site.trip ? `Рейс · ${GOODS[site.trip.item]?.label ?? 'корзины'} ×${site.trip.amount} · ${site.trip.loaded ? 'к получателю' : 'к месту погрузки'}` :
                !staff.length ? 'Назначь водителя в профиле ёжика.' : !site.tank && !stockCount(state, 'fuel') ? 'Ждёт топливо' : 'Ждёт подходящий груз и дорогу'} · Топливо: {site.tank ?? 0}</p>}
              {isStockSite(site) && <><p>Запасы хранятся здесь. Другие станции получают их доставкой.</p>
                <div className="industry-stock">{Object.entries(site.stock ?? {}).filter(([, qty]) => qty > 0).map(([item, qty]) => <Good key={item} item={item} qty={qty}/>)}</div></>}
              {industryOpen && <FreightControl id={site.id} state={state} dispatch={dispatch}/>}
            </div>}
          </section>;
        })}
      </>}
      {activeTab === 'board' && <>
        <GardenOverview state={state} onFocus={onFocus}/>
        <section className="pixel-window industry-panel">
          <h3>Доставки</h3>
          <p>{industryOpen && <>Тракторных рейсов {state.industry.deliveries} · В пути {state.industry.tractors.filter(site => site.trip).length} · </>}Ёжики {state.workers.length}/{housingCapacity(state)}</p>
          <StatusBoard state={state} onFocus={onFocus}/>
          <div className="industry-board">{industryOpen && sites.filter(site => !isStockSite(site)).map(site => {
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
      {activeTab === 'stock' && <Warehouse state={state} onFocus={onFocus} dispatch={dispatch}/>}
    </div>
  </dialog>;
}
