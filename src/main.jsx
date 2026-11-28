import { memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppleTree, BasketArt, BedArt, CompostArt, CrateRackArt, FlowerArt, Glyph, HedgeSprite, HouseArt, LoadingTableArt, OrchardFence, OrchardPavers, SleepLetters, SoilArt, SprinklerArt, StorageArt, WorkerMarker, WorldBackdrop } from './art.jsx';
import {
  act, advance, BALANCE, canMoveBasket, canPlaceSprinkler, canPlant, canSendBasket, constructionPlots, flowerActive, groupCapacity, GUIDE, hirePrice, loadGame,
  importGame, newGame, nextLevelXp, orchardAt, orchardBeds, PERKS, plotBounds, potatoAvailable, productionRate, rerollPrice, SAVE_KEY, seedPrice,
  workerWorkplace, workplaces, workRoleLabel, WORLD,
} from './game.js';
import { initialCamera } from './camera.js';
import { usePanorama } from './panorama.jsx';
import { FOREST_CLEARING, terrainKind } from './terrain.js';
import { UpgradeTree } from './screens.jsx';
import { HedgeProfile, HedgeProfileHeader } from './hedge-profile.jsx';
import { Tooltip, TooltipProvider } from './tooltip.jsx';
import { basketLimit, berryBounds, EAST_ORCHARD, FOREST_ORCHARD, fruitCount, HOUSE, isBerryOrchard, isFieldCrop, isPurchasedGarden, orchardName, SHOP, shopLevel, shopPrice, SPRINKLER_LIMIT, SPRINKLER_RADIUS, sprinklerPrice, START_ORCHARD, STOREHOUSE, VARIETIES, WORK_ROLE_ICONS } from './orchard.js';
import { CUSTOMERS } from './customers.js';
import { distance } from './routes.js';
import { farmAvailable, farmSite, GLOBAL_UPGRADES, globalUpgradeLevel, globalUpgradePrice, landFootprint, landPrice, landSite, marketSite, MOVE_FARM_PRICE, PERMIT_PRICE, stallById, stallPrice } from './trade.js';
import { BerryBushArt, CustomerSprite, MarketStallArt } from './trade-art.jsx';
import { MarketScreen } from './market-screen.jsx';
import { BUILDINGS, buildingSite, COAL_SITES, GOODS, housingCapacity, industryStations } from './industry.js';
import { IndustryArt, MountainArt, WheatArt } from './industry-art.jsx';
import { IndustryScreen } from './industry-screen.jsx';
import { marketDemand, soilRate } from './siting.js';
import { useGameAudio } from './sound.js';
import { ProfileGlyph } from './profile-art.jsx';
import { PerkIcon } from './perk-art.jsx';
import { perkDescription, PERK_TIERS } from './perks.js';
import { availablePerkJobs, JobAdvice } from './job-advice.jsx';
import { TeamScreen } from './team-screen.jsx';
import { MainMenu } from './main-menu.jsx';
import { PICNIC_SPOT, PicnicScene } from './picnic.jsx';
import { LodgePanel, PerkReveal, ResearchScreen, ResearchStationArt } from './research-screen.jsx';
import { researchUnlocked, scientistReady, scientistStall } from './commission.js';
import { gridPlacement, hasResearch, powerNetworks, RESEARCH_BUILDINGS, researchBuildSite, researchSites, stationLabel } from './research.js';
import { PlacementOverlay } from './placement-overlay.jsx';
import { gardenGoals } from './garden-goals.js';
import { GardenGoalCue, GardenGoalsScreen } from './garden-goals-screen.jsx';
import { beginnerTask, STOCK_LESSON } from './tutorial.js';
import { ResourceReceipts } from './resource-receipts.jsx';
import './style.css';
import './industry.css';
import './tutorial.css';

const number = new Intl.NumberFormat('ru-RU');
const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const xy = ({ x, y }) => ({ left: x, top: y });
const rect = ({ x, y, width, height }) => ({ left: x, top: y, width, height });
const icon = (type, text) => <><Glyph name={type}/>{text && <span>{text}</span>}</>;
const DEBUG_FAST_FORWARD = false; // Enable for local testing at 6× simulation speed.

const plantingVariety = { plant:'red', plantGold:'gold', plantForest:'forest', plantBerry:'berry', plantWheat:'wheat' };
const landModes = ['garden', 'farm', 'moveFarm', 'moveGarden'];
const buildKind = mode => mode?.startsWith('build:') ? mode.slice(6) : null;
const researchKind = building => building?.startsWith('r-') ? building.slice(2) : null;
const conditionColor = value => `hsl(${Math.round(108 * value)} 73% 52%)`;
const plotWarning = rate => rate < .99
  ? `Рост ${Math.round(rate * 100)}%. Соседние участки истощают почву. Разнеси их дальше.`
  : 'Участкам хватает места. Скорость роста 100%.';
const trafficLabel = { high:'много путников', medium:'умеренный поток', low:'тихая дорога' };

function initialGame() {
  try {
    const nativeSave = globalThis.OrchardAndroid?.readSave();
    const game = (nativeSave && importGame(nativeSave)) || loadGame(localStorage);
    if (nativeSave || localStorage.getItem(SAVE_KEY)) game.guide = null;
    return game;
  } catch { return newGame(); }
}

function persistGame(game) {
  const json = JSON.stringify(game);
  try {
    if (globalThis.OrchardAndroid?.writeSave(json)) return;
    localStorage.setItem(SAVE_KEY, json);
  } catch { /* The session can continue in memory when storage is unavailable. */ }
}

function useGame(screen) {
  const [state, setState] = useState(initialGame);
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);
  useEffect(() => {
    if (screen === 'launch') return;
    const playing = screen === 'game';
    const stepsPerTick = import.meta.env.DEV && DEBUG_FAST_FORWARD ? 6 : 1;
    let previous = performance.now();
    const tick = playing ? setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(now - previous, 200);
      previous = now;
      if (!document.hidden) setState(game => {
        for (let step = 0; step < stepsPerTick; step++) game = advance(game, elapsed);
        return game;
      });
    }, 85) : undefined;
    const save = () => persistGame(latest.current);
    const saveWhenHidden = () => { if (document.hidden) save(); };
    if (globalThis.OrchardAndroid) globalThis.orchardFlushSave = save;
    const autosave = playing ? setInterval(save, globalThis.OrchardAndroid ? 2500 : 600) : undefined;
    if (!playing) save();
    document.addEventListener('visibilitychange', saveWhenHidden);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(tick);
      clearInterval(autosave);
      document.removeEventListener('visibilitychange', saveWhenHidden);
      if (globalThis.orchardFlushSave === save) delete globalThis.orchardFlushSave;
      window.removeEventListener('pagehide', save);
    };
  }, [screen]);
  function replace(imported) {
    persistGame(imported);
    latest.current = imported;
    setState(imported);
  }
  return [state, (action, data) => setState(game => act(game, action, data)), replace];
}

function WorkerSpeech({ quote, workerId }) {
  const index = quote?.workers.indexOf(workerId) ?? -1;
  if (index < 0) return null;
  const placement = quote.workers.length === 1 ? 'speaker-solo' : `speaker-${index}`;
  return <span className={`world-speech ${placement}`} role="status">{quote.lines[index]}</span>;
}

