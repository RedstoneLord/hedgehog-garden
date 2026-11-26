import { useEffect, useRef, useState } from 'react';
import { AppleTree, BasketArt, Glyph, HedgeSprite, TerrainPortrait } from './art.jsx';
import { GUIDE } from './game.js';
import { isFieldCrop } from './orchard.js';
import './main-menu.css';

const number = new Intl.NumberFormat('ru-RU');

function MenuArtwork() {
  return <div className="menu-art" aria-hidden="true">
    <TerrainPortrait x={2625} y={1498} cover/>
    <div className="menu-art-shade"/>
    <div className="menu-art-tree menu-art-gold"><AppleTree fruit={5} variety="gold"/></div>
    <div className="menu-art-tree menu-art-apple"><AppleTree fruit={7} variety="red"/></div>
    <div className="menu-art-basket"><BasketArt level={1}/></div>
    <HedgeSprite className="menu-art-hedge" hedge={GUIDE}/>
  </div>;
}

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

export function MainMenu({ state, audio, onPlay }) {
  const [page, setPage] = useState('home');
  const primary = useRef(null);
  useEffect(() => { primary.current?.focus({ preventScroll: true }); }, [page]);

  return <main className="main-menu" aria-labelledby="menu-title" onKeyDown={event => {
    if (page !== 'home' && event.key === 'Escape') setPage('home');
  }}>
    <div className="menu-stage">
      <div className="menu-board pixel-window">
        <MenuArtwork/>
        <div className="menu-content">
          {page === 'home' ? <>
            <h1 id="menu-title"><span>Яблочный</span>{' '}<span>сад</span></h1>
            <div className="menu-actions">
              <button type="button" className="pixel-button menu-play" ref={primary} onClick={onPlay}><Glyph name="play"/>Играть</button>
              <div className="menu-secondary">
                <button type="button" className="pixel-button" onClick={() => setPage('settings')}><Glyph name="sound"/>Настройки</button>
                <button type="button" className="pixel-button" onClick={() => setPage('stats')}><Glyph name="table"/>Статистика</button>
              </div>
            </div>
          </> : <>
            <h1 id="menu-title" className="menu-page-title">{page === 'settings' ? 'Настройки' : 'Статистика'}</h1>
            {page === 'settings' ? <div className="menu-options">
              <SoundOption name="sound" label="Звуковые эффекты" enabled={audio.effects} onToggle={audio.toggleEffects}/>
              <SoundOption name="note" label="Музыка и звуки природы" enabled={audio.ambience} onToggle={audio.toggleAmbience}/>
            </div> : <SaveStats state={state}/>}
            <button type="button" className="pixel-button menu-back" ref={primary} onClick={() => setPage('home')}><Glyph name="back"/>Назад</button>
          </>}
        </div>
      </div>
    </div>
  </main>;
}
