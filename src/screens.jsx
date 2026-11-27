import { useEffect, useRef, useState } from 'react';
import { Glyph, HedgeSprite } from './art.jsx';
import { GUIDE, nextLevelXp, UPGRADES, upgradeStatus, visibleUpgrades } from './game.js';
import { Tooltip } from './tooltip.jsx';
import { confine, zoomRange } from './camera.js';
import { PanoramaControls, usePanorama } from './panorama.jsx';

const number = new Intl.NumberFormat('ru-RU');
const graphWidth = 1660;
const graphHeight = 1280;
const graphBounds = { width: graphWidth, height: graphHeight };
const graph = { root: {x:830,y:90,branch:'center'} };
const roots = { plot1:'garden', pace:'work', group1:'group', flower:'flower' };
const columns = { garden:[40,535], work:[590,1110], group:[1140,1400], flower:[1430,1630] };
const depths = new Map();
for (const [key, upgrade] of Object.entries(UPGRADES)) {
  const parent = upgrade.requires;
  const branch = roots[key] ?? graph[parent].branch;
  const depth = (depths.get(parent) ?? 0) + 1;
  depths.set(key,depth);
  const [min,max] = columns[branch];
  const band = Object.keys(graph).filter(id => graph[id].branch === branch && depths.get(id) === depth);
  graph[key] = {x:(min + max) / 2,y:90 + depth * 100,branch};
  const row = [...band,key];
  row.forEach((id,index) => { graph[id].x = min + (max-min) * (index+1)/(row.length+1); });
}
const branches = { garden: 'Сад', work: 'Работа', group: 'Кучка', flower: 'Цветы' };

function initialTreeCamera(size) {
  const { min } = zoomRange(size.width, size.height, graphBounds, 'contain');
  const zoom = Math.max(min, Math.min(1.2, size.width / (graphWidth + 30), size.height / (graphHeight + 40)));
  return confine({ zoom, x: graphBounds.width / 2, y: graphBounds.height / 2 }, size, graphBounds);
}