function MapSprite({ item, state, handlers, mode, selected, guided, receipts }) {
  const { kind } = item;
  const base = { ...xy(item), zIndex: Math.round(item.y - WORLD.y) };
  if (kind === 'mountain') return <div className="map-item mountain-item" style={base}><MountainArt/></div>;
  if (kind === 'industry') {
    const site = item.site;
    const driver = state.workers.find(worker => worker.id === site.trip?.driverId);
    const label = site.level === 3 ? 'Фабрика' : BUILDINGS[site.kind].label;
    return <button type="button" className={`map-item industry-item industry-${site.kind}`} style={base} data-tutorial-highlight={guided || undefined}
      aria-label={`${site.kind === 'house' ? 'Открыть хозяйство' : 'Открыть'}: ${label} ${site.number}`} onClick={event => handlers.industry(event, site)}>
      <IndustryArt site={site} driver={driver} operator={state.workers.find(worker => worker.siteId === site.id && ['maker','miner'].includes(worker.workRole) && distance(worker, site) < 28)}/><span className="basket-label">{label} {site.number}</span>
      {driver && <WorkerSpeech quote={state.quote} workerId={driver.id}/>}
      <ResourceReceipts receipts={receipts}/>
    </button>;
  }
  if (kind === 'research-site') return <button type="button" className="map-item industry-item research-item" style={base}
    aria-label={`Открыть: ${stationLabel(item.site)}`} onClick={event => handlers.industry(event,item.site)}>
    <ResearchStationArt kind={item.site.kind} active={item.site.power > 0}/><span className="basket-label">{stationLabel(item.site)}</span>
    <ResourceReceipts receipts={receipts}/>
  </button>;
  if (kind === 'stall') return <button type="button" className="map-item stall-item" style={base}
    aria-label={`Открыть лавку ${item.ordinal}`} onClick={event => handlers.market(event,item)}>
    <MarketStallArt level={item.levels.sign} levels={item.levels} stock={item.stock}/>
    {item.scientist && <strong className="scientist-marker" aria-label="Учёный ждёт">!</strong>}
    <span className="basket-label">Лавка {item.ordinal}</span>
    <ResourceReceipts receipts={receipts}/>
  </button>;
  if (kind === 'customer') {
    const customer = CUSTOMERS[item.person];
    return <Tooltip label={customer.name}><div className="map-item market-actor" style={base}
      role="img" aria-label={customer.name}><CustomerSprite look={customer.look} walking={item.phase !== 'queue'} left={item.left}/></div></Tooltip>;
  }
  if (kind === 'water') return <button type="button" className="map-item pixel-button mini water-point" style={base}
    aria-label="Набрать воду у реки" onClick={event => handlers.water(event,item)}>{icon('water','Набрать воду')}
    <ResourceReceipts receipts={receipts}/>
  </button>;
  if (kind === 'wild') {
    return <button type="button" className="map-item berry-item" style={base} aria-label={`Дикие ягоды: ${item.fruit}`}
      onClick={event => handlers.wild(event, item)}>
      <BerryBushArt fruit={item.fruit} point={item}/>
      {item.fruit > 0 && <span className="fruit-label berry">{item.fruit}</span>}
      <ResourceReceipts receipts={receipts}/>
    </button>;
  }
  if (kind === 'flower') return <button type="button" className="map-item flower-item" style={base} aria-label="Подобрать цветок бодрости" onClick={event => handlers.flower(event, item)}><FlowerArt variant={item.variant} point={item}/></button>;
  if (kind === 'basket') {
    const orchard = item.orchard;
    const receipt = orchard.pulse && state.time - orchard.pulse.at < 800 ? orchard.pulse : null;
    const ready = Boolean(orchard.ready.length);
    const count = fruitCount(orchard.fill);
    const manual = mode !== 'basket';
    const disabled = manual && !canSendBasket(state, orchard);
    const inTransit = state.jobs.some(job => job.orchardId === orchard.id && (job.kind === 'manual' || job.kind === 'delivery' && ['haul', 'unload'].includes(job.phase)));
    const progress = `${count}/${basketLimit(orchard)}`;
    const status = ready ? disabled ? 'Занята' : 'Полная' : progress;
    const label = manual ? 'Отправить полную корзину к дому' : 'Переместить корзину';
    return <button type="button" className={`map-item basket-item${ready ? ' basket-ready' : ''}`} style={base} data-tutorial-highlight={guided || undefined} aria-disabled={disabled || undefined}
      aria-label={`${label}. ${orchardName(orchard.id)}. ${status}${inTransit ? '. Корзина в пути' : ''}`} onClick={event => { if (!disabled) handlers.basket(event, orchard); }}>
      <span key={receipt?.id} className={`basket-motion${receipt ? ' receiving' : ''}`}><BasketArt level={orchard.basketLevel}/></span>
      <ResourceReceipts receipts={receipts}/>
      <span className="basket-label">{status}</span>
    </button>;
  }
  if (kind === 'sprinkler') return <button type="button" className="map-item sprinkler-item" style={base}
    aria-label={`Переместить разбрызгиватель ${item.order}. ${orchardName(item.orchard.id)}`} onClick={event => handlers.sprinkler(event, item)}>
    <SprinklerArt level={item.orchard.irrigationLevel}/>
  </button>;
  if (kind === 'soil') return <div className="map-item soil-item" style={{ ...base, zIndex: base.zIndex - 1 }} aria-hidden="true"><SoilArt/></div>;
  if (kind === 'compost') return <div className="map-item compost-item" style={{ ...base, zIndex: base.zIndex - 1 }} aria-hidden="true"><CompostArt level={item.level}/></div>;
  if (kind === 'loading-table') return <div className="map-item loading-table-item" style={base} role="img" aria-label="Стол для погрузки корзин"><LoadingTableArt level={item.level}/></div>;
  if (kind === 'crate-rack') return <div className="map-item crate-rack-item" style={base} role="img" aria-label="Полки с ящиками у дома"><CrateRackArt level={item.level}/></div>;
  if (kind === 'bed') return <div className="map-item bed-item" style={{ ...base, zIndex: base.zIndex - 1 }} role="img" aria-label="Лежанка для ёжика"><BedArt/></div>;
  if (kind === 'storage') return <div className="map-item storage-item" style={base} role="img" aria-label="Склад у дома"><StorageArt/></div>;
  if (kind === 'house') {
    const receipt = state.basketReceipt?.home === item.id ? state.basketReceipt : null;
    const canOpen = state.trade.permit && !mode;
    const House = canOpen ? 'button' : 'div';
    return <House className={`map-item house-item${canOpen ? ' house-entrance' : ''}`} style={base} data-tutorial-highlight={guided || undefined}
      type={canOpen ? 'button' : undefined} role={canOpen ? undefined : 'img'}
      aria-label={canOpen ? 'Дом. Открыть хозяйство' : `Дом. Яблоки: ${state.apples}. Ягоды: ${state.trade.berries}.`}
      onClick={canOpen ? event => handlers.industry(event, item) : undefined}>
      <span key={receipt?.id} className={`house-motion${receipt ? ' receiving' : ''}`}><HouseArt/></span>
      <ResourceReceipts receipts={receipts}/>
      <span className="basket-label">{canOpen ? icon('table', 'Хозяйство') : 'Дом'}</span>
    </House>;
  }
  if (kind === 'manual') return <div className="map-item manual-carrier" style={base} role="img" aria-label="Корзина направляется к дому"><BasketArt level={item.level}/></div>;
  const job = state.jobs.find(task => task.workers.includes(item.id));
  const pairIndex = job?.workers.indexOf(item.id) ?? 0;
  const hauling = job?.kind === 'delivery' && ['haul','unload'].includes(job.phase) || job?.kind === 'restock' && job.phase === 'stall' || job?.kind === 'forage' && job.phase === 'return';
  const resting = item.sleepUntil !== null;
  const walking = job && !['pick','load','unload','serve'].includes(job.phase);
  const offset = job?.workers.length > 1 ? (pairIndex ? 11 : -11) : (!job && !resting ? ((item.order % 5) - 2) * 12 : 0);
  const counter = !mode && item.workRole === 'vendor' && stallById(state, item.stallId);
  const atCounter = counter && distance(item, counter) < 55;
  return <><button type="button" className={`map-item worker-item${state.favorites.includes(item.id) ? ' favorite-worker' : ''}`} style={{ ...base, '--offset': `${offset}px` }}
    aria-label={atCounter ? 'Открыть торговую лавку' : `Осмотреть ёжика: ${item.name}${resting ? '. Спит' : ''}`}
    aria-pressed={atCounter ? undefined : selected} onClick={event => atCounter ? handlers.market(event, { stallId: counter.id }) : handlers.worker(event, item)}>
    <HedgeSprite hedge={item} walking={Boolean(walking)} sleeping={resting}/>
    {hauling && <span className="carrying-basket"><BasketArt level={state.orchards.find(orchard => orchard.id === job.orchardId)?.basketLevel}/></span>}
    {item.industryCargo && <Glyph name={GOODS[item.industryCargo.item].icon} className="carrying"/>}
    {item.fuelCan > 0 && <Glyph name="fuel" className="carrying"/>}
    {job?.load > 0 && <Glyph name={['gold', 'berry', 'wheat'].includes(job.variety) ? job.variety : 'apple'} className="carrying"/>}
    {resting && <SleepLetters className="world-sleep"/>}
    <WorkerSpeech quote={state.quote} workerId={item.id}/>
  </button>{selected && <span className="worker-marker" style={{ ...xy(item), zIndex: WORLD.height + 5, '--offset': `${offset}px` }} aria-hidden="true"><WorkerMarker/></span>}</>;
}

const PlantSprite = memo(function PlantSprite({ id, x, y, variety, fruit, dry, grafted, clearing, animation, onTree, guided }) {
  const position = { left: x, top: y, zIndex: Math.round(y - WORLD.y) };
  const name = VARIETIES[variety].label;
  const click = event => onTree(event, id);
  if (isFieldCrop(variety)) {
    const label = dry ? `Полить: ${name}` : fruit ? `Собрать: ${name} ×${fruit}` : `${name} · растёт`;
    return <button type="button" className={`map-item berry-item${dry ? ' dry' : ''}`} style={position} aria-label={label} onClick={click}>
      {variety === 'wheat' ? <WheatArt ripe={fruit > 0} dry={dry} point={{x,y}}/> : <BerryBushArt fruit={fruit} point={{x,y}} drying={dry} watered={!fruit && !dry}/>}
      {dry && <span className="fruit-label berry"><Glyph name="water"/></span>}
    </button>;
  }
  const label = clearing ? `Срубить дерево. ${name}` : `${name}, яблок: ${fruit}`;
  return <button type="button" className={`map-item tree-item${fruit ? ' ripe' : ''}`}
    data-tutorial-highlight={guided || undefined} style={{ ...position, '--wind-delay': `-${id % 19 * 5}s` }} aria-label={label} onClick={click}>
    <span key={animation} className={`tree-motion${animation ? ' touched' : ''}`}><AppleTree fruit={fruit} point={{x,y}} variety={variety} grafted={grafted}/></span>
  </button>;
});

