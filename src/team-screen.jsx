import { useEffect, useRef, useState } from 'react';
import { Glyph, HedgeSprite } from './art.jsx';
import { crewAssignmentPlan, hedgehogName, workplaces, workerWorkplace, workRoleLabel } from './game.js';
import { GameSelect } from './game-select.jsx';
import './team.css';

function SendPreview({ state, selection, onCancel, onApply, panelRef }) {
  const { rows, favorites } = crewAssignmentPlan(state, selection);
  const counts = { now:0, pending:0, unchanged:0, skip:0 };
  for (const { status } of rows) counts[status]++;
  const groups = new Map();
  for (const { member, target, status } of rows) {
    if (status === 'skip') continue;
    const name = `${target.label} · ${workRoleLabel(target.id, member.role, target)}`;
    groups.set(name, (groups.get(name) ?? 0) + 1);
  }
  return <section ref={panelRef} className="pixel-window team-panel team-preview" tabIndex={-1} aria-label="Проверка назначений">
    <h3>{selection.name ? `Набор «${selection.name}»` : 'Проверка назначений'}</h3>
    <div className="team-counts">
      {counts.now > 0 && <span>Сейчас · {counts.now}</span>}
      {counts.pending > 0 && <span>После текущей работы · {counts.pending}</span>}
      {counts.unchanged > 0 && <span>Уже на месте · {counts.unchanged}</span>}
      {counts.skip > 0 && <span>Недоступно · {counts.skip}</span>}
    </div>
    {groups.size > 0 && <ul>{[...groups].map(([name, count]) => <li key={name}>{name} · {count}</li>)}</ul>}
    {favorites && <p>Избранная кучка · {favorites.length} ёж.</p>}
    <div className="team-actions">
      <button type="button" className="pixel-button" onClick={onApply} disabled={!counts.now && !counts.pending && !favorites}><Glyph name="check"/> Применить</button>
      <button type="button" className="pixel-button" onClick={onCancel}>Отмена</button>
    </div>
  </section>;
}

