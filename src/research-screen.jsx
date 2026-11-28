import { PerkIcon } from './perk-art.jsx';
import { useEffect, useRef, useState } from 'react';
import { Glyph, HedgeSprite } from './art.jsx';
import { CustomerPortrait } from './trade-art.jsx';
import { GameSelect } from './game-select.jsx';
import { Tooltip } from './tooltip.jsx';
import { SCIENTIST_GOODS, SCIENTIST_PRICE, researchUnlocked, scientistDemand, scientistInTransit, scientistReady } from './commission.js';
import { trainingCost } from './development.js';
import { GOODS, stockCount, housingCapacity } from './industry.js';
import { STAT_INFO } from './orchard.js';
import { chargeCapacity, FUELS, hasResearch, powerNetworks, PROJECTS, RESEARCH_BRANCHES, RESEARCH_BUILDINGS, researchBlocked, researchSite, researchSites, stationLabel } from './research.js';
import { perkDescription, PERKS, workerPerks } from './perks.js';
import { availablePerkJobs } from './job-advice.jsx';
import { workplaces } from './game.js';
import './research.css';

const format = new Intl.NumberFormat('ru').format;
const branchIcons = { agricultural:'seed', electrical:'speed', industry:'table', workforce:'hedge', comfort:'flower', leisure:'coin', shared:'tree' };
const options = entries => entries.map(([value,label]) => ({ value,label }));

export function ScientistPanel({ state, stall, dispatch }) {
  const commission = state.scientist;
  if (!commission || commission.stage === 'complete') return null;
  const offered = commission.stage === 'offered';
  const ready = scientistReady(state);
  return <section className="pixel-window research-card scientist-card" aria-label="Заказ учёного">
    <header><div className="scientist-portrait"><CustomerPortrait look="scientist"/></div><div>
      <h3>{offered || ready ? 'Учёный' : 'Заказ учёного'}</h3>
      <p>{offered ? 'Мне нужны образцы со всего хозяйства. Когда соберёшь их, возвращайся сюда. За 25 000 монет помогу открыть лаборатории.'
        : ready ? 'Все образцы на месте. Пора открывать исследования.'
          : 'Снабженцы и тракторы привозят образцы в эту лавку. Их принимают, когда прилавок свободен.'}</p>
    </div></header>
    <details open={!offered}><summary>Список образцов</summary>
      <ul className="scientist-goods">{Object.entries(SCIENTIST_GOODS).map(([key, target]) => <li key={key}>
        <Glyph name={GOODS[key].icon}/><span>{GOODS[key].label}</span>
        <span>{format(commission.bank[key] ?? 0)} / {format(target)}{scientistInTransit(state,key) > 0 && <small>+{format(scientistInTransit(state,key))} в пути</small>}</span>
        <small className="scientist-stock">На складе {format(stockCount(state,key))}</small>
        {!offered && scientistDemand(state,key) > 0 && stockCount(state,key) > 0 && <button type="button" className="pixel-button mini" onClick={() => dispatch('supplyScientist',{key})}
          aria-label={`Сдать со склада: ${GOODS[key].label}`}>Сдать {Math.min(250,scientistDemand(state,key),stockCount(state,key))}</button>}
      </li>)}</ul>
    </details>
    {offered && <button className="pixel-button" type="button" onClick={() => dispatch('acceptScientist',{stallId:stall.id})}>Принять заказ</button>}
    {ready && <button className="pixel-button" type="button" disabled={state.trade.coins < SCIENTIST_PRICE}
      onClick={() => dispatch('completeScientist')}>Завершить · {format(SCIENTIST_PRICE)} монет</button>}
  </section>;
}

