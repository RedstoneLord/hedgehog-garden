import { researchUnlocked } from './commission.js';
import { researchSite, stationLabel } from './research.js';
import { ResearchStationArt } from './research-screen.jsx';
import { perkDescription, PERK_TIERS, workerPerks } from './perks.js';
import { availablePerkJobs, JobAdvice } from './job-advice.jsx';
import { GameSelect } from './game-select.jsx';
import { industrySite } from './industry.js';
import { IndustryArt } from './industry-art.jsx';
import { useLayoutEffect, useRef, useState } from 'react';
import { AppleTree, FlowerArt, Glyph, HedgeSprite, HouseArt, SleepLetters, TerrainPortrait } from './art.jsx';
import { hedgehogName, HEDGE_NAME_LIMIT, PERKS, plotBounds, workerActivity, workerCharacteristics, workerWorkplace, workplaces, workRoleLabel } from './game.js';
import { EAST_ORCHARD, FOREST_ORCHARD, HOUSE, isBerryOrchard, orchardName, STAT_INFO, WORK_ROLE_ICONS } from './orchard.js';
import { ProfileGlyph } from './profile-art.jsx';
import { Tooltip } from './tooltip.jsx';
import { BerryBushArt, MarketStallArt } from './trade-art.jsx';
import { stallById } from './trade.js';

const marketJob = role => role === 'restock' || role === 'vendor';
const freeRoaming = role => role === 'scout' || role === 'forage';

export function HedgeProfileHeader({ worker, onRename, onClose }) {
  const [draft, edit] = useState(null);
  const [invalid, showError] = useState(false);
  const editButton = useRef(null);
  const input = useRef(null);
  const editing = draft !== null;

  useLayoutEffect(() => {
    if (editing) {
      input.current.focus({ preventScroll: true });
      input.current.select();
    }
  }, [editing]);

  function finish() {
    showError(false);
    edit(null);
    requestAnimationFrame(() => editButton.current?.focus({ preventScroll: true }));
  }

  function save(event) {
    event.preventDefault();
    const name = hedgehogName(draft);
    if (!name) {
      showError(true);
      return;
    }
    onRename(name);
    finish();
  }

  return <div className="window-title profile-title">
    {draft === null ? <>
      <h2>{worker.name}</h2>
      <Tooltip label="Изменить имя"><button ref={editButton} type="button" className="pixel-button mini square"
        aria-label="Изменить имя" onClick={() => edit(worker.name)}><Glyph name="edit"/></button></Tooltip>
    </> : <form className="profile-rename" onSubmit={save} onKeyDown={event => {
      if (event.key === 'Escape' && !event.isPropagationStopped()) {
        event.stopPropagation();
        finish();
      }
    }}>
      <input ref={input} aria-label="Имя ёжика" aria-invalid={invalid} aria-describedby={invalid ? 'profile-name-error' : undefined}
        value={draft}
        onChange={event => { edit(event.currentTarget.value); showError(false); }}/>
      <Tooltip label="Сохранить имя"><button type="submit" className="pixel-button mini square"
        aria-label="Сохранить имя"><Glyph name="check"/></button></Tooltip>
      {invalid && <small id="profile-name-error" role="alert">Введите от 1 до {HEDGE_NAME_LIMIT} символов.</small>}
    </form>}
    <Tooltip label="Вернуться к ёжикам"><button type="button" className="pixel-button mini square"
      aria-label="Закрыть профиль и вернуться к ёжикам" onClick={onClose}><Glyph name="close"/></button></Tooltip>
  </div>;
}

function habitat(state, worker) {
  const technology = researchSite(state,worker.stayAt ?? worker.siteId);
  if (technology) return { point:technology, label:stationLabel(technology), art:<ResearchStationArt kind={technology.kind}/> };
  const station = industrySite(state, worker.siteId);
  if (station) return { point: station, label: workplaces(state).find(place => place.id === station.id)?.label,
    art: <IndustryArt site={station}/> };
  const job = state.jobs.find(item => item.workers.includes(worker.id));
  if (marketJob(worker.workRole) || job?.commissionId !== undefined) {
    const stall = stallById(state, job?.stallId ?? worker.stallId);
    return stall ? {
      point: stall, label: `Лавка ${state.trade.stalls.indexOf(stall) + 1}`,
      art: <MarketStallArt level={stall.levels.sign} stock={stall.stock}/>,
    } : { point: HOUSE, label: 'Дом', art: <HouseArt/> };
  }
  if (freeRoaming(worker.workRole)) {
    const patch = state.trade.wild.find(item => item.id === job?.patchId);
    const point = patch ?? { x: Math.round(worker.x / 120) * 120, y: Math.round(worker.y / 120) * 120 };
    return worker.workRole === 'forage'
      ? { point, label: 'Лес', art: <BerryBushArt fruit={patch?.fruit ?? 4}/> }
      : { point, label: 'Лес', art: <FlowerArt variant={0}/> };
  }
  const id = worker.orchardId;
  const plot = plotBounds(state, id);
  const point = plot ? { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 } : HOUSE;
  const variety = id === FOREST_ORCHARD ? 'forest' : id === EAST_ORCHARD ? 'gold' : 'red';
  const art = isBerryOrchard(id) ? <BerryBushArt fruit={5}/> : <AppleTree fruit={5} variety={variety}/>;
  return { point, label: orchardName(id), art };
}