export function TeamScreen({ state, dispatch, initialTab, onClose }) {
  const dialog = useRef(null);
  const assignment = useRef(null);
  const preview = useRef(null);
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [at, setAt] = useState('all');
  const [picked, setPicked] = useState([]);
  const [placeId, setPlace] = useState(null);
  const [job, setJob] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [result, setResult] = useState('');
  const places = workplaces(state);
  const sites = new Map(places.map(place => [place.id,place]));
  const workers = state.workers.filter(worker => !worker.retirePending);
  const workerIds = new Set(workers.map(worker => worker.id));
  const chosen = picked.filter(id => workerIds.has(id));
  const visible = workers.filter(worker => worker.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    && (at === 'all' || workerWorkplace(worker) === at));
  const visibleIds = visible.map(worker => worker.id);
  const allVisible = visibleIds.length > 0 && visibleIds.every(id => chosen.includes(id));
  const place = sites.get(placeId);
  const role = place?.roles.includes(job) ? job : place?.roles[0];
  const presets = state.crews ?? [];

  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);

  function switchTab(next) {
    setTab(next);
    setConfirm(null);
    setEditing(null);
    setResult('');
  }

  function toggleWorker(id) {
    setPicked(current => current.includes(id) ? current.filter(item => item !== id) : [...current,id]);
    setConfirm(null);
  }

  function showPreview(selection) {
    setConfirm(selection);
    requestAnimationFrame(() => preview.current?.focus());
  }

  function apply() {
    dispatch('assignCrew', confirm);
    setConfirm(null);
    setResult('Назначения обновлены.');
  }

  function save(event) {
    event.preventDefault();
    const title = hedgehogName(name);
    if (!title || presets.some(item => item.name === title && item.name !== editing.name)) return;
    if (editing.kind === 'rename') dispatch('renamePreset', { name:editing.name, next:title });
    else dispatch('saveCrew', { name:title });
    setResult(editing.kind === 'rename' ? 'Набор переименован.' : 'Текущие назначения и кучка сохранены.');
    setEditing(null);
  }

  return <dialog className="game-screen team-screen" ref={dialog} aria-labelledby="team-title"
    onCancel={event => { event.preventDefault(); if (confirm) setConfirm(null); else onClose(); }}>
    <header className="screen-header">
      <h2 id="team-title"><Glyph name="hedgePair"/> Команда</h2>
      <button type="button" className="pixel-button" onClick={onClose}><Glyph name="close"/> Назад к ёжикам</button>
    </header>
    <div className="team-body">
      <nav className="team-actions" aria-label="Управление командой">
        <button className="pixel-button" type="button" aria-pressed={tab === 'assign'} onClick={() => switchTab('assign')}>Назначения</button>
        <button className="pixel-button" type="button" aria-pressed={tab === 'presets'} onClick={() => switchTab('presets')}>Наборы · {presets.length}</button>
      </nav>
      {result && <p className="team-result" role="status">{result}</p>}
      {tab === 'assign' ? <div className="team-layout">
        <section className="pixel-window team-panel">
          <h3>Выбери ёжиков</h3>
          <div className="team-filters">
            <label>Поиск по имени <input value={search} onChange={event => setSearch(event.target.value)}/></label>
            <GameSelect label="Текущее место" value={at} options={[{value:'all',label:'Все места'}, ...places.map(item => ({value:item.id,label:item.label}))]} onChange={setAt}/>
          </div>
          <div className="team-actions">
            <button className="pixel-button mini" type="button" disabled={!visibleIds.length}
              onClick={() => { setPicked(allVisible ? chosen.filter(id => !visibleIds.includes(id)) : [...new Set([...chosen,...visibleIds])]); setConfirm(null); }}>
              <Glyph name={allVisible ? 'minus' : 'check'}/>{allVisible ? 'Снять выбор с видимых' : 'Выбрать всех видимых'} · {visibleIds.length}
            </button>
            {chosen.length > 0 && <>
              <button type="button" className="pixel-button mini" onClick={() => { setPicked([]); setConfirm(null); }}>Снять весь выбор</button>
              <button type="button" className="pixel-button mini team-jump" onClick={() => assignment.current?.focus()}>К назначению · {chosen.length}</button>
            </>}
          </div>
          <div className="team-roster">{visible.map(worker =>
            <label className="team-worker" key={worker.id}>
              <input type="checkbox" checked={chosen.includes(worker.id)} onChange={() => toggleWorker(worker.id)}/>
              <HedgeSprite hedge={worker}/><span><b>{worker.name}</b><small>{sites.get(workerWorkplace(worker))?.label}</small></span>
            </label>)}</div>
          {!visible.length && <p>По этим условиям ёжиков нет.</p>}
        </section>
        <div className="team-side">
          <section ref={assignment} className="pixel-window team-panel" aria-label="Новое назначение" tabIndex={-1}>
            <h3>Новое назначение · {chosen.length}</h3>
            <GameSelect label="Куда направить" value={place?.id ?? ''} options={[{value:'',label:'Выбери место'}, ...places.map(item => ({value:item.id,label:item.label}))]}
              onChange={value => { setPlace(value); setJob(null); setConfirm(null); }}/>
            {place && <GameSelect label="Работа" value={role} options={place.roles.map(value => ({ value, label:workRoleLabel(place.id,value,place) }))}
              onChange={value => { setJob(value); setConfirm(null); }}/>}
            <button type="button" className="pixel-button" disabled={!chosen.length || !place || !role}
              onClick={() => showPreview({ ids:chosen, place:place.id, role })}>Проверить назначение</button>
          </section>
          {confirm && <SendPreview panelRef={preview} state={state} selection={confirm} onCancel={() => setConfirm(null)} onApply={apply}/>}
        </div>
      </div> : <div className="team-layout">
        <section className="pixel-window team-panel">
          <h3>Сохранённые наборы</h3>
          {presets.length === 0 && <p>Сохрани текущие места работы, задания и кучку, чтобы вернуть их одним набором.</p>}
          {presets.map(preset => <div className="team-preset" key={preset.name}>
            <div><b>{preset.name}</b><small>{preset.members.filter(item => workerIds.has(item.id)).length} ёж. в саду · {new Set(preset.members.map(item => item.place)).size} мест</small></div>
            <div className="team-actions">
              <button type="button" className="pixel-button mini" aria-pressed={confirm?.name === preset.name}
                onClick={() => { showPreview({name:preset.name}); setEditing(null); }}>Выбрать</button>
              <button type="button" className="pixel-button mini square" aria-label={`Переименовать ${preset.name}`} onClick={() => { setEditing({kind:'rename',name:preset.name}); setName(preset.name); setConfirm(null); }}><Glyph name="edit"/></button>
              <button type="button" className="pixel-button mini square" aria-label={`Управление набором ${preset.name}`} onClick={() => { setEditing({kind:'manage',name:preset.name}); setConfirm(null); }}><Glyph name="work"/></button>
            </div>
            {editing?.kind === 'manage' && editing.name === preset.name && <div className="team-actions">
              <button type="button" className="pixel-button mini" onClick={() => { dispatch('saveCrew',{ name:preset.name }); setEditing(null); setResult('Набор обновлён из текущей команды.'); }}>Записать текущую команду</button>
              <button type="button" className="pixel-button mini" onClick={() => { dispatch('removePreset',{ name:preset.name }); setEditing(null); setResult('Набор удалён.'); }}>Удалить набор</button>
            </div>}
          </div>)}
          <button type="button" className="pixel-button" disabled={!workers.length}
            onClick={() => { setEditing({kind:'new'}); setName(''); setConfirm(null); }}><Glyph name="plus"/> Сохранить текущую команду</button>
        </section>
        <div className="team-side">
          {confirm && <SendPreview panelRef={preview} state={state} selection={confirm} onCancel={() => setConfirm(null)} onApply={apply}/>}
          {editing && editing.kind !== 'manage' && <form className="pixel-window team-panel" onSubmit={save}>
            <h3>{editing.kind === 'rename' ? 'Переименовать набор' : 'Новый набор'}</h3>
            <label>Имя набора <input maxLength={24} value={name} onChange={event => setName(event.target.value)} autoFocus required/></label>
            {presets.some(item => item.name === name.trim() && item.name !== editing.name) && <p>Имя уже занято.</p>}
            <div className="team-actions"><button type="submit" className="pixel-button">Сохранить</button>
              <button type="button" className="pixel-button" onClick={() => setEditing(null)}>Отмена</button></div>
          </form>}
        </div>
      </div>}
    </div>
  </dialog>;
}