function Screen({ titleId, className, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);
  return <dialog ref={dialog} className={`game-screen ${className}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    {children}
  </dialog>;
}

function ScreenClose({ onClose, label }) {
  return <button type="button" className="pixel-button square screen-close" aria-label={label} onClick={onClose}><Glyph name="close"/></button>;
}

function TreeDiagram({ state, visible, selected, onSelect, onFocusNode }) {
  const status = id => id === 'root' ? 'done' : upgradeStatus(state, id);
  return <div className="tree-canvas" style={{ width: graphWidth, height: graphHeight }} aria-label="Ветви дерева улучшений">
    <svg className="tree-wires" viewBox={`0 0 ${graphWidth} ${graphHeight}`} aria-hidden="true">

      {visible.map(id => {
        const item = UPGRADES[id];
        const from = graph[item.requires || 'root'];
        const to = graph[id];
        const middle = { x: Math.round((from.x + to.x) / 2), y: Math.round((from.y + to.y) / 2) };
        const d = `M${from.x} ${from.y} ${middle.x} ${middle.y} ${to.x} ${to.y}`;
        return <g key={id} className={`wire ${to.branch} ${status(id)}`}>
          <path className="wire-outline" d={d}/><path className="wire-line" d={d}/>
          <rect x={middle.x - 3} y={middle.y - 3} width="6" height="6" transform={`rotate(45 ${middle.x} ${middle.y})`}/>
        </g>;
      })}
    </svg>
    {state.unlocked && ['root', ...visible].map(id => {
      const point = graph[id];
      const root = id === 'root';
      const label = root ? 'Картошка' : UPGRADES[id].name;
      return <Tooltip key={id} label={label} detail={UPGRADES[id]?.desc}><button type="button" aria-label={label} aria-pressed={selected === id}
        className={`tree-diamond ${point.branch} ${status(id)}`} onClick={event => onSelect(event, id)}
        onFocus={event => onFocusNode(event, point)}
        style={{ left: `${100 * point.x / graphWidth}%`, top: `${100 * point.y / graphHeight}%` }}>
        {root ? <HedgeSprite hedge={GUIDE}/> : <Glyph name={UPGRADES[id].icon}/>}
      </button></Tooltip>;
    })}
  </div>;
}

function TreePanorama({ state, visible, selected, select }) {
  const panorama = usePanorama({ bounds: graphBounds, initial: initialTreeCamera, fit: 'contain' });
  function revealFocusedNode(event, point) {
    if (!event.currentTarget.matches(':focus-visible')) return;
    const { x, y } = panorama.centerPoint;
    const { width, height } = panorama.viewSize;
    const margin = 58;
    if ((Math.abs(point.x - x) + margin) * panorama.zoom > width / 2
      || (Math.abs(point.y - y) + margin) * panorama.zoom > height / 2) panorama.focus({ x:point.x, y:point.y });
  }
  return <div className="tree-stage">
    <div {...panorama.surface} className="tree-viewport" role="region" aria-label="Панорама дерева улучшений">
      <div className="tree-world" style={panorama.scene}>
        <TreeDiagram state={state} visible={visible} selected={selected} onFocusNode={revealFocusedNode}
          onSelect={(event, id) => { if (!panorama.dragged(event)) select(id); }}/>
      </div>
    </div>
    <PanoramaControls panorama={panorama} label="дерево улучшений" resetLabel="Вернуться к началу дерева"/>
  </div>;
}

function UpgradeDetails({ state, selected, dispatch }) {
  const item = UPGRADES[selected];
  if (!item) return <aside className="tree-detail pixel-window" aria-live="polite">
    <div className="tree-detail-icon">{state.unlocked ? <HedgeSprite hedge={GUIDE}/> : <Glyph name="tree"/>}</div>
    <h3>{state.unlocked ? 'Картошка' : 'Развитие сада'}</h3>
    <p>{state.unlocked ? 'Открывай узлы, чтобы увидеть следующие улучшения в каждой ветви.' : 'Собирай яблоки и получай опыт. Улучшения появятся по мере развития сада.'}</p>
  </aside>;
  const status = upgradeStatus(state, selected);
  return <aside className={`tree-detail pixel-window ${graph[selected].branch}`} aria-live="polite">
    <div className="tree-detail-icon"><Glyph name={item.icon}/></div>
    <p className="branch-name">{branches[graph[selected].branch]}</p>
    <h3>{item.name}</h3>
    <p>{item.desc}</p>
    {status === 'pending' && <p className="upgrade-shortfall">Не хватает {number.format(item.cost - state.xp)} ОП.</p>}
    {status === 'done' ? <p className="upgrade-complete"><Glyph name="check"/> Открыто</p>
      : <button type="button" className="pixel-button buy-button" disabled={status !== 'ready'} onClick={() => dispatch('upgrade', { id: selected })}>
        <span>Открыть</span><span className="node-price"><Glyph name="xp"/>{item.cost} ОП</span>
      </button>}
  </aside>;
}

export function UpgradeTree({ state, dispatch, onClose }) {
  const visible = visibleUpgrades(state);
  const [requested, select] = useState(() => visible[0] ?? 'root');
  const selected = requested === 'root' || visible.includes(requested) ? requested : visible[0] ?? 'root';
  const goal = nextLevelXp(state.level);
  return <Screen titleId="upgrades-title" className="upgrade-screen" onClose={onClose}>
    <header className="screen-header">
      <h2 id="upgrades-title"><Glyph name="tree"/>Дерево улучшений</h2>
      <Tooltip label="До следующего уровня" detail={`${state.xpProgress} из ${goal} опыта`} tap><div className="tree-budget" tabIndex={0}>
        <Glyph name="xp"/>{number.format(state.xp)} ОП<span>Ур. {number.format(state.level)}</span><small>Опыт {number.format(state.xpProgress)}/{number.format(goal)}</small>
        <div role="progressbar" className="xp-progress" aria-label="Опыт до следующего уровня" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={state.xpProgress}>
          <i style={{ width: `${100 * state.xpProgress / goal}%` }}/>
        </div>
      </div></Tooltip>
      <ScreenClose label="Закрыть дерево улучшений" onClose={onClose}/>
    </header>
    <div className="upgrade-layout">
      <TreePanorama state={state} visible={visible} selected={selected} select={select}/>
      <UpgradeDetails state={state} selected={selected} dispatch={dispatch}/>
    </div>
  </Screen>;
}

