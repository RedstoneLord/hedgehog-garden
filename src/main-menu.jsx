import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppleTree, BasketArt, FlowerArt, Glyph, HedgeSprite, HouseArt, WorldBackdrop } from './art.jsx';
import { GUIDE } from './game.js';
import { isFieldCrop } from './orchard.js';
import { WORLD } from './terrain.js';
import logo from './menu-logo.png?inline';
import './main-menu.css';

const number = new Intl.NumberFormat('ru-RU');
const motionKey = 'orchard-menu-motion';
const orchardTrees = [
  [1780, 1258, 112, 'gold'], [1930, 1348, 128, 'red'], [2118, 1312, 119, 'red'],
  [2244, 1416, 106, 'gold'], [2331, 1154, 119, 'red'], [2433, 1272, 138, 'gold'],
  [2489, 1442, 115, 'red'], [2550, 1636, 124, 'gold'], [2455, 1730, 134, 'red'],
  [2912, 1220, 116, 'gold'], [3070, 1257, 135, 'red'], [3235, 1338, 121, 'gold'],
  [3020, 1632, 141, 'red'], [3195, 1766, 160, 'red'], [3340, 1883, 182, 'gold'],
];
const flowerPatches = [
  [2515, 1460, 28], [2470, 1492, 17], [2628, 1635, 26],
  [2876, 1401, 23], [2975, 1562, 28], [3105, 1647, 24], [3200, 1690, 30],
];

function sceneryAt(x, y, width) {
  return { left: x, top: y, width, zIndex: Math.round(y) };
}