const center = 326;
const graphPoints = Object.fromEntries(Object.entries(RESEARCH_BRANCHES).flatMap(([branch], angle) => {
  const groups = Object.entries(PROJECTS).filter(([,data]) => data[1] === branch);
  return groups.map(([id,data]) => {
    const ring = groups.filter(([,project]) => project[2] === data[2]);
    const slot = ring.findIndex(([key]) => id === key) - (ring.length - 1) / 2;
    const radians = angle * Math.PI * 2 / 7 - Math.PI / 2 + slot * .27;
    return [id, { x:center + Math.cos(radians) * (53 + data[2] * 48), y:center + Math.sin(radians) * (53 + data[2] * 48) }];
  });
}));
function ResearchGraph({ state, selected, select }) {
  return <div className="research-graph" aria-label="Карта исследований">
    <svg viewBox="0 0 652 652" aria-hidden="true">
      {[101,149,197,245,293].map(r => <circle key={r} cx={center} cy={center} r={r}/>)}
      {Object.entries(PROJECTS).flatMap(([id,data]) => (data[3].length ? data[3] : [null]).map(from => {
        const point = from ? graphPoints[from] : {x:center,y:center};
        const target = graphPoints[id];
        return <line key={id + from} x1={point.x} y1={point.y} x2={target.x} y2={target.y} className={hasResearch(state,id) ? 'known' : ''}/>;
      }))}
    </svg>
    <span className="research-root"><Glyph name="table"/></span>
    {Object.entries(PROJECTS).map(([id,data]) => <Tooltip key={id} label={data[0]} detail={data[7]}>
      <button type="button" className="research-node" data-branch={data[1]} data-known={hasResearch(state,id)} aria-label={data[0]}
        aria-pressed={selected === id} style={{left:graphPoints[id].x / 6.52 + '%', top:graphPoints[id].y / 6.52 + '%'}}
        onClick={() => select(id)}><Glyph name={branchIcons[data[1]]}/></button>
    </Tooltip>)}
  </div>;
}
function ProjectDetails({ state, selected, dispatch }) {
  const [name,branch,,requires,rp,coins,materials,description] = PROJECTS[selected];
  return <section className="pixel-window research-card">
    <h3><Glyph name={branchIcons[branch]}/> {name}</h3>
    <p>{description}</p>
    {Object.entries(RESEARCH_BUILDINGS).filter(([,build]) => build[3] === selected).map(([key,[label,,price]]) =>
      <p key={key}>{label} · {format(price)} монет за постройку</p>)}
    {requires.length > 0 && <ul className="research-tags" aria-label="Предыдущие проекты">
      {requires.map(key => <li key={key} data-enough={hasResearch(state,key)}>{PROJECTS[key][0]}</li>)}
    </ul>}
    {hasResearch(state,selected) ? <strong>Изучено</strong> : <>
      <ul className="research-tags" aria-label="Стоимость">
        <li data-enough={(state.research?.rp ?? 0) >= rp}>{format(rp)} ОИ</li>
        <li data-enough={state.trade.coins >= coins}><Glyph name="coin"/>{format(coins)}</li>
        {Object.entries(materials).map(([key, qty]) => <li key={key} data-enough={stockCount(state,key) >= qty}>
          <Glyph name={GOODS[key].icon}/>{GOODS[key].label} {format(stockCount(state,key))} / {format(qty)}
        </li>)}
      </ul>
      <button type="button" disabled={researchBlocked(state,selected)} className="pixel-button" onClick={() => dispatch('buyResearch',{key:selected})}>Изучить</button>
    </>}
  </section>;
}