function OrchardMap({ state, mode, orchardId, sprinklerId, movingStall, selectedWorkerId, focusPoint, onPoint, onTree, onWorker, onFlower, onBasket, onSprinkler, onMarket, onWater, onWild, onIndustry, roadStart, reveal, tutorialTarget, plantTarget }) {
  const [hover, setHover] = useState(null);
  const [tap, setTap] = useState(null);
  const tapId = useRef(0);
  const panorama = usePanorama({ bounds: WORLD, initial: initialCamera,
    onHover: point => { if (mode) setHover(point); }, onDrag: () => setHover(null),
    onEnter: onPoint,
  });
  const { focus } = panorama;
  const viewport = panorama.surface.ref;
  useEffect(() => { if (focusPoint) focus(focusPoint); }, [focusPoint, focus]);
  const beforeReveal = useRef(null);
  useLayoutEffect(() => {
    if (reveal && !beforeReveal.current) {
      beforeReveal.current = panorama.centerPoint;
      focus({ x:reveal.x, y:reveal.y, zoom:Math.max(.82,panorama.centerPoint.zoom) });
    } else if (!reveal && beforeReveal.current) {
      focus(beforeReveal.current);
      beforeReveal.current = null;
    }
  }, [reveal, focus]);
  useEffect(() => { if (mode === 'assign') viewport.current?.focus({ preventScroll: true }); }, [mode, viewport]);
  const treeInput = useRef(null);
  useLayoutEffect(() => {
    treeInput.current = { state, onTree, dragged: panorama.dragged };
  });
  const interactWithPlant = useCallback((event, id) => {
    const latest = treeInput.current;
    if (latest.dragged(event)) return;
    const tree = latest.state.trees.find(tree => tree.id === id);
    if (!tree) return;
    setTap({ id, at: latest.state.time, serial: ++tapId.current });
    latest.onTree(tree);
  }, []);
  const guard = handler => (event, item) => { if (!panorama.dragged(event)) handler(item); };
  const handlers = { flower: guard(onFlower), basket: guard(onBasket), worker: guard(onWorker), sprinkler: guard(onSprinkler), market: guard(onMarket), water: guard(onWater), wild: guard(onWild), industry: guard(onIndustry) };
  const orchardsById = Object.fromEntries(state.orchards.map(orchard => [orchard.id, orchard]));
  const receiptsBySite = new Map();
  for (const receipt of state.resourceReceipts ?? []) {
    if (!receiptsBySite.has(receipt.anchor)) receiptsBySite.set(receipt.anchor, []);
    receiptsBySite.get(receipt.anchor).push(receipt);
  }
  const waterPoints = new Map();
  for (const orchard of state.orchards) {
    const farm = berryBounds(state, orchard.id);
    if (!farm) continue;
    const { x, y } = farm.water;
    const id = `water-${x},${y}`;
    if (!waterPoints.has(id) || orchard.id === orchardId) waterPoints.set(id, { x, y, id, kind: 'water', orchardId: orchard.id });
  }
  const accountStall = scientistStall(state);
  const scientistWaiting = state.scientist?.stage === 'offered' || scientistReady(state);
  const driving = new Set(state.industry.tractors.map(tractor => tractor.trip?.driverId));
  // Leave room for tall sprites and movements that cross a viewport edge between ticks.
  const camera = panorama.centerPoint;
  const halfWidth = panorama.viewSize.width / (2 * panorama.zoom) + 240;
  const halfHeight = panorama.viewSize.height / (2 * panorama.zoom) + 240;
  const onScreen = point => Math.abs(point.x - camera.x) <= halfWidth && Math.abs(point.y - camera.y) <= halfHeight;
  const plants = state.trees.filter(onScreen);
  const apples = plants.filter(tree => !isFieldCrop(tree.variety));
  const fertilized = state.upgrades.includes('crop');
  const things = [
    ...COAL_SITES.flatMap((peak, index) => state.industry.mines.some(mine => distance(peak, mine) < 1) ? [] : [
      { ...peak, id: `mountain-${index}`, kind: 'mountain' },
    ]),
    ...industryStations(state).map(site => ({ ...site, site, kind: 'industry' })),
    ...researchSites(state).map(site => ({ ...site, site, kind:'research-site' })),
    ...state.trade.stalls.map((stall,index) => ({ ...stall, scientist: scientistWaiting && accountStall?.id === stall.id, kind:'stall', ordinal:index+1, stallId:stall.id, id:`stall-${stall.id}` })),
    ...state.trade.stalls.flatMap(stall => stall.customers.map(customer => ({ ...customer, kind:'customer', person:customer.kind, id:`customer-${customer.id}` }))),
    ...state.trade.wild.map(patch => ({ ...patch, kind:'wild' })),
    ...waterPoints.values(),
    ...state.flowers.map(item => ({ ...item, kind: 'flower' })),
    ...apples.filter(tree => orchardsById[tree.orchardId]?.compostLevel > 0)
      .map(tree => ({ ...tree, id: `compost-${tree.id}`, kind: 'compost', level: orchardsById[tree.orchardId].compostLevel })),
    ...apples.filter(tree => fertilized || state.trade.orchardPerks[tree.orchardId]?.mulch)
      .map(tree => ({ ...tree, id: `soil-${tree.id}`, kind: 'soil' })),
    ...state.orchards.flatMap(orchard => orchardBeds(state, orchard).map((bed, index) => ({ ...bed, id: `bed-${orchard.id}-${index}`, kind: 'bed' }))),
    ...state.orchards.map(orchard => ({ ...orchard.basket, id: `basket-${orchard.id}`, orchard, kind: 'basket' })),
    ...state.orchards.filter(orchard => orchard.loadingLevel > 0 || state.trade.orchardPerks[orchard.id]?.depot).map(orchard => {
      const point = [[54, -16], [-54, -16], [38, 37], [-38, 37]].map(([dx, dy]) => ({ x: orchard.basket.x + dx, y: orchard.basket.y + dy }))
        .find(candidate => orchardAt(state, candidate)?.id === orchard.id && terrainKind(candidate) === 'ground');
      return { ...(point ?? { x: orchard.basket.x + 46, y: orchard.basket.y + 18 }), id: `loading-${orchard.id}`, kind: 'loading-table',
        level: state.trade.orchardPerks[orchard.id]?.depot ? 3 : orchard.loadingLevel };
    }),
    ...state.orchards.flatMap(orchard => orchard.sprinklers.map((sprinkler, index) => ({ ...sprinkler,
      id: `sprinkler-${sprinkler.id}`, sprinklerId: sprinkler.id, orchard, order: index + 1, kind: 'sprinkler' }))),
    { ...HOUSE, id: 'house', kind: 'house' },
    ...(state.shelvesLevel > 0 ? [{ x: HOUSE.x + 63, y: HOUSE.y + 26, id: 'crate-rack', kind: 'crate-rack', level: state.shelvesLevel }] : []),
    ...(state.upgrades.includes('pantry') ? [{ ...STOREHOUSE, id: 'storage', kind: 'storage' }] : []),
    ...state.jobs.filter(job => job.kind === 'manual').map(job => ({ ...job.carrier, id: `courier-${job.id}`, kind: 'manual', level: orchardsById[job.orchardId]?.basketLevel })),
    ...state.workers.filter(worker => !driving.has(worker.id)).map((item, order) => ({ ...item, kind: 'worker', order })),
  ];
  const ghost = mode && hover;
  const variety = plantingVariety[mode];
  const planting = Boolean(variety);
  const placingLand = landModes.includes(mode);
  const building = buildKind(mode);
  const researchBuilding = researchKind(building);
  const researchPlacement = ghost && researchBuilding && researchBuildSite(state,researchBuilding,hover);
  const gridPlan = researchPlacement && gridPlacement(state,researchBuilding,hover);
  const eligibleBuilding = building && Object.hasOwn(BUILDINGS, building);
  const activePlots = state.orchards.map(item => plotBounds(state, item.id));
  const previousPlot = mode === 'moveFarm' || mode === 'moveGarden' ? plotBounds(state, orchardId) : null;
  const tradePlacement = mode === 'market' || placingLand;
  const placementPlots = tradePlacement || (ghost && building) ? constructionPlots(state) : null;
  const site = ghost && tradePlacement && (mode === 'market' ? marketSite(state, hover, placementPlots, movingStall)
    : mode === 'garden' || mode === 'moveGarden' ? landSite(state, hover, placementPlots, previousPlot) : farmSite(state, hover, placementPlots, mode === 'moveFarm', orchardId));
  const buildSite = ghost && eligibleBuilding && buildingSite(state, building, hover, placementPlots);
  const rating = !site ? 0 : mode === 'market' ? site.demand
    : soilRate(site, activePlots.filter(plot => plot !== previousPlot));
  const marketPreview = site && mode === 'market' ? marketDemand(state, site, site.road, movingStall) : null;
  const color = conditionColor(rating);
  const placingSprinkler = mode === 'sprinkler';
  const valid = ghost && (planting ? canPlant(state, hover, variety) : placingSprinkler ? canPlaceSprinkler(state, hover, orchardId, sprinklerId) : canMoveBasket(state, hover, orchardId));
  return <div {...panorama.surface} className={`map-viewport${mode ? ' placing' : ''}${mode === 'clear' ? ' clearing' : ''}`} role="region" aria-label="Панорама сада"
      onClickCapture={event => {
        if (mode !== 'assign' || panorama.dragged(event) || !event.detail || event.target.closest('.orchard-bound > button')) return;
        event.stopPropagation();
        onPoint(panorama.toWorld(event));
      }}
      onClick={event => { if (!panorama.dragged(event) && !event.target.closest('button')) onPoint(panorama.toWorld(event)); }}>
      <div className={`map-world${reveal ? ' reveal-camera' : ''}`} style={{ ...panorama.scene, '--receipt-scale': 1 / panorama.zoom }}>
        <WorldBackdrop/>
        <svg className="built-roads" width={WORLD.width} height={WORLD.height} viewBox={`${WORLD.x} ${WORLD.y} ${WORLD.width} ${WORLD.height}`} aria-hidden="true">
          <defs>
            <pattern id="road-speckles" width="30" height="24" patternUnits="userSpaceOnUse">
              <path d="M2 3h7v3H2zM16 17h5v3h-5zM25 8h4v4h-4z" fill="#e0c494" opacity=".48"/>
              <path d="M9 12h8v3H9zM3 20h4v2H3zM24 1h4v2h-4z" fill="#6f5d45" opacity=".38"/>
            </pattern>
          </defs>
          {state.industry.roads.map(road => <g key={road.id} className={road.level === 2 ? 'paved-road' : 'new-road'}>
            <line x1={road.from.x} x2={road.to.x} y1={road.from.y} y2={road.to.y}/><line x1={road.from.x} x2={road.to.x} y1={road.from.y} y2={road.to.y}/>
          </g>)}
          {researchSites(state).length > 0 && powerNetworks(state).flatMap(net => net.links.map(([from,to]) =>
            <line key={from.id + to.id} className="research-wire" x1={from.x} y1={from.y - 25} x2={to.x} y2={to.y - 25}/>))}
          {gridPlan?.links.map(site => <line key={site.id} className="research-preview-wire" x1={site.x} y1={site.y - 25} x2={hover.x} y2={hover.y - 25}/>)}
          {ghost && ['pole','generator','battery','wheel','turbine','pump','sign','square','shelter','lamp','lab'].includes(researchBuilding) &&
            <circle className="research-range" cx={hover.x} cy={hover.y} r={researchBuilding === 'pump' ? hasResearch(state,'wideSpray') ? 215 : 155 : ['sign','square','lamp'].includes(researchBuilding) ? 265 : researchBuilding === 'shelter' ? 230 : gridPlan?.coverage ?? 290}/>}
          {roadStart && hover && <line className="road-preview" x1={roadStart.x} y1={roadStart.y} x2={hover.x} y2={hover.y}/>}
        </svg>
        {tradePlacement && <PlacementOverlay state={state} mode={mode} plots={placementPlots} gardens={activePlots}
          movingPlot={previousPlot} movingStall={movingStall} rivals={marketPreview?.rivals}/>}
        {state.orchards.map(orchard => {
          const bounds = plotBounds(state, orchard.id);
          const soil = soilRate(bounds, activePlots);
          const targeted = mode === 'assign' || planting || orchard.id === orchardId;
          return <div key={orchard.id} className={`orchard-bound${targeted ? ' orchard-target' : ''}${isBerryOrchard(orchard.id) ? ' berry-plot' : ''}`} style={rect(bounds)}>
            {state.upgrades.includes('roots') && <OrchardFence {...bounds}/>}
            {orchard.trailLevel > 0 && <OrchardPavers {...bounds} level={orchard.trailLevel}/>}
            {state.unlocked && (!mode || mode === 'assign') ? <button type="button" aria-pressed={mode !== 'assign' && orchard.id === orchardId}
              onClick={event => {
                if (!panorama.dragged(event)) onPoint({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
              }}>{orchardName(orchard.id)}</button> : <span aria-hidden="true">{orchardName(orchard.id)}</span>}
            {soil < .8 && !mode && <Tooltip label="Истощённая почва" detail={plotWarning(soil)} tap><button type="button" className="pixel-button soil-alert" aria-label={plotWarning(soil)}><Glyph name="soil"/>{Math.round(soil * 100)}%</button></Tooltip>}
          </div>;
        })}
        {ghost && placingSprinkler && <div className={`sprinkler-range ${valid ? 'allowed' : ''}`} style={{ ...xy(hover), width: SPRINKLER_RADIUS * 2, height: SPRINKLER_RADIUS * 2 }} aria-hidden="true"/>}
        {plants.map(tree => {
          const orchard = orchardsById[tree.orchardId];
          const grafted = state.upgrades.includes('grafting') && tree.variety !== 'red'
            || orchard?.specialtyLevel > 0 && (orchard.id === EAST_ORCHARD && tree.variety === 'gold' || orchard.id === START_ORCHARD && tree.variety === 'red');
          const pulse = tree.pulse && state.time - tree.pulse.at < 650 ? `pick-${tree.pulse.id}` : null;
          const clicked = tap?.id === tree.id && state.time - tap.at < 650;
          const animation = clicked && (!pulse || tap.at >= tree.pulse.at) ? `tap-${tap.serial}` : pulse;
          return <PlantSprite key={tree.id} id={tree.id} x={tree.x} y={tree.y} variety={tree.variety} fruit={tree.fruit}
            dry={tree.readyAt === null && !tree.fruit} grafted={Boolean(grafted)} clearing={mode === 'clear'} animation={animation} onTree={interactWithPlant} guided={tutorialTarget === `tree-${tree.id}`}/>;
        })}
        {plantTarget && <div className="tutorial-plant-target" style={xy(plantTarget)} aria-hidden="true"><Glyph name="seed"/></div>}
        {onScreen(PICNIC_SPOT) && <PicnicScene/>}
        {things.filter(onScreen).map(item => <MapSprite key={item.id} item={item} state={state} handlers={handlers} mode={mode}
          selected={item.id === selectedWorkerId} guided={tutorialTarget === item.id}
          receipts={receiptsBySite.get(item.kind === 'stall' ? `stall:${item.stallId}` : item.id)}/>)}
        {ghost && mode === 'market' && <div className={`market-placement stall-placement plant-preview${site ? ' allowed' : ''}`} style={xy(hover)}><MarketStallArt/></div>}
        {ghost && placingLand && <div className={`market-placement farm-placement${site ? ' allowed' : ''}`} style={{ ...rect(site ?? landFootprint(hover)), '--condition': color }}/>}
        {ghost && tradePlacement && <span className="site-preview" style={{ ...xy(hover), '--condition': color }}>{!site ? 'Здесь нельзя строить'
          : mode === 'market' ? `Спрос ${Math.round(rating * 100)}% · ${trafficLabel[site.traffic]}${marketPreview?.rivals.length ? ` · соседние лавки −${Math.round((1-marketPreview.competition)*100)}%` : ''}`
            : plotWarning(rating)}</span>}
        {ghost && researchBuilding && <div className={`plant-preview industry-ghost ${researchPlacement ? 'allowed' : ''}`} style={xy(hover)}>
          <ResearchStationArt kind={researchBuilding}/>
        </div>}
        {ghost && researchBuilding && <span className="site-preview research-placement-label" style={{...xy(hover),'--condition':researchPlacement ? '#afcc91' : '#eb9a7c'}}>
          {!researchPlacement ? researchBuilding === 'wheel' ? 'Нужен свободный берег' : researchBuilding === 'turbine' ? 'Нужно открытое место' : 'Здесь нельзя строить'
            : gridPlan ? `Мощность ${Math.round(gridPlan.supply)} / ${gridPlan.demand} · ${gridPlan.demand ? Math.min(100,Math.round(100 * gridPlan.supply/gridPlan.demand)) + '%' : 'нет нагрузки'} · Связей ${gridPlan.links.length}`
            : ['sign','square'].includes(researchBuilding) ? 'Привлекает гостей · 265 шагов' : researchBuilding === 'shelter' ? 'Работа +4% · 230 шагов' : RESEARCH_BUILDINGS[researchBuilding][0]}
        </span>}
        {ghost && eligibleBuilding && <div className={`plant-preview industry-ghost ${buildSite ? 'allowed' : ''}`} style={xy(buildSite ?? hover)}>
          <IndustryArt site={{ kind: building }}/></div>}
        {ghost && !tradePlacement && !building && mode !== 'assign' && mode !== 'clear' && <div className={`plant-preview ${valid ? 'allowed' : ''}${placingSprinkler ? ' sprinkler-preview' : planting ? ' tree-preview' : ''}`} style={{ ...xy(hover), zIndex: WORLD.height + 4 }} aria-hidden="true">
          {planting ? variety === 'wheat' ? <WheatArt dry point={hover}/> : variety === 'berry' ? <BerryBushArt fruit={0} point={hover} drying/> : <AppleTree fruit={0} variety={variety} point={hover}/> : placingSprinkler ? <SprinklerArt spray={false} level={orchardsById[orchardId]?.irrigationLevel}/> : <BasketArt level={orchardsById[orchardId]?.basketLevel}/>}
        </div>}
      </div>
    </div>;
}

function Hardware() {
  return <div className="frame-hardware" aria-hidden="true"><i/><i/><i/><i/></div>;
}

function Panel({ name, symbol, open, toggle, side, profile, onProfileClose, onRename, contentKey, guided, children }) {
  return <aside id={`panel-${side}`} className={`side-window ${side}${open ? ' open' : ''}`} aria-label={name}>
    <section className="pixel-window">
      <Hardware/>
      <header className="panel-heading">
        {profile ? <HedgeProfileHeader key={profile.id} worker={profile} onRename={onRename} onClose={onProfileClose}/>
          : <button type="button" className="window-title" data-tutorial-highlight={guided || undefined} aria-expanded={open} onClick={toggle}>
            {icon(symbol, name)}<Glyph name={open ? 'minus' : 'plus'}/>
          </button>}
      </header>
      {open && <div className="window-content" key={contentKey ?? profile?.id}>{children}</div>}
    </section>
  </aside>;
}

function CoinProjects({ state, dispatch }) {
  return <section aria-label="Общие улучшения за монеты">
    <h3 className="coin-project-title"><Glyph name="coin"/> Общие улучшения за монеты</h3>
    {Object.entries(GLOBAL_UPGRADES).map(([key, project]) => {
      if (project.berryFarm && !state.trade.berryFarm) return null;
      const level = globalUpgradeLevel(state, key);
      const capped = level >= project.max;
      const cost = globalUpgradePrice(state, key);
      return <div className="shop-project" key={key}>
        <div className="project-label"><Glyph name={project.icon}/><b>{project.label}</b><small>{level}/{project.max}</small></div>
        <p>{project.desc}</p>
        <button type="button" className="pixel-button mini buy-button"
          aria-label={capped ? `${project.label}. Улучшение завершено` : `Купить «${project.label}» за ${cost} монет`}
          disabled={capped || state.trade.coins < cost} onClick={() => dispatch('buyGlobalUpgrade', { key })}>
          <span>{capped ? 'Готово' : level ? 'Улучшить' : 'Купить'}</span>{!capped && <b>{icon('coin', number.format(cost))}</b>}
        </button>
      </div>;
    })}
  </section>;
}

function Shop({ state, dispatch, mode, setMode, orchard, clearOrchard, sprinklerId, onSprinkler, onNewSprinkler, onOpenMarket, onFocus, onIndustry, tutorialTarget }) {
  const price = seedPrice(state);
  const farm = orchard && berryBounds(state, orchard.id);
  return <>
    {!state.unlocked && <div className="mystery-offer">
      <div className="mystery-portrait"><HedgeSprite hedge={GUIDE} hidden/></div>
      <h2>???</h2>
      <p>{Math.min(state.apples, BALANCE.mystery)} / {BALANCE.mystery} яблок дома</p>
      <button type="button" className="pixel-button buy-button" data-tutorial-highlight={tutorialTarget === 'mystery' || undefined} disabled={!potatoAvailable(state)} onClick={() => dispatch('unlock')}>
        <span>Открыть</span><b>{icon('apple', BALANCE.mystery)}</b>
      </button>
    </div>}
    <div className="shop-row">
      <div className="shop-art">{icon('seed')}</div><div className="shop-name">Саженец<span>В сумке {state.seeds}</span></div>
      <button type="button" className="pixel-button mini" data-tutorial-highlight={tutorialTarget === 'seed' || undefined} disabled={state.apples < price} aria-label={`Купить саженец за ${number.format(price)} яблок`} onClick={() => dispatch('buySeed')}>{icon('apple', number.format(price))}</button>
    </div>
    <button type="button" className="pixel-button shop-tool" data-tutorial-highlight={tutorialTarget === 'plant' || undefined} aria-keyshortcuts="P" aria-pressed={mode === 'plant'} disabled={!state.seeds} onClick={() => setMode(mode === 'plant' ? null : 'plant')}>
      {icon('seed', mode === 'plant' ? 'Отменить посадку' : 'Посадить яблоню')}<kbd>P</kbd>
    </button>
    {state.upgrades.includes('seedExchange') && <button type="button" className="pixel-button shop-tool" disabled={state.goldSeeds < 2}
      onClick={() => dispatch('exchangeSeeds')}>{icon('seedSatchel','Обменять 2 янтарных на 3 обычных')}</button>}
    {state.goldDiscovered && <button type="button" className="pixel-button shop-tool gold-tool" data-tutorial-highlight={tutorialTarget === 'plantGold' || undefined} aria-pressed={mode === 'plantGold'} disabled={!state.goldSeeds} onClick={() => setMode(mode === 'plantGold' ? null : 'plantGold')}>
      {icon('gold', mode === 'plantGold' ? 'Отменить посадку' : `Янтарный саженец ×${state.goldSeeds}`)}
    </button>}
    {state.orchards.some(item => item.id === FOREST_ORCHARD) && <div className="shop-row regional-seed">
      <button type="button" className="pixel-button mini" disabled={!state.forestSeeds} data-tutorial-highlight={tutorialTarget === 'plantForest' || undefined} aria-pressed={mode === 'plantForest'} onClick={() => setMode(mode === 'plantForest' ? null : 'plantForest')}>{icon('seed',`Лесной саженец ×${state.forestSeeds}`)}</button>
      <Tooltip label="Купить лесной саженец"><button type="button" className="pixel-button mini" aria-label="Купить лесной саженец за 85 яблок" disabled={state.apples < 85} onClick={() => dispatch('buyForestSeed')}>{icon('apple',85)}</button></Tooltip>
    </div>}
    {state.trade.berryFarm && <div className="shop-row regional-seed">
      <button type="button" className="pixel-button mini" disabled={!state.trade.berrySeeds} aria-pressed={mode === 'plantBerry'} onClick={() => setMode(mode === 'plantBerry' ? null : 'plantBerry')}>{icon('berry',`Куст ×${state.trade.berrySeeds}`)}</button>
      <Tooltip label="Купить ягодный саженец"><button type="button" className="pixel-button mini" aria-label="Купить ягодный саженец за 35 монет" disabled={state.trade.coins < 35} onClick={() => dispatch('buyBerrySeed')}>{icon('coin',35)}</button></Tooltip>
    </div>}
    {state.industry.unlocked && state.trade.berryFarm && <div className="shop-row regional-seed">
      <button type="button" className="pixel-button mini" disabled={!state.industry.wheatSeeds} aria-pressed={mode === 'plantWheat'} onClick={() => setMode(mode === 'plantWheat' ? null : 'plantWheat')}>{icon('wheat', `Пшеница ×${state.industry.wheatSeeds}`)}</button>
      <Tooltip label="Купить семена пшеницы"><button type="button" className="pixel-button mini" aria-label="Купить семена пшеницы за 35 монет" disabled={state.trade.coins < 35} onClick={() => dispatch('buyWheatSeed')}>{icon('coin', 35)}</button></Tooltip>
    </div>}
    {state.upgrades.includes('clearing') && <button type="button" className="pixel-button shop-tool" aria-pressed={mode === 'clear'}
      onClick={() => setMode(mode === 'clear' ? null : 'clear')}>{icon('axe', mode === 'clear' ? 'Убрать топор' : 'Убрать растение')}</button>}
    {state.unlocked && <div className="shop-projects">
      <div className="shop-section">
        <h2>{orchard ? orchardName(orchard.id) : 'Общие улучшения'}</h2>
        {orchard && <button type="button" className="pixel-button mini square" aria-label="Вернуться к общим улучшениям" onClick={clearOrchard}><Glyph name="back"/></button>}
      </div>
      {!orchard && <p className="shop-hint">Выбери сад на карте, чтобы открыть его улучшения.</p>}
      {!orchard && state.orchards.some(item => item.id === FOREST_ORCHARD) && !state.trade.permit && <div className="shop-project">
        <div className="project-label">{icon('market','Разрешение на торговлю')}</div>
        <p>Разрешение и первая лавка.</p>
        <button type="button" className="pixel-button mini buy-button" disabled={state.apples < PERMIT_PRICE} onClick={() => dispatch('permit')}>
          <span>Купить разрешение</span><b>{icon('apple',number.format(PERMIT_PRICE))}</b></button>
      </div>}
      {!orchard && state.trade.permit && <div className="shop-project">
        <div className="project-label">{icon('market','Торговые лавки')}</div>
        {state.trade.stalls.map((stall,index) => <button type="button" key={stall.id} className="pixel-button mini" onClick={() => onOpenMarket(stall)}>Лавка {index+1}</button>)}
        <button type="button" className="pixel-button mini buy-button" aria-pressed={mode === 'market'} disabled={state.trade.coins < stallPrice(state)} onClick={() => setMode('market')}>
          <span>Выбрать место для лавки</span><b>{stallPrice(state) ? icon('coin',number.format(stallPrice(state))) : 'Бесплатно'}</b>
        </button>
      </div>}
      {!orchard && state.trade.permit && <div className="shop-project">
        <div className="project-label">{icon('map', 'Новые участки')}</div>
        <p>Выбери поляну на карте. Цена каждого вида участка растёт после покупки.</p>
        <button type="button" className="pixel-button mini buy-button" disabled={state.trade.coins < landPrice(state, false)} onClick={() => setMode('garden')}>
          <span>Купить яблоневый сад</span><b>{icon('coin', number.format(landPrice(state, false)))}</b>
        </button>
        {(state.trade.berryKnown || state.industry.unlocked) && <>
          <button type="button" className="pixel-button mini buy-button" disabled={!farmAvailable(state) || state.trade.coins < landPrice(state, true)} onClick={() => setMode('farm')}>
            <span>Купить ферму</span><b>{icon('coin', number.format(landPrice(state, true)))}</b>
          </button>
          {!farmAvailable(state) && <p>Для покупки фермы улучши торговые лавки дважды.</p>}
        </>}
      </div>}
      {!orchard && state.trade.permit && <button type="button" className="pixel-button shop-tool" onClick={onIndustry}>{icon('table', 'Хозяйство')}</button>}
      {orchard && isPurchasedGarden(orchard.id) && <button type="button" className="pixel-button shop-tool" disabled={state.trade.coins < MOVE_FARM_PRICE} onClick={() => setMode('moveGarden')}>{icon('map', 'Перенести сад · 160')}</button>}
      {!orchard && state.trade.permit && <CoinProjects state={state} dispatch={dispatch}/>}
      {farm && <div className="shop-project">
        <div className="project-label">{icon('berry',farm.rich ? 'Плодородная земля' : 'Обычная земля')}</div>
        <button type="button" className="pixel-button mini" onClick={() => onFocus(farm.water)}>{icon('water','Найти место для воды')}</button>
        <button type="button" className="pixel-button mini buy-button" disabled={state.trade.coins < MOVE_FARM_PRICE} onClick={() => setMode('moveFarm')}>
          <span>Перенести ферму</span><b>{icon('coin', MOVE_FARM_PRICE)}</b></button>
        <p>Поливов в лейке: {state.trade.canWater}</p>
        {!state.trade.largeCan && <button type="button" className="pixel-button mini buy-button" disabled={state.apples < 260} onClick={() => dispatch('buyWaterCan')}>
          <span>Большая лейка</span><b>{icon('apple',260)}</b></button>}
      </div>}
      {orchard && !farm && state.trade.permit && <div className="shop-project">
        <div className="project-label">{icon('table','Оборудование сада')}</div>
        {!state.trade.orchardPerks[orchard.id]?.depot && <button type="button" className="pixel-button mini buy-button" disabled={state.trade.coins < 210}
          onClick={() => dispatch('buyOrchardTrade',{orchardId:orchard.id,key:'depot'})}><span>Быстрая погрузка</span><b>{icon('coin',210)}</b></button>}
        {state.trade.berryFarm && !state.trade.orchardPerks[orchard.id]?.mulch && <button type="button" className="pixel-button mini buy-button" disabled={state.trade.berries < 90}
          onClick={() => dispatch('buyOrchardTrade',{orchardId:orchard.id,key:'mulch'})}><span>Ягодная мульча</span><b>{icon('berry',90)}</b></button>}
      </div>}
      {farm && <p className="shop-hint">Ферму пока поливают лейкой. Разбрызгиватели для посевов появятся с исследованиями.</p>}
      {orchard && !farm && <div className="shop-project">
        <div className="project-label"><Glyph name="water"/><b>Разбрызгиватели</b><small>{orchard.sprinklers.length}/{SPRINKLER_LIMIT}</small></div>
        <p>Яблони в круге созревают на 9% быстрее за уровень. Круг показан при выборе места.</p>
        <button type="button" className="pixel-button mini buy-button" disabled={orchard.sprinklers.length >= SPRINKLER_LIMIT || state.apples < sprinklerPrice(orchard)}
          aria-pressed={mode === 'sprinkler' && sprinklerId === null} onClick={onNewSprinkler}>
          <span>{orchard.sprinklers.length >= SPRINKLER_LIMIT ? 'Все места заняты' : 'Поставить новый'}</span>
          {orchard.sprinklers.length < SPRINKLER_LIMIT && sprinklerPrice(orchard) > 0 && <b>{icon('apple', number.format(sprinklerPrice(orchard)))}</b>}
        </button>
        {orchard.sprinklers.length > 0 && <div className="sprinkler-list">
          {orchard.sprinklers.map((sprinkler, index) => <button type="button" key={sprinkler.id} className="pixel-button mini"
            aria-label={`Переместить разбрызгиватель ${index + 1}`} aria-pressed={mode === 'sprinkler' && sprinklerId === sprinkler.id}
            onClick={() => onSprinkler({ orchard, sprinklerId: sprinkler.id })}>{icon('water', String(index + 1))}</button>)}
        </div>}
      </div>}
      {Object.entries(SHOP).map(([id, project]) => {
        const general = project.unlock || project.general;
        if (Boolean(general) === Boolean(orchard) || (project.orchardId && project.orchardId !== orchard?.id)
          || (farm && id !== 'basket' && id !== 'loading' && id !== 'trail') || (id === 'sprinkler' && !orchard?.sprinklers.length)) return null;
        const level = shopLevel(state, id, orchard);
        const capped = level >= project.max;
        if (project.unlock && capped) return null;
        const cost = shopPrice(id, level);
        return <div className="shop-project" key={id}>
          <div className="project-label"><Glyph name={project.icon}/><b>{project.label}</b>{project.max > 1 && <small>{level}/{project.max}</small>}</div>
          <p>{project.desc}</p>
          <button type="button" className="pixel-button mini buy-button" disabled={capped || state.apples < cost}
            aria-label={capped ? `${project.label}. Улучшение завершено` : `Купить ${project.label} за ${cost} яблок`}
            onClick={() => dispatch('shopUpgrade', { id, orchardId: orchard?.id })}>
            <span>{capped ? 'Готово' : level ? 'Улучшить' : 'Купить'}</span>{!capped && <b>{icon('apple', number.format(cost))}</b>}
          </button>
        </div>;
      })}
    </div>}
    {(orchard || !state.unlocked) && <button type="button" className="pixel-button shop-tool" aria-pressed={mode === 'basket'} onClick={() => setMode(mode === 'basket' ? null : 'basket')}>
      {icon('basket', mode === 'basket' ? 'Отменить перенос' : 'Перенести корзину')}
    </button>}
  </>;
}

function WorkerList({ state, dispatch, onInspect, onAssign, assigningId, orchardId, tutorialTarget, onTeam }) {
  const capacity = groupCapacity(state);
  const places = workplaces(state);
  const [editor, setEditor] = useState(null);
  const editorButton = useRef(null);
  const recruit = state.recruitOffer;
  const perk = PERKS[recruit?.perk];

  function toggleEditor(event, id, kind) {
    editorButton.current = event.currentTarget;
    setEditor(current => current?.id === id && current.kind === kind ? null : { id, kind });
  }

  function closeEditor() {
    editorButton.current?.focus({ preventScroll: true });
    setEditor(null);
  }
  return <>
    <div className="group-caption"><h2>Избранная кучка</h2><span>{state.favorites.length}/{capacity}</span></div>
    <div className="group-slots" aria-label="Места избранной кучки">
      {Array.from({length:capacity}, (_, index) => {
        const worker = state.workers.find(item => item.id === state.favorites[index]);
        return <button type="button" key={index} className="group-slot" disabled={!worker} aria-label={worker ? `Убрать ${worker.name} из кучки` : 'Свободное место'}
          onClick={() => dispatch('favorite', { id: worker.id })}>{worker ? <HedgeSprite hedge={worker}/> : <Glyph name="plus"/>}</button>;
      })}
    </div>
    {state.workers.length > 0 && <nav className="team-launchers" aria-label="Команда">
      <button type="button" className="pixel-button mini" onClick={() => onTeam('assign')}>{icon('hedgePair','Назначить группу')}</button>
      <button type="button" className="pixel-button mini" onClick={() => onTeam('presets')}>{icon('save','Наборы')}</button>
    </nav>}
    <LodgePanel state={state} dispatch={dispatch} guided={tutorialTarget === 'lodge'}/>
    {state.workers.map(worker => {
      const favorite = state.favorites.includes(worker.id);
      const kind = editor?.id === worker.id ? editor.kind : null;
      const place = places.find(item => item.id === workerWorkplace(worker));
      const jobTooltip = `Работа: ${workRoleLabel(place?.id, worker.workRole, place)}. Изменить работу.`;
      const destination = place?.label ?? 'Выбрать место';
      const placeTooltip = `Место работы: ${destination}.`;
      const favoriteLabel = favorite ? 'Убрать из кучки' : 'Добавить в кучку';
      const optionsId = `assignment-${worker.id}`;
      return <div key={worker.id} className="worker-card"
        onKeyDown={event => { if (event.key === 'Escape' && kind) { event.stopPropagation(); closeEditor(); } }}>
        <div className="worker-row">
          <button type="button" className="worker-profile" onClick={() => onInspect(worker)}><HedgeSprite hedge={worker}/><span>{worker.name}<small>{destination}</small></span></button>
          <Tooltip label={jobTooltip}><button type="button" className="pixel-button mini worker-quick-action" aria-label={`${worker.name}. ${jobTooltip}`}
            aria-expanded={kind === 'role'} aria-controls={kind === 'role' ? optionsId : undefined}
            onClick={event => toggleEditor(event, worker.id, 'role')}>Работа</button></Tooltip>
          <Tooltip label={placeTooltip}><button type="button" className={`pixel-button mini worker-quick-action${assigningId === worker.id ? ' worker-assigning' : ''}`}
            aria-label={`${worker.name}. ${placeTooltip}`}
            aria-expanded={kind === 'place'} aria-controls={kind === 'place' ? optionsId : undefined}
            onClick={event => toggleEditor(event, worker.id, 'place')}>Место</button></Tooltip>
          <Tooltip label={favoriteLabel}><button type="button" className="pixel-button mini square" aria-label={`${worker.name}. ${favoriteLabel}`}
            aria-pressed={favorite} disabled={!favorite && state.favorites.length >= capacity} onClick={() => dispatch('favorite', { id: worker.id })}>{icon(favorite ? 'check' : 'plus')}</button></Tooltip>
        </div>
        {kind === 'role' && <div className="worker-options" id={optionsId} role="group" aria-label="Работа ёжика">
          {place?.roles.map(role => <button type="button" key={role} className="pixel-button mini"
            aria-pressed={worker.workRole === role} onClick={() => { dispatch('assignRole', { id: worker.id, role }); closeEditor(); }}>
            {icon(WORK_ROLE_ICONS[role], workRoleLabel(place.id, role, place))}{worker.workRole === role && <Glyph name="check" className="assignment-check"/>}
          </button>)}
        </div>}
        {kind === 'place' && <div className="worker-options" id={optionsId} role="group" aria-label="Место работы ёжика">
          {places.map(item => <button type="button" key={item.id} className="pixel-button mini"
            aria-pressed={place?.id === item.id}
            onClick={() => { dispatch('assignWorkplace', { id: worker.id, place: item.id }); closeEditor(); }}>
            {icon(item.icon, item.label)}{place?.id === item.id && <Glyph name="check" className="assignment-check"/>}
          </button>)}
          <button type="button" className="pixel-button mini" onClick={() => { setEditor(null); onAssign(worker); }}>{icon('map', 'Выбрать сад на карте')}</button>
        </div>}
      </div>;
    })}
    {recruit && <section className="recruit-offer" aria-label="Кандидат">
      <HedgeSprite hedge={recruit}/><strong>{recruit.name}</strong>
      <div className="recruit-stats">{Object.entries(recruit.stats).map(([key, value]) =>
        <span key={key} aria-label={`${({speed:'Скорость', strength:'Сила', endurance:'Выносливость', dexterity:'Ловкость', handling:'Сноровка', foraging:'Поиск'})[key]}: ${value}`}><ProfileGlyph name={key}/>{value}</span>)}</div>
      <p className="recruit-perk">{perk && <PerkIcon perk={recruit.perk}/>}<span>{perk ? `${PERK_TIERS.find(tier => tier.id === perk.tier).label}: ${perk.name}. ${perkDescription(recruit.perk,availablePerkJobs(state,places))}` : 'Без особого навыка'}</span></p>
      <JobAdvice places={places} worker={recruit}/>
      <button type="button" className="pixel-button" disabled={state.apples < rerollPrice(state)}
        onClick={() => dispatch('rerollRecruit')}>Другой кандидат · {icon('apple',number.format(rerollPrice(state)))}</button>
    </section>}
    <button type="button" className="pixel-button buy-button hire-button" data-tutorial-highlight={tutorialTarget === 'recruit' || undefined} disabled={Boolean(recruit) && (state.workers.length >= housingCapacity(state) || state.apples < hirePrice(state))}
      onClick={() => dispatch(recruit ? 'recruit' : 'previewRecruit', { orchardId })}>
      <span>{recruit ? 'Нанять' : 'Посмотреть кандидата'} · {state.workers.length}/{housingCapacity(state)}</span><b>{icon('apple', number.format(hirePrice(state)))}</b>
    </button>
  </>;
}

function Guide({ message, onClose }) {
  const dialog = useRef(null);
  const id = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node.open) node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);

  return <dialog ref={dialog} className="guide-popup pixel-window" aria-labelledby={`${id}-speaker`} aria-describedby={`${id}-message`}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <Hardware/>
    <div className="guide-art" aria-hidden="true"><HedgeSprite hedge={GUIDE} hidden={message.hidden} speaking={!message.hidden}/></div>
    <div className="guide-copy">
      <b id={`${id}-speaker`}>{message.hidden ? '???' : 'Картошка'}</b>
      {message.title && <h2>{message.title}</h2>}
      <p id={`${id}-message`}>{message.text}</p>
    </div>
    <button type="button" className="pixel-button guide-continue" autoFocus onClick={onClose}>Понятно</button>
  </dialog>;
}