function WorkAssignment({ state, worker, places, dispatch, onAssign }) {
  const place = places.find(item => item.id === workerWorkplace(worker));
  return <section className="profile-assignment" aria-label="Место и работа">
    <div className="profile-area">
      <GameSelect label={<><Glyph name={place?.icon ?? 'pin'}/> Место работы</>} value={place?.id}
        onChange={place => dispatch('assignWorkplace', { id: worker.id, place })}
        options={places.map(item => ({ value: item.id, label: item.label,
          disabled: ['tractor','lab','generator'].includes(item.kind) && state.workers.some(other => other.id !== worker.id && other.siteId === item.id) }))}/>
      {state.orchards.length > 1 && <Tooltip label="Выбрать сад на карте"><button type="button" className="pixel-button mini square"
        aria-label="Выбрать сад на карте" onClick={onAssign}><Glyph name="map"/></button></Tooltip>}
    </div>
    <GameSelect label={<><Glyph name={WORK_ROLE_ICONS[worker.workRole]}/> Работа</>} value={worker.workRole}
      onChange={role => dispatch('assignRole', { id: worker.id, role })} disabled={!place}
      options={(place?.roles ?? []).map(role => ({ value: role, label: workRoleLabel(place.id, role, place) }))}/>
  </section>;
}

export function HedgeProfile({ state, worker, dispatch, onLocate, onAssign }) {
  const stats = workerCharacteristics(state, worker);
  const perks = workerPerks(worker);
  const places = workplaces(state);
  const jobs = availablePerkJobs(state,places);
  const [confirm, confirmRetirement] = useState(false);
  const { point, label, art } = habitat(state, worker);
  return <article className="profile-body" aria-label={`Профиль ёжика ${worker.name}`}>
    <figure className="profile-portrait">
      <div className="portrait-scene" role="img" aria-label={`Портрет ёжика ${worker.name}. ${label}`}>
        <TerrainPortrait x={point.x} y={point.y}/>
        <div className="profile-habitat">{art}</div>
        <HedgeSprite hedge={{ ...worker, left: false }} sleeping={stats.sleeping}/>
      </div>
      <figcaption className="portrait-caption">
        <span><strong>{label}</strong><small>{workerActivity(state, worker)}{stats.sleeping && <SleepLetters/>}</small></span>
        <Tooltip label="Показать ёжика на карте"><button type="button" className="pixel-button mini square" onClick={onLocate}
          aria-label="Показать ёжика на карте"><Glyph name="center"/></button></Tooltip>
      </figcaption>
    </figure>
    <div className="profile-stamina"><span><Glyph name="endurance"/> Запас сил</span><span>{Math.ceil(stats.stamina)}/{stats.maxStamina}</span>
      <div className="stamina-track" role="progressbar" aria-label="Запас сил" aria-valuemin={0}
        aria-valuemax={stats.maxStamina} aria-valuenow={Math.ceil(stats.stamina)}>
        <i style={{ width: `${stats.stamina / stats.maxStamina * 100}%` }}/>
      </div>
    </div>
    <div className="profile-stats" role="group" aria-label="Характеристики">
      {Object.entries(STAT_INFO).map(([id, definition]) => <Tooltip key={id} label={definition.label} detail={definition.desc} tap>
        <button type="button" className="profile-stat" data-stat={id} aria-label={`${definition.label} ${worker.stats[id]}`}>
          <ProfileGlyph name={id}/><span>{worker.stats[id]}</span>
        </button>
      </Tooltip>)}
    </div>
    {perks.map(key => {
      const perk = PERKS[key];
      return <section key={key} className="profile-perk" aria-label="Перк">
        <div className="perk-icon" data-perk={key}><Glyph name={perk.icon}/></div>
        <div><h3>{perk.name}</h3><p>{PERK_TIERS.find(tier => tier.id === perk.tier)?.label ?? 'Уникальный'} · {perkDescription(key,jobs)}</p></div>
      </section>;
    })}
    {worker.pendingPerks?.map(key => <section key={key} className="research-card">
      <h3>Новый перк · {PERKS[key].name}</h3><p>{perkDescription(key,jobs)}</p>
      {(perks.length === 3 ? perks : [null]).map(replace => <button key={replace ?? 'empty'} type="button" className="pixel-button mini"
        onClick={() => dispatch('replacePerk',{id:worker.id,earn:key,replace})}>{replace ? `Заменить «${PERKS[replace].name}»` : 'Добавить перк'}</button>)}
    </section>)}
    {worker.stayAt && !worker.train && <button className="pixel-button mini" type="button" onClick={() => dispatch('resumeWork',{id:worker.id})}>Вернуться к работе</button>}
    <JobAdvice places={places} worker={worker}/>
    <WorkAssignment state={state} worker={worker} places={places} dispatch={dispatch} onAssign={onAssign}/>
    {researchUnlocked(state) && <section className="profile-assignment">
      {worker.retirePending ? <p>Заканчивает рейс перед отдыхом.</p> : confirm ? <>
        <p>Ёжик освободит место после текущей работы. Вернуть его можно в течение 15 минут, если в доме есть место.</p>
        <button type="button" className="pixel-button mini" disabled={Boolean(worker.train || worker.pairing)}
          onClick={() => dispatch('retireWorker',{id:worker.id})}>Проводить в домик отдыха</button>
        <button type="button" className="pixel-button mini" onClick={() => confirmRetirement(false)}>Отмена</button>
      </> : <button type="button" className="pixel-button mini" disabled={Boolean(worker.train || worker.pairing)}
        onClick={() => confirmRetirement(true)}>Отправить на отдых</button>}
    </section>}

  </article>;
}