function ChallengeDesk({ state, dispatch, stationId }) {
  const [difficulty, setDifficulty] = useState(1);
  const [type, setType] = useState('math');
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const challenge = state.research?.challenge;
  const [hidden, hide] = useState(false);
  useEffect(() => {
    hide(false);
    if (!challenge?.memory) return;
    const timer = setTimeout(() => hide(true),1300 + (3-challenge.difficulty) * 600);
    return () => clearTimeout(timer);
  },[challenge?.serial]);
  function submit(answer) {
    if (String(answer).trim() !== String(challenge.answer)) { setFeedback('Попробуй ещё раз.'); return; }
    dispatch('solveChallenge',{guess:answer});
    setGuess('');
    setFeedback(`+${[0,4,7,10][challenge.difficulty] * (challenge.leisure ? 3 : 1)} ${challenge.leisure ? 'монет' : 'ОИ'}`);
  }
  const variants = [['math','Задача'],['logic','Последовательность'],['quiz','Вопрос']];
  if (stationId && hasResearch(state,'games')) variants.push(['memory','Память']);
  return <section className="pixel-window research-card challenge-desk">
    <h3>{stationId ? 'Игровой стол' : 'Ручное исследование'}</h3>
    {challenge ? <>
      <p className="challenge-question">{challenge.memory && hidden ? "Введи запомненные цифры" : challenge.text}</p>
      {challenge.values ? <div className="research-actions">{challenge.values.map(value => <button type="button" key={value} className="pixel-button" onClick={() => submit(value)}>{value}</button>)}</div>
        : <form className="research-actions" onSubmit={event => { event.preventDefault(); submit(guess); }}>
          <input disabled={challenge.memory && !hidden} aria-label="Ответ" value={guess} inputMode="numeric" onChange={event => setGuess(event.target.value)}/>
          <button className="pixel-button" type="submit" disabled={challenge.memory && !hidden}>Ответить</button>
        </form>}
      <button className="pixel-button mini" type="button" onClick={() => { dispatch('abandonChallenge'); setFeedback(''); }}>Оставить задачу</button>
    </> : <>
      <p>{stationId ? 'Реши задачу и получи монеты.' : 'Решай задачи, чтобы получать очки исследований. Для этого питание не требуется.'}</p>
      <GameSelect label="Задание" value={type} options={options(variants)} onChange={setType}/>
      <GameSelect label="Сложность" value={difficulty} options={options([[1,'Лёгкая · 4 ОИ'],[2,'Средняя · 7 ОИ'],[3,'Высокая · 10 ОИ']].map(([value,label]) => [value,stationId ? label.replace(/\d+ ОИ/, `${[0,12,21,30][value]} монет`) : label]))} onChange={setDifficulty}/>
      <button className="pixel-button" type="button" onClick={() => { setFeedback(''); dispatch('startChallenge',{type,difficulty,stationId}); }}>Начать</button>
    </>}
    {feedback && <p role="status">{feedback}</p>}
  </section>;
}

export function LodgePanel({ state, dispatch, guided }) {
  if (!researchUnlocked(state) || !state.lodge) return null;
  return <details className="crew-manager"><summary data-tutorial-highlight={guided || undefined}>Домик отдыха · {state.lodge.names.length + state.lodge.waiting.length}</summary>
    {state.lodge.waiting.map(({worker,until}) => <div className="lodge-row" key={worker.id}>
      <span>{worker.name} · {Math.max(0,Math.ceil((until - Date.now())/60000))} мин</span>
      <button type="button" className="pixel-button mini" disabled={state.workers.length >= housingCapacity(state) || until <= Date.now()}
        onClick={() => dispatch('retrieveWorker',{id:worker.id})}>Вернуть</button>
    </div>)}
    {state.lodge.names.length > 0 && <p>На отдыхе · {state.lodge.names.join(', ')}</p>}
  </details>;
}

export function ResearchStationArt({ kind, active }) {
  const base = RESEARCH_BUILDINGS[kind];
  if (!base) return null;
  return <div aria-hidden="true" className="research-building-art" data-kind={kind} data-active={Boolean(active)}><i/><i/><Glyph name={base[1]}/></div>;
}