function BeginnerCue({ task, apples, hidden, hint, onLocate }) {
  return <div className="beginner-task pixel-window">
    <div className="beginner-icon" aria-hidden="true"><HedgeSprite hedge={GUIDE} hidden={hidden}/></div>
    <div className="beginner-copy">
      <strong>{task.chapter.title}</strong>
      <p>{hint}</p>
      <div className="beginner-progress">
        {task.target !== 'lodge' && <span>{icon('apple', `Дома ${number.format(apples)} / ${number.format(task.goal)}`)}</span>}
        {task.basket && <span>{icon('basket', `В корзине ${task.basket.count} / ${task.basket.limit}`)}</span>}
      </div>
    </div>
    {onLocate && <button type="button" className="pixel-button mini" onClick={onLocate} aria-label="Показать цель на карте">{icon('map','Показать')}</button>}
  </div>;
}

function downloadSave(state) {
    const json = JSON.stringify(state);
    if (globalThis.OrchardAndroid) {
      globalThis.OrchardAndroid.exportSave(json);
      return;
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orchard-save.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }


function SaveTransfer({ state, onClose, onImport }) {
  const dialog = useRef(null);
  const fileInput = useRef(null);
  const readId = useRef(0);
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => { readId.current++; if (element.open) element.close(); };
  }, []);


  async function chooseFile(event) {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = '';
    if (!file) return;
    const attempt = ++readId.current;
    setCandidate(null);
    setError(null);
    try {
      const imported = importGame(await file.text());
      if (attempt !== readId.current) return;
      if (imported) setCandidate(imported);
      else setError('Файл не похож на сохранение игры «Ёжиковый сад».');
    } catch {
      if (attempt === readId.current) setError('Не удалось прочитать файл сохранения.');
    }
  }

  return <dialog className="save-dialog pixel-window" ref={dialog} aria-labelledby="save-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <Hardware/>
    <header><h2 id="save-title">Перенос сохранения</h2><button type="button" className="pixel-button mini square" aria-label="Закрыть перенос" onClick={onClose}><Glyph name="close"/></button></header>
    <p>Выгрузи сад в файл и загрузи его в другой сборке.</p>
    <div className="save-actions">
      <button type="button" className="pixel-button" onClick={() => downloadSave(state)}>{icon('save', 'Скачать JSON')}</button>
      <button type="button" className="pixel-button" onClick={() => fileInput.current.click()}>{icon('back', 'Выбрать JSON')}</button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={chooseFile}/>
    </div>
    {error && <p role="alert" className="save-error">{error}</p>}
    {candidate && <div className="save-confirm">
      <p role="status">Уровень {candidate.level} · {number.format(candidate.apples)} ябл. · {candidate.workers.length} ёж.</p>
      <button type="button" className="pixel-button" onClick={() => { onClose(); onImport(candidate); }}>Заменить текущий сад</button>
    </div>}
  </dialog>;
}