const MenuArtwork = memo(function MenuArtwork() {
  const viewport = useRef(null);
  const world = useRef(null);
  useLayoutEffect(() => {
    const frame = viewport.current;
    const scene = world.current;
    function frameOrchard() {
      const { clientWidth: width, clientHeight: height } = frame;
      const portrait = width < 700 && width < height;
      const zoom = portrait ? Math.max(width / 1120, height / 1680) : Math.max(width / 2450, height / 1500);
      const centerX = portrait ? 2750 : 2350;
      const centerY = portrait ? 1515 : 1330;
      scene.style.transform = `translate(${Math.round(width / 2 - centerX * zoom)}px,${Math.round(height / 2 - centerY * zoom)}px) scale(${zoom})`;
    }
    frameOrchard();
    const observer = new ResizeObserver(frameOrchard);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return <div className="menu-art" ref={viewport} aria-hidden="true">
    <div className="menu-drift">
      <div className="menu-world" ref={world} style={{ width:WORLD.width, height:WORLD.height }}>
        <WorldBackdrop/>
        {orchardTrees.map(([x,y,width,variety], index) => <div key={x} className="menu-scenery menu-orchard-tree"
          style={{ ...sceneryAt(x,y,width), '--breeze-delay': `-${index % 6 * .9}s` }}>
          <AppleTree variety={variety} fruit={5 + index % 4}/>
        </div>)}
        {flowerPatches.map(([x,y,width], index) => <div className="menu-scenery" key={x} style={sceneryAt(x,y,width)}>
          <FlowerArt variant={index % 3}/>
        </div>)}
        <div className="menu-scenery menu-cottage" style={sceneryAt(2981,1412,184)}>
          <HouseArt/>
          <i className="menu-smoke"/><i className="menu-smoke"/><i className="menu-smoke"/>
        </div>
        <div className="menu-scenery menu-baskets" style={sceneryAt(2905,1443,53)}><BasketArt level={1}/></div>
        <div className="menu-scenery" style={sceneryAt(3064,1450,48)}><BasketArt level={2}/></div>
        <div className="menu-actor menu-courier" style={{ left:2340, top:1520, zIndex:1520 }}>
          <i className="menu-actor-shadow"/>
          <HedgeSprite hedge={GUIDE} walking/>
          <div className="menu-courier-basket"><BasketArt level={1}/></div>
        </div>
        <div className="menu-actor menu-gatherer" style={{ left:2990, top:1638, zIndex:1638 }}>
          <i className="menu-actor-shadow"/>
          <HedgeSprite hedge={{ quills:2, skin:4, hat:'leaf', pose:1, left:true }} walking/>
        </div>
        {[ [2510,1680], [2900,1260], [3100,1517], [2800,1545], [2995,1730], [3260,1480], [2580,1350] ].map(([x,y], index) =>
          <i key={x} className="menu-firefly" style={{ left:x, top:y, zIndex:y, '--delay': `-${index * 1.32}s` }}/>)}
      </div>
    </div>
    <div className="menu-art-shade"/>
  </div>;
});

function SoundOption({ name, label, enabled, onToggle }) {
  return <button type="button" className="pixel-button menu-option" role="switch" aria-checked={enabled} onClick={onToggle}>
    <Glyph name={name}/><span>{label}</span><span className="menu-switch" aria-hidden="true"/>
  </button>;
}

function SaveStats({ state }) {
  const stats = [
    ['xp', 'Уровень', state.level],
    ['hedge', 'Ёжики', state.workers.length],
    ['apple', 'Яблони', state.trees.filter(tree => !isFieldCrop(tree.variety)).length],
    ['plotWide', 'Сады и фермы', state.orchards.length],
    ['tree', 'Улучшения', state.upgrades.length],
    ['coin', 'Монеты', state.trade.coins],
  ];
  return <dl className="menu-stats">
    {stats.map(([icon, label, value]) => <div key={icon}>
      <dt><Glyph name={icon}/>{label}</dt><dd>{number.format(value)}</dd>
    </div>)}
  </dl>;
}

export function MainMenu({ state, audio, onPlay, onReset, onExport }) {
  const [page, setPage] = useState('home');
  const [motion, setMotion] = useState(() => {
    try { return localStorage.getItem(motionKey) !== 'off'; }
    catch { return true; }
  });
  const [reduceMotion, setReduceMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const primary = useRef(null);
  useEffect(() => { primary.current?.focus({ preventScroll: true }); }, [page]);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = event => setReduceMotion(event.matches);
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);

  function toggleMotion() {
    setMotion(!motion);
    try { localStorage.setItem(motionKey, motion ? 'off' : 'on'); }
    catch { /* Keep the in-memory preference when storage is unavailable. */ }
  }

  return <main className="main-menu" data-motion={motion && !reduceMotion ? 'on' : 'off'} aria-labelledby="menu-title" onKeyDown={event => {
    if (page !== 'home' && event.key === 'Escape') setPage(page === 'reset' ? 'settings' : 'home');
  }}>
    <MenuArtwork/>
    <div className="menu-stage" data-page={page}>
      <div className={`menu-board${page === 'home' ? '' : ' pixel-window'}`}>
        <div className="menu-content">
          {page === 'home' ? <>
            <h1 id="menu-title" className="menu-logo"><img src={logo} alt="Ёжиковый сад" width="168" height="102"/></h1>
            <div className="menu-actions">
              <button type="button" className="pixel-button menu-play" ref={primary} onClick={onPlay}><Glyph name="play"/>Играть</button>
              <div className="menu-secondary">
                <button type="button" className="pixel-button" onClick={() => setPage('settings')}><Glyph name="sound"/>Настройки</button>
                <button type="button" className="pixel-button" onClick={() => setPage('stats')}><Glyph name="table"/>Статистика</button>
              </div>
            </div>
          </> : <>
            <h1 id="menu-title" className="menu-page-title">{page === 'settings' ? 'Настройки' : page === 'reset' ? 'Начать заново' : 'Статистика'}</h1>
            {page === 'settings' ? <div className="menu-options">
              <SoundOption name="sound" label="Звуковые эффекты" enabled={audio.effects} onToggle={audio.toggleEffects}/>
              <SoundOption name="note" label="Музыка и звуки природы" enabled={audio.ambience} onToggle={audio.toggleAmbience}/>
              <button type="button" className="pixel-button menu-option" onClick={() => setPage('reset')}><Glyph name="axe"/>Сбросить прогресс</button>
            </div> : page === 'reset' ? <section className="menu-options" aria-label="Сброс прогресса">
              <p>Текущий сад будет удалён. Перед сбросом можно скачать сохранение.</p>
              <button type="button" className="pixel-button" onClick={onExport}><Glyph name="save"/> Скачать сохранение</button>
              <button type="button" className="pixel-button" onClick={() => { onReset(); setPage('home'); }}>Удалить сад и начать заново</button>
            </section> : <SaveStats state={state}/>}
            <button type="button" className="pixel-button menu-back" ref={primary} onClick={() => setPage(page === 'reset' ? 'settings' : 'home')}><Glyph name="back"/>Назад</button>
          </>}
        </div>
      </div>
    </div>
    {!reduceMotion && <button type="button" className="pixel-button square menu-motion" aria-label="Движение фона" aria-pressed={motion} onClick={toggleMotion}>
      {motion ? <span className="menu-pause-symbol" aria-hidden="true"/> : <Glyph name="play"/>}
    </button>}
  </main>;
}
