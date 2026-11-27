import { useEffect, useRef, useState } from 'react';
import { Glyph, HedgeSprite } from './art.jsx';
import { GUIDE, nextLevelXp, UPGRADES, upgradeStatus, visibleUpgrades } from './game.js';
import { Tooltip } from './tooltip.jsx';
import { confine, zoomRange } from './camera.js';
import { PanoramaControls, usePanorama } from './panorama.jsx';

const number = new Intl.NumberFormat('ru-RU');
const graph = {
  root:   { x: 431, y: 303, branch: 'center' },
  plot1:  { x: 280, y: 220, branch: 'garden' },
  plot2:  { x: 122, y: 145, branch: 'garden' },
  roots:  { x: 230, y: 104, branch: 'garden' },
  clearing: { x: 132, y: 251, branch: 'garden' },
  crop:   { x: 325, y:  43, branch: 'garden' },
  pace:   { x: 570, y: 201, branch: 'work' },
  carry:  { x: 733, y: 114, branch: 'work' },
  group1: { x: 574, y: 392, branch: 'group' },
  group2: { x: 736, y: 488, branch: 'group' },
  flower: { x: 240, y: 458, branch: 'flower' },
  paving: { x: 719, y: 226, branch: 'work' },
  picking: { x: 104, y: 62, branch: 'garden' },
  naps: { x: 605, y: 506, branch: 'group' },
  pantry: { x: 803, y: 47, branch: 'work' },
  grafting: { x: 419, y: 84, branch: 'garden' },
  seedSatchel: { x: 53, y: 328, branch: 'garden' },
  quickPacking: { x: 912, y: 52, branch: 'work' },
  tradeCrates: { x: 934, y: 163, branch: 'work' },
  longShift: { x: 618, y: 615, branch: 'group' },
  group3: { x: 856, y: 564, branch: 'group' },
  keenScent: { x: 145, y: 521, branch: 'flower' },
  flowerPower: { x: 66, y: 612, branch: 'flower' },
  berryBaskets: { x: 498, y: 36, branch: 'garden' },
  farmWater: { x: 597, y: 50, branch: 'garden' },
  batchCraft: { x: 1040, y: 53, branch: 'work' },
  largerBatches: { x: 1150, y: 115, branch: 'work' },
  efficientFuel: { x: 945, y: 274, branch: 'work' },
  tractorGears: { x: 1080, y: 340, branch: 'work' },
  marketLedger: { x: 1070, y: 212, branch: 'work' },
  shiftPlanning: { x: 760, y: 663, branch: 'group' },
  orchardStewards: { x: 481, y: 151, branch: 'garden' },
  gardenCrew: { x: 63, y: 131, branch: 'garden' },
  farmHarvest: { x: 678, y: 37, branch: 'garden' },
  trailSatchels: { x: 930, y: 380, branch: 'work' },
  packingLine: { x: 1284, y: 113, branch: 'work' },
  coalKiln: { x: 1235, y: 256, branch: 'work' },
  roadFreight: { x: 1230, y: 407, branch: 'work' },
  heritageOrchard: { x: 365, y: 158, branch: 'garden' },
  firstFarm: { x: 764, y: 24, branch: 'garden' },
  freightHub: { x: 1375, y: 447, branch: 'work' },
  trustedStall: { x: 1060, y: 492, branch: 'work' },
  orchardTeams: { x: 898, y: 677, branch: 'group' },
  furnaceCrew: { x: 1380, y: 161, branch: 'work' },
  forestPockets: { x: 236, y: 606, branch: 'flower' },
};
const graphWidth = 1460;
const graphHeight = 740;
const graphBounds = { width: graphWidth + 260, height: graphHeight + 250 };
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

function TreeDiagram({ state, visible, selected, onSelect }) {
  const status = id => id === 'root' ? 'done' : upgradeStatus(state, id);
  return <div className="tree-canvas" style={{ width: graphWidth, height: graphHeight }} aria-label="Ветви дерева улучшений">
    <svg className="tree-wires" viewBox={`0 0 ${graphWidth} ${graphHeight}`} aria-hidden="true">
      <path className="tree-grid-orbit" d="M431 54L743 303 431 527 116 303Z M431 113L656 303 431 477 198 303Z"/>
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
        style={{ left: `${100 * point.x / graphWidth}%`, top: `${100 * point.y / graphHeight}%` }}>
        {root ? <HedgeSprite hedge={GUIDE}/> : <Glyph name={UPGRADES[id].icon}/>}
      </button></Tooltip>;
    })}
  </div>;
}

function TreePanorama({ state, visible, selected, select }) {
  const panorama = usePanorama({ bounds: graphBounds, initial: initialTreeCamera, fit: 'contain' });
  return <div className="tree-stage">
    <div {...panorama.surface} className="tree-viewport" role="region" aria-label="Панорама дерева улучшений">
      <div className="tree-world" style={panorama.scene}>
        <TreeDiagram state={state} visible={visible} selected={selected} onSelect={(event, id) => { if (!panorama.dragged(event)) select(id); }}/>
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