function StationActions({ state, site, dispatch }) {
  const [workerId, setWorker] = useState(null);
  const [partner, setPartner] = useState(null);
  const [stat, setStat] = useState('speed');
  const worker = state.workers.find(worker => worker.id === workerId);
  const training = state.workers.find(worker => worker.train?.siteId === site.id);
  const pairing = state.pairingJobs?.find(job => job.siteId === site.id);
  const busy = candidate => candidate.train || candidate.pairing || candidate.retirePending || state.jobs.some(job => job.workers.includes(candidate.id))
    || state.industry.workshops.some(site => site.batch?.workerId === candidate.id) || state.industry.tractors.some(({trip}) => trip?.driverId === candidate.id) || candidate.industryCargo || candidate.fuelCan || candidate.powerCargo;
  const workers = state.workers.map(candidate => ({value:candidate.id,label:candidate.name,disabled:site.kind !== 'wardrobe' && Boolean(busy(candidate))}));
  const send = (action, fields = {}) => dispatch(action,{id:site.id, ...fields});
  const quote = worker && trainingCost(state,worker,stat);
  if (site.kind === 'puzzle') return <ChallengeDesk state={state} dispatch={dispatch} stationId={site.id}/>;
  if (site.kind === 'generator') return <>
    <GameSelect label="Топливо" value={site.fuel} options={options(Object.keys(FUELS).filter(key => key !== 'biofuel' || hasResearch(state,key)).map(key => [key,GOODS[key].label]))}
      onChange={key => send('selectFuel',{key})}/>
    <p>{site.broken ? 'Требуется ремонт' : site.output ? `Выдаёт ${site.output.toFixed(1)} ед.` : site.stock[site.fuel] || site.residual?.[site.fuel] ? 'Ожидает нагрузки' : 'Нет топлива'} · В буфере {site.stock[site.fuel] ?? 0}</p>
    <div className="research-actions"><button className="pixel-button" type="button" disabled={!stockCount(state,site.fuel) || (site.stock[site.fuel] ?? 0) >= (hasResearch(state,'controls') ? 32 : 24)}
      onClick={() => send('carryFuel')}>Принести топливо</button>
      {site.broken && <button className="pixel-button" type="button" disabled={stockCount(state,'coal') < (hasResearch(state,'controls') ? 4 : 8)}
        onClick={() => send('repairGenerator')}>Ремонт · {hasResearch(state,'controls') ? 4 : 8} угля</button>}
    </div>
  </>;
  if (site.kind === 'chance') {
    const outcome = state.research?.chance;
    return <><p>Шанс выигрыша 46%. При выигрыше получишь свою ставку и столько же сверху.</p><div className="research-actions">{[10,25,50].map(stake => <button className="pixel-button" type="button" key={stake}
      disabled={state.trade.coins < stake} onClick={() => send('playChance',{stake})}><Glyph name="coin"/>{stake}</button>)}</div>
      {outcome?.id === site.id && <p role="status">{outcome.won ? 'Выигрыш +' : 'Проигрыш −'}{outcome.stake}</p>}</>;
  }
  if (!['trainer','mating','wardrobe'].includes(site.kind)) return null;
  if (training && site.kind === 'trainer') return <p>{training.name} · {STAT_INFO[training.train.stat].label} · {training.train.until ? `${Math.max(0,Math.ceil((training.train.until - state.time)/1000))} сек.` : 'идёт на площадку'}</p>;
  if (pairing && site.kind === 'mating') return <p>Домик занят. {pairing.until ? `Осталось ${Math.max(0,Math.ceil((pairing.until - state.time)/1000))} сек.` : 'Родители в пути.'}</p>;
  return <>
    <GameSelect label={site.kind === 'mating' ? 'Первый родитель' : 'Ёжик'} value={workerId} options={workers} onChange={setWorker}/>
    {site.kind === 'trainer' && <>
      <GameSelect label="Курс" value={stat} options={options(Object.entries(STAT_INFO).map(([key,data]) => [key,`${data.label}${worker ? ` · ${worker.stats[key]}` : ''}`]))} onChange={setStat}/>
      {quote && <p>{quote.available ? `${Math.ceil(quote.duration/1000)} сек.${quote.materials ? ` · ${quote.materials} пайков` : ''}` : 'Нужны сложные курсы или достигнут максимум.'}</p>}
      <button type="button" className="pixel-button" disabled={!quote?.available || busy(worker) || stockCount(state,'provisions') < quote.materials}
        onClick={() => dispatch('startTraining',{id:workerId,siteId:site.id,stat})}>Начать курс</button>
    </>}
    {site.kind === 'mating' && <>
      <GameSelect label="Второй родитель" value={partner} options={workers.filter(item => item.value !== workerId)} onChange={setPartner}/>
      <button type="button" className="pixel-button" disabled={!worker || !partner || partner === workerId || busy(worker) || workers.find(item => item.value === partner)?.disabled
        || state.workers.length + (state.pairingJobs?.length ?? 0) >= housingCapacity(state) || stockCount(state,'provisions') < 8}
        onClick={() => dispatch('startPairing',{siteId:site.id,first:workerId,second:partner})}>Подготовить домик · 8 пайков</button>
    </>}
    {site.kind === 'wardrobe' && (worker?.wardrobe ? <div className="research-actions wardrobe-choices">
      {worker.wardrobe.map((look,index) => <button key={index} className="pixel-button" type="button" aria-label={`Выбрать образ ${index+1}`}
        onClick={() => dispatch('applyWardrobe',{id:workerId,index})}><HedgeSprite hedge={{...worker,...look}}/></button>)}
      <button className="pixel-button" type="button" onClick={() => dispatch('applyWardrobe',{id:workerId,index:-1})}>Оставить прежний образ</button>
    </div> : <button className="pixel-button" type="button" disabled={!worker || state.trade.coins < 40}
      onClick={() => dispatch('previewWardrobe',{id:workerId,siteId:site.id})}>Три новых образа · 40 монет</button>)}
  </>;
}