export function GameView({ state, dispatch, onImport, onMenu, active = true }) {
  const [wide, setWide] = useState(() => (globalThis.innerWidth ?? 1440) >= 800);
  const [partyOpen, setPartyOpen] = useState(wide);
  const [shopOpen, setShopOpen] = useState(wide);
  const [treeOpen, setTreeOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [marketId, setMarketId] = useState(null);
  const [movingStall, setMovingStall] = useState(null);
  const [planting, setMode] = useState(() => state.trees.length ? null : beginnerTask(state)?.mode ?? null);
  const [selectedOrchard, selectOrchard] = useState(null);
  const [sprinklerId, setSprinklerId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [profileId, setProfile] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);
  const [industry, setIndustry] = useState(null);
  const [research, openResearch] = useState(null);
  const [team, openTeam] = useState(null);
  const [goalsOpen, openGoals] = useState(false);
  const [pinGoal, setPinGoal] = useState(() => {
    try { return localStorage.getItem('orchard-hide-goal') !== '1'; } catch { return true; }
  });
  const researchOpen = researchUnlocked(state);
  const [roadStart, setRoadStart] = useState(null);
  const [error, setError] = useState(null);
  const [reading, setReading] = useState(null);
  const [acknowledged, setAcknowledged] = useState([]);
  const upgradeButton = useRef(null);
  const restoreShop = useRef(false);
  const market = stallById(state, marketId);
  const variety = plantingVariety[planting];
  const plantingCount = { red:state.seeds, gold:state.goldSeeds, forest:state.forestSeeds, berry:state.trade.berrySeeds, wheat:state.industry.wheatSeeds }[variety];
  const mode = variety && !plantingCount ? null : planting;
  const selected = state.orchards.find(item => item.id === selectedOrchard);
  const orchard = selected ?? state.orchards[0];
  const assigning = mode === 'assign' && state.workers.find(worker => worker.id === assigningId);
  const plantingTree = Boolean(plantingVariety[mode]);
  const placingSprinkler = mode === 'sprinkler';
  const beginner = beginnerTask(state);
  const goals = gardenGoals(state);
  const showGoal = !beginner && !mode && pinGoal && goals.length > 0;
  const otherDialog = Boolean(market || industry || research || treeOpen || saveOpen || team || goalsOpen);
  const reveal = !otherDialog && state.perkReveals?.[0];
  const chapter = beginner && state.apples > 0 && state.apples < beginner.goal && !acknowledged.includes(STOCK_LESSON.id)
    ? STOCK_LESSON : beginner?.chapter;
  const teaching = beginner && (!mode || mode === beginner.mode);
  const mapTarget = teaching && beginner.point && (beginner.target !== 'plant' || mode === beginner.mode);
  const shopTarget = teaching && (['mystery', 'seed'].includes(beginner.target) ? beginner.target
    : beginner.target === 'plant' && mode !== beginner.mode ? beginner.mode : null);
  const partyTarget = teaching && ['lodge', 'recruit'].includes(beginner.target) ? beginner.target : null;
  const building = buildKind(mode);
  const profile = state.workers.find(worker => worker.id === profileId);
  const remaining = flowerActive(state) ? Math.ceil((state.boostUntil - state.time) / 1000) : 0;

  useEffect(() => {
    const query = window.matchMedia('(min-width: 800px)');
    function resize({ matches }) {
      setWide(matches);
      if (!matches) {
        setPartyOpen(false);
        setShopOpen(false);
      }
    }
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);

  useEffect(() => {
    if (!active || reading || reveal) return;
    if (state.guide) setReading(state.guide);
    else if (!otherDialog && teaching && chapter && !acknowledged.includes(chapter.id)) {
      setReading({ ...chapter, hidden: !state.unlocked });
    }
  }, [active, reading, reveal, state.guide, otherDialog, teaching, chapter, acknowledged, state.unlocked]);

  function dismissReading() {
    if (reading.id) setAcknowledged(current => [...current, reading.id]);
    else dispatch('dismissGuide', { serial: reading.serial });
    setReading(null);
  }

  function locateLesson() {
    setFocusPoint({ x: beginner.point.x, y: beginner.point.y });
    if (!wide) {
      setShopOpen(false);
      setPartyOpen(false);
    }
  }

  function handleMapPoint(point) {
    const target = orchardAt(state, point);
    if (!mode) {
      manageOrchard(target?.id);
      return;
    }
    if (assigning) {
      if (!target) { setError('Выбери один из открытых садов.'); return; }
      dispatch('assignOrchard', { id: assigning.id, point });
      changeMode(null);
      return;
    }
    if (building) {
      if (building === 'road' && !roadStart) { setRoadStart(point); setError(null); return; }
      const kind = researchKind(building);
      const action = kind ? 'buildResearch' : building === 'road' ? 'buildRoad' : building === 'pave' ? 'paveRoad' : 'buildIndustry';
      const fields = { kind: kind ?? building, point, from: roadStart, to: point };
      if (act(state, action, fields) === state) {
        setError(building === 'mine' ? 'Выбери свободное угольное месторождение в северных горах.'
          : building === 'road' || building === 'pave' ? 'Выбери свободный отрезок дороги. Проверь длину и запас монет.'
            : 'Здесь нельзя строить. Проверь свободное место и запас монет.');
        return;
      }
      dispatch(action, fields);
      changeMode(null);
      return;
    }
    if (mode === 'market' || landModes.includes(mode)) {
      const plots = constructionPlots(state);
      const moving = mode === 'moveFarm' || mode === 'moveGarden';
      const site = mode === 'market' ? marketSite(state, point, plots, movingStall)
        : mode === 'garden' || mode === 'moveGarden' ? landSite(state, point, plots, moving ? plotBounds(state, selected?.id) : null) : farmSite(state, point, plots, moving, selected?.id);
      if (!site) {
        setError(mode === 'market' ? 'Поставь лавку на свободной обочине дороги.' : 'Выбери свободную поляну вдали от дороги и реки.');
        return;
      }
      if (moving) {
        const previous = plotBounds(state, selected.id);
        if (site.x === previous.x && site.y === previous.y) { setError('Выбери новое место для участка.'); return; }
      }
      if (mode !== 'market' && state.trade.coins < (moving ? MOVE_FARM_PRICE : landPrice(state, mode === 'farm'))) {
        setError('Не хватает монет на этот участок.');
        return;
      }
      dispatch(mode === 'market' ? 'placeMarket' : mode === 'garden' ? 'placeGarden' : mode === 'moveGarden' ? 'moveGarden' : 'placeFarm',
        { point, stallId: movingStall, moving, orchardId: selected?.id });
      changeMode(null);
      return;
    }
    if (mode === 'clear') { setError('Выбери растение, которое хочешь убрать.'); return; }
    const valid = plantingTree ? canPlant(state, point, variety) : placingSprinkler ? canPlaceSprinkler(state, point, orchard.id, sprinklerId) : canMoveBasket(state, point, orchard.id);
    if (!valid) {
      const terrain = terrainKind(point);
      const obstacle = { river: 'В реке яблоня не вырастет.', road: 'На дороге сажать нельзя.' };
      setError((plantingTree && obstacle[terrain]) || 'Выбери свободное место внутри сада.');
      return;
    }
    if (placingSprinkler && sprinklerId === null && state.apples < sprinklerPrice(orchard)) {
      setError('На разбрызгиватель пока не хватает яблок.');
      return;
    }
    const action = plantingTree ? 'plant' : placingSprinkler ? 'placeSprinkler' : 'moveBasket';
    dispatch(action, { point, orchardId: orchard.id, sprinklerId, variety });
    if (plantingTree && beginner) restoreShop.current = false;
    changeMode(null);
  }

  function changeMode(next) {
    if (next !== 'build:road') setRoadStart(null);
    if (next !== 'market') setMovingStall(null);
    if (!wide) {
      if (next === 'assign') {
        restoreShop.current = false;
        setShopOpen(false);
      } else if (mode === 'assign') {
        setPartyOpen(true);
        setShopOpen(false);
      } else if (next && shopOpen) {
        restoreShop.current = true;
        setShopOpen(false);
      } else if (!next && restoreShop.current) {
        restoreShop.current = false;
        setPartyOpen(false);
        setShopOpen(true);
      }
    }
    setMode(next);
    setError(null);
  }

  function manageOrchard(id = null) {
    if (!state.unlocked) return;
    selectOrchard(id);
    changeMode(null);
    if (id) {
      setShopOpen(true);
      if (!wide) setPartyOpen(false);
    }
  }

  function startAssignment(worker) {
    if (assigning?.id === worker.id) { changeMode(null); return; }
    setAssigningId(worker.id);
    changeMode('assign');
    if (!wide) setPartyOpen(false);
  }

  useEffect(() => {
    const hotkey = event => {
      if (reading || !active || mode === 'assign' || treeOpen || saveOpen || marketId !== null || industry || research || team || goalsOpen || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.code !== 'KeyP') return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.matches('input, textarea, select, [role="combobox"], [role="option"]'))) return;
      if (!state.seeds && !state.goldSeeds) return;
      event.preventDefault();
      setMode(current => current === 'plant' || current === 'plantGold' ? null : state.seeds ? 'plant' : 'plantGold');
      setError(null);
    };
    window.addEventListener('keydown', hotkey);
    return () => window.removeEventListener('keydown', hotkey);
  }, [state.seeds, state.goldSeeds, treeOpen, saveOpen, marketId, industry, research, team, goalsOpen, mode, reading, active]);

  function inspect(worker, focusOnMap = false) {
    setProfile(worker.id);
    if (focusOnMap) setFocusPoint({ x: worker.x, y: worker.y });
    setPartyOpen(true);
    if (!wide) setShopOpen(false);
  }

  function locate(worker) {
    setFocusPoint({ x: worker.x, y: worker.y });
    if (!wide) setPartyOpen(false);
  }

  function shopAction(action, data) {
    dispatch(action, data);
    if (action === 'shopUpgrade' && data?.id === 'forestPlot' && state.apples >= SHOP.forestPlot.base) {
      setFocusPoint({ x:FOREST_CLEARING.x + FOREST_CLEARING.width / 2, y:FOREST_CLEARING.y + FOREST_CLEARING.height / 2 });
    }
    if (action === 'unlock' && potatoAvailable(state)) {
      setPartyOpen(true);
      if (!wide) setShopOpen(false);
    }
  }

  function basketAction(item) {
    if (!mode) {
      setError(null);
      dispatch('sendBasket', { orchardId: item.id });
      return;
    }
    if (mode !== 'basket') return;
    selectOrchard(item.id);
    changeMode(mode === 'basket' && orchard.id === item.id ? null : 'basket');
  }

  function sprinklerAction({ orchard: target, sprinklerId: id }) {
    selectOrchard(target.id);
    setSprinklerId(id);
    changeMode(mode === 'sprinkler' && sprinklerId === id && orchard.id === target.id ? null : 'sprinkler');
  }

  function newSprinkler() {
    setSprinklerId(null);
    changeMode(mode === 'sprinkler' && sprinklerId === null ? null : 'sprinkler');
  }

  function navigateGoal(action) {
    openGoals(false);
    changeMode(null);
    switch (action.kind) {
      case 'shop':
        selectOrchard(null);
        setShopOpen(true);
        if (!wide) setPartyOpen(false);
        break;
      case 'market': setMarketId(action.id); break;
      case 'build': setIndustry('build'); break;
      case 'station': setIndustry(action.id); break;
      case 'research': openResearch('overview'); break;
      case 'upgrades': setTreeOpen(true); break;
      case 'placement':
        if (action.mode === 'farm' && state.trade.coins < landPrice(state, true) || action.mode === 'market' && state.trade.coins < stallPrice(state)) {
          selectOrchard(null);
          setShopOpen(true);
          if (!wide) setPartyOpen(false);
        } else {
          setShopOpen(false);
          if (!wide) setPartyOpen(false);
          changeMode(action.mode);
        }
        break;
    }
  }

  function closeTree() {
    setTreeOpen(false);
    upgradeButton.current?.focus();
  }

  let tutorial = null;
  if (plantingTree) tutorial = isFieldCrop(variety) ? 'Выбери место для посевов на ферме' : variety === 'forest' ? 'Выбери место в Лесном саду' : 'Выбери место для яблони';
  else if (building) tutorial = building === 'road' ? roadStart ? 'Выбери конец дороги' : 'Выбери начало дороги' : building === 'pave' ? 'Выбери участок готовой дороги' : `Выбери место: ${BUILDINGS[building]?.label ?? RESEARCH_BUILDINGS[researchKind(building)]?.[0]}`;
  else if (mode === 'market') tutorial = 'Выбери свободную обочину для лавки';
  else if (landModes.includes(mode)) tutorial = mode === 'garden' ? 'Выбери поляну для яблоневого сада' : 'Выбери поляну для фермы';
  else if (mode === 'clear') tutorial = 'Нажми на растение, чтобы убрать его';
  else if (assigning) tutorial = `${assigning.name}: выбери сад на карте`;
  else if (placingSprinkler) tutorial = `Выбери место для разбрызгивателя — ${orchardName(orchard.id)}`;
  else if (mode === 'basket') tutorial = `Выбери место для корзины — ${orchardName(orchard.id)}`;
  return <TooltipProvider><main className="game-shell" onKeyDown={event => { if (event.key === 'Escape' && mode && !reading) changeMode(null); }}>
    <OrchardMap state={state} reveal={reveal} mode={mode} orchardId={selected?.id ?? (mode === 'basket' ? START_ORCHARD : null)} sprinklerId={sprinklerId}
      tutorialTarget={mapTarget && beginner.target} plantTarget={mapTarget && beginner.target === 'plant' ? beginner.point : null}
      movingStall={movingStall} roadStart={roadStart} selectedWorkerId={assigning?.id ?? profile?.id} focusPoint={focusPoint} onPoint={handleMapPoint}
      onTree={tree => {
        if (mode === 'clear') { dispatch('removeTree', { id: tree.id }); changeMode(null); return; }
        if (mode) { setError('Это место уже занято.'); return; }
        if (isFieldCrop(tree.variety) && !tree.fruit && tree.readyAt === null) {
          if (!state.trade.canWater) setError('Набери воду у отмеченного берега.');
          else { setError(null); dispatch('waterPlant', { id: tree.id }); }
          return;
        }
        dispatch('harvest', { id: tree.id });
      }}
      onFlower={flower => dispatch('flower', { id: flower.id })} onWorker={inspect}
      onBasket={basketAction} onSprinkler={sprinklerAction}
      onMarket={item => { if (!mode) setMarketId(item.stallId); }}
      onIndustry={site => {
        if (mode) return;
        if (String(site.id).startsWith('research:')) { if (researchOpen) openResearch(site.id); }
        else setIndustry(site.id === 'house' ? 'overview' : site.id);
      }}
      onWater={({ orchardId }) => { dispatch('refillCan', { orchardId }); setError(null); }}
      onWild={item => dispatch('pickWild', { id: item.id })}/>
    <div className="hud">
      <button type="button" className="pixel-button square game-menu-toggle" aria-label="Главное меню" onClick={onMenu}><Glyph name="menu"/></button>
      <div className="resources pixel-window" aria-label="Ресурсы"><Hardware/>
        <div className="resource" data-tutorial-highlight={(reading?.id === STOCK_LESSON.id || (teaching && beginner.target === 'mystery')) || undefined} aria-label={`Яблоки: ${state.apples}`}>{icon('apple', number.format(state.apples))}</div>
        {state.trade.permit && <Tooltip label="Монеты" tap><div className="resource trade-resource receipt-anchor" tabIndex={0}>
          {icon('coin', number.format(state.trade.coins))}
          <ResourceReceipts receipts={state.resourceReceipts?.filter(receipt => receipt.anchor === 'coins')} className="hud-receipts"/>
        </div></Tooltip>}
        {state.trade.berryKnown && <Tooltip label="Ягоды в доме" tap><div className="resource trade-berries" tabIndex={0}>{icon('berry', number.format(state.trade.berries))}</div></Tooltip>}
        <div className="resource production" aria-label={`Яблок в секунду: ${decimal.format(productionRate(state))}`}>{icon('track', `${decimal.format(productionRate(state))}/с`)}</div>
        <Tooltip label="До следующего уровня" detail={`${state.xpProgress} из ${nextLevelXp(state.level)} опыта`} tap>
          <div className="resource level-resource receipt-anchor" tabIndex={0} aria-label={`Уровень ${state.level}. ${state.xp} ОП.`}>
          {icon('xp', `${number.format(state.xp)} ОП`)}<span className="hud-level">Ур. {number.format(state.level)}</span>
          <ResourceReceipts receipts={state.resourceReceipts?.filter(receipt => receipt.anchor === 'xp')} className="hud-receipts"/>
          </div>
        </Tooltip>
      </div>
      <div className="hud-actions">
        {state.trade.permit && <button type="button" className="pixel-button industry-toggle" aria-label="Хозяйство" onClick={() => setIndustry('overview')}>{icon('table', 'Хозяйство')}</button>}
        {researchOpen && <button type="button" className="pixel-button research-toggle" aria-label="Исследования" onClick={() => openResearch('overview')}>{icon('flask', 'Исследования')}</button>}
        <button type="button" className="pixel-button square save-button" aria-label="Перенос сохранения" onClick={() => setSaveOpen(true)}><Glyph name="save"/></button>
        {state.unlocked && <button type="button" className="pixel-button square guide-button" aria-label="Подсказка Картошки" onClick={() => dispatch('help')}>{icon('help')}</button>}
        <button type="button" className="pixel-button upgrade-toggle" aria-label="Дерево улучшений" aria-pressed={treeOpen} ref={upgradeButton}
          onClick={() => setTreeOpen(!treeOpen)}>{icon('tree', 'Дерево улучшений')}</button>
      </div>
    </div>
    {state.unlocked && <Panel name="Ёжики" symbol="hedge" side="party" open={partyOpen} guided={Boolean(partyTarget && !partyOpen)} profile={partyOpen ? profile : null} onProfileClose={() => setProfile(null)}
      onRename={name => dispatch('renameWorker', { id: profile.id, name })}
      toggle={() => { if (!wide && !partyOpen) setShopOpen(false); setPartyOpen(!partyOpen); }}>
      {profile ? <HedgeProfile state={state} worker={profile} dispatch={dispatch} onLocate={() => locate(profile)} onAssign={() => startAssignment(profile)}/>
        : <WorkerList state={state} dispatch={dispatch} onInspect={worker => inspect(worker, true)} onAssign={startAssignment} assigningId={assigning?.id} orchardId={orchard.id} tutorialTarget={partyTarget} onTeam={openTeam}/>}
    </Panel>}
    <Panel name="Лавка" symbol="seed" side="shop" open={shopOpen} guided={Boolean(shopTarget && !shopOpen)} contentKey={selected?.id ?? 'general'}
      toggle={() => { if (!wide && !shopOpen) setPartyOpen(false); setShopOpen(!shopOpen); }}>
      <Shop state={state} dispatch={shopAction} mode={mode} setMode={changeMode} orchard={selected} tutorialTarget={shopTarget}
        clearOrchard={() => manageOrchard()} sprinklerId={sprinklerId} onSprinkler={sprinklerAction} onNewSprinkler={newSprinkler}
        onIndustry={() => setIndustry('overview')} onOpenMarket={stall => { changeMode(null); setMarketId(stall.id); }} onFocus={point => { setFocusPoint({ ...point }); if (!wide) setShopOpen(false); }}/>
    </Panel>
    {remaining > 0 && <div className="boost pixel-window" role="status">{icon('flower', `Бодрость ${remaining} с`)}</div>}
    {state.workers.length > 0 && <div className="map-goals">
      {showGoal ? <GardenGoalCue goal={goals[0]} count={goals.length} onOpen={() => openGoals(true)}/>
        : <button type="button" className="pixel-button" aria-label="Цели сада" onClick={() => openGoals(true)}>{icon('pin','Цели')}</button>}
    </div>}
    <div className={`status-wrap${teaching && (shopOpen || partyOpen && state.unlocked) ? ' with-sheet' : ''}`} aria-live="polite">
      {teaching && <BeginnerCue task={beginner} apples={state.apples} hidden={!state.unlocked}
        hint={beginner.mode && !mode ? 'Открой «Лавку» и выбери саженец.' : beginner.hint}
        onLocate={mapTarget ? locateLesson : null}/>}
      {(tutorial || error) && (!teaching || error || mode) && <div className="status-chip pixel-window">{icon(plantingTree ? 'seed' : placingSprinkler ? 'water' : mode === 'basket' ? 'basket' : mode === 'clear' ? 'axe' : 'hand', error || (!teaching && tutorial))}
        {mode && <button className="pixel-button mini square" type="button" aria-label="Отменить действие" onClick={() => changeMode(null)}>{icon('close')}</button>}
      </div>}
      {state.notice && !error && !teaching && <div className="status-chip notice-chip pixel-window">{icon(state.notice.symbol, state.notice.text)}</div>}
    </div>
    <nav className="mobile-dock" aria-label="Меню игры">
      {state.unlocked && <button type="button" className="pixel-button" aria-controls="panel-party" data-tutorial-highlight={Boolean(partyTarget && !partyOpen) || undefined} aria-expanded={partyOpen} onClick={() => { setPartyOpen(!partyOpen); setShopOpen(false); }}>{icon('hedge', 'Ёжики')}</button>}
      <button type="button" className="pixel-button" aria-controls="panel-shop" data-tutorial-highlight={Boolean(shopTarget && !shopOpen) || undefined} aria-expanded={shopOpen} onClick={() => { setShopOpen(!shopOpen); setPartyOpen(false); }}>{icon('seed', 'Лавка')}</button>
      <button type="button" className="pixel-button" onClick={() => setTreeOpen(true)}>{icon('tree', 'Улучшения')}</button>
      {state.trade.permit && <button type="button" className="pixel-button" onClick={() => setIndustry('overview')}>{icon('table', 'Хозяйство')}</button>}
      {researchOpen && <button type="button" className="pixel-button mobile-research" aria-label="Исследования" onClick={() => openResearch('overview')}>{icon('flask', 'Наука')}</button>}
    </nav>
    {reveal && <PerkReveal state={state} event={reveal} dispatch={dispatch}/>}
    {researchOpen && research && <ResearchScreen state={state} dispatch={dispatch} initialSite={research === 'overview' ? null : research}
      onClose={() => openResearch(null)} onFocus={site => { openResearch(null); setFocusPoint({x:site.x,y:site.y}); }}
      onBuild={kind => { openResearch(null); changeMode(`build:r-${kind}`); }}/>}
    {industry && <IndustryScreen state={state} dispatch={dispatch} initialSite={['overview','build'].includes(industry) ? null : industry} initialTab={industry === 'build' ? 'build' : undefined}
      onClose={() => setIndustry(null)} onBuild={kind => {
        changeMode(`build:${kind}`);
        if (kind === 'mine') setFocusPoint({ ...COAL_SITES[1] });
        setIndustry(null);
      }} onFocus={point => { setFocusPoint({ x: point.x, y: point.y }); setIndustry(null); }}/>}
    {goalsOpen && <GardenGoalsScreen goals={goals} pinned={pinGoal} onPin={() => {
      try { localStorage.setItem('orchard-hide-goal', pinGoal ? '1' : '0'); } catch { /* Optional preference. */ }
      setPinGoal(!pinGoal);
    }} onClose={() => openGoals(false)} onNavigate={navigateGoal}/>}
    {team && <TeamScreen state={state} dispatch={dispatch} initialTab={team} onClose={() => openTeam(null)}/>}
    {treeOpen && <UpgradeTree state={state} dispatch={dispatch} onClose={closeTree}/>}
    {saveOpen && <SaveTransfer state={state} onClose={() => setSaveOpen(false)} onImport={onImport}/>}
    {market && <MarketScreen key={market.id} state={state} stall={market} dispatch={dispatch} onClose={() => setMarketId(null)}
      onFindBerries={() => {
        const patch = state.trade.wild.find(item => item.fruit) ?? state.trade.wild[0];
        if (patch) { setMarketId(null); setFocusPoint({ x: patch.x, y: patch.y }); }
      }}
      onMove={() => { setMovingStall(market.id); setMarketId(null); changeMode('market'); }}/>}
    {active && reading && <Guide key={reading.id ?? reading.serial} message={reading} onClose={dismissReading}/>}
  </main></TooltipProvider>;
}

function App() {
  const [screen, setScreen] = useState('launch');
  const [state, dispatch, replace] = useGame(screen);
  const audio = useGameAudio(state);
  const [revision, setRevision] = useState(0);
  const gameLayer = useRef(null);
  const playing = screen === 'game';
  useEffect(() => {
    if (playing) gameLayer.current?.querySelector('.map-viewport')?.focus({ preventScroll: true });
  }, [playing]);

  return <>
    {screen !== 'launch' && <div ref={gameLayer} className="game-layer" inert={!playing}>
      <GameView key={revision} active={playing} state={state} dispatch={dispatch} onMenu={() => setScreen('menu')} onImport={imported => {
        replace(imported);
        setRevision(current => current + 1);
      }}/>
    </div>}
    {!playing && <MainMenu state={state} audio={audio} onPlay={() => setScreen('game')} onExport={() => downloadSave(state)}
      onReset={() => { replace(newGame()); setRevision(current => current + 1); setScreen('launch'); }}/>}
  </>;
}

if (typeof document !== 'undefined') createRoot(document.getElementById('root')).render(<App/>);