export function PerkReveal({ state, event, dispatch }) {
  const worker = state.workers.find(item => item.id === event.workerId);
  const perk = PERKS[event.perk];
  if (!perk) return null;
  return <section className="perk-reveal" role="dialog" aria-modal="true" aria-label="Уникальный перк">
    <div className="perk-confetti" aria-hidden="true">{Array.from({length:18},(_,index) => <i key={index} style={{'--ray':index * 20 + 'deg','--wait':index % 5 * 68 + 'ms'}}/>)}</div>
    <div className="perk-award-hedge">{worker && <HedgeSprite hedge={worker}/>}</div>
    <h2>{event.name ?? worker?.name} ЗАРАБОТАЛ ПЕРК «{perk.name.toUpperCase()}»!</h2>
    <PerkIcon perk={event.perk} className="perk-award-icon"/>
    <p>{perkDescription(event.perk,availablePerkJobs(state,workplaces(state)))}</p>
    {worker?.pendingPerks?.includes(event.perk) && <div className="research-actions">
      {workerPerks(worker).map(key => <button key={key} type="button" className="pixel-button"
        onClick={() => dispatch('replacePerk',{id:worker.id,earn:event.perk,replace:key})}><PerkIcon perk={key}/> Заменить «{PERKS[key].name}»</button>)}
    </div>}
    <button type="button" className="pixel-button" onClick={() => dispatch('dismissPerkReveal',{id:event.id})}>Продолжить</button>
  </section>;
}

const buildingDescriptions = {
  lab:'Ручные задачи доступны сразу. Ёжику-исследователю нужно питание.',
  generator:'Мощность 12. Работает на угле, топливе или биотопливе.',
  pole:'Соединяет сеть и подключает постройки рядом.',
  battery:'Запасает до 130 единиц энергии.',
  wheel:'Мощность 7. Ставится на берегу реки.',
  turbine:'Мощность 9. Для установки нужно открытое место за пределами леса.',
  pump:'Поливает ягоды и пшеницу в радиусе 155 шагов.',
  trainer:'Учит ёжиков по одному показателю за курс.',
  mating:'В домике появляется потомство. Нужно свободное место в жилье.',
  wardrobe:'Предлагает три новых образа.',
  puzzle:'За решённые задачи выдаёт монеты.',
  chance:'Ставки в игровых монетах. Шанс выигрыша 46%.',
  bench:'Украшение для сада.', gardenPath:'Декоративное покрытие.', gardenFence:'Короткая декоративная секция ограды.', flowers:'Украшение для сада.',
  sign:'Привлекает покупателей в ближайшие лавки.',
  shelter:'Ускоряет работу ёжиков поблизости.',
  statue:'Украшение для сада.', lounge:'Ускоряет отдых поблизости.',
  lamp:'Привлекает покупателей, когда подключён к сети.',
  square:'Привлекает посетителей в ближайшие лавки.',
  playset:'Украшение для зоны отдыха.',
};

const buildingCategory = key => ['generator','pole','battery','wheel','turbine','pump'].includes(key) ? 'grid'
  : ['lab','trainer','mating','wardrobe'].includes(key) ? 'facilities' : 'decoration';

export function ResearchScreen({ state, dispatch, initialSite, onClose, onBuild, onFocus }) {
  const dialog = useRef(null);
  const [tab, setTab] = useState(initialSite ? 'stations' : 'tree');
  const [selected, setSelected] = useState('electricity');
  const [siteId, setSite] = useState(initialSite);
  const [buildGroup, setBuildGroup] = useState('all');
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => { if (element.open) element.close(); };
  },[]);
  const sites = researchSites(state);
  const station = researchSite(state,siteId);
  const electricity = hasResearch(state,'electricity');
  const net = station && powerNetworks(state).find(net => net.nodes.includes(station) || net.consumers.includes(station));
  return <dialog ref={dialog} className="game-screen research-screen" aria-labelledby="research-title" onCancel={event => {event.preventDefault(); onClose();}}>
    <header className="screen-header research-header">
      <h2 id="research-title"><span className="research-emblem"><Glyph name="flask"/></span> Исследования</h2>
      <p><span><Glyph name="flask"/> {format(state.research?.rp ?? 0)} ОИ</span><span><Glyph name="coin"/> {format(state.trade.coins)}</span></p>
      <button type="button" className="pixel-button" onClick={onClose}><Glyph name="back"/> Карта</button>
    </header>
    <div className="research-body">
      <nav className="research-tabs" aria-label="Разделы исследований">
        {[['tree','Проекты','tree'],['manual','Ручная работа','flask'],['build','Строительство','work'],
          ...(sites.length ? [['stations','Постройки','house']] : [])].map(([key,label,icon]) =>
          <button className="pixel-button" type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}><Glyph name={icon}/>{label}</button>)}
      </nav>
      {tab === 'tree' && <div className="research-layout">
        <ResearchGraph state={state} selected={selected} select={setSelected}/>
        <div><GameSelect label="Проект" value={selected} options={options(Object.entries(PROJECTS).map(([id,data]) => [id,`${RESEARCH_BRANCHES[data[1]]} · ${data[0]}`]))} onChange={setSelected}/>
          <ProjectDetails state={state} selected={selected} dispatch={dispatch}/></div>
      </div>}
      {tab === 'manual' && <ChallengeDesk state={state} dispatch={dispatch}/>}
      {tab === 'build' && <>
        <GameSelect label="Категория построек" value={buildGroup} onChange={setBuildGroup}
          options={options([['all','Все'],['grid','Питание и полив'],['facilities','Исследования и обучение'],['decoration','Декор и досуг']])}/>
        <div className="industry-grid">{Object.entries(RESEARCH_BUILDINGS).filter(([key,data]) => (!data[3] || hasResearch(state,data[3]))
          && (buildGroup === 'all' || buildingCategory(key) === buildGroup)).map(([key,[name,,price]]) =>
          <section key={key} className="pixel-window research-card research-build-card"><ResearchStationArt kind={key}/><h3>{name}</h3>
            <p>{buildingDescriptions[key]}</p>
            {key === 'pump' && !electricity && <p>После монтажа подключи насос к сети.</p>}
            <button type="button" className="pixel-button" disabled={state.trade.coins < price} onClick={() => onBuild(key)}>Поставить · {format(price)} монет</button>
          </section>)}</div>
      </>}
      {tab === 'stations' && <div className="research-layout">
        <section className="pixel-window research-card">
          <h3>Постройки</h3>
          {sites.length ? <div className="research-station-list">{sites.map(site => <button key={site.id} type="button" className="pixel-button" aria-pressed={siteId === site.id}
            onClick={() => setSite(site.id)}><Glyph name={RESEARCH_BUILDINGS[site.kind][1]}/>{stationLabel(site)}</button>)}</div> : <p>Построек пока нет.</p>}
        </section>
        {station && <section className="pixel-window research-card" key={station.id}>
          <ResearchStationArt kind={station.kind} active={station.power > 0}/>
          <h3>{stationLabel(station)}</h3>
          {['lab','pump','lamp'].includes(station.kind) && <p>{net ? `Питание · ${Math.round((station.power ?? 0) * 100)}%` : 'Вне зоны сети'}</p>}
          {chargeCapacity(station) > 0 && <p>Заряд · {Math.floor(station.charge ?? 0)} / {chargeCapacity(station)}</p>}
          {hasResearch(state,'metering') && net && <p>Сеть · {net.nodes.length} узл. · Запрос {net.nodes[0].grid?.demand ?? 0} ед. · Доступно {Math.round(net.nodes[0].grid?.supply ?? 0)} ед.</p>}
          {station.kind === 'lab' && <p>Назначь исследователя в профиле ёжика и подключи лабораторию к сети.</p>}
          <div className="research-actions"><button type="button" className="pixel-button mini" onClick={() => onFocus(station)}>Показать на карте</button></div>
          <StationActions state={state} site={station} dispatch={dispatch}/>
        </section>}
      </div>}
    </div>
  </dialog>;
}
