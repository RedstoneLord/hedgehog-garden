import { useEffect, useRef, useState } from 'react';
import { Glyph, HedgeSprite } from './art.jsx';
import { GUIDE } from './game.js';

export function GardenGoalCue({ goal, count, onOpen }) {
  return <button type="button" className="pixel-window garden-goal-cue" onClick={onOpen} aria-label={`Открыть цели. ${goal.title}`}>
    <HedgeSprite hedge={GUIDE}/>
    <span><strong>{goal.title}</strong>{goal.progress && <small>{goal.progress}</small>}</span>
    <span className="garden-goal-count"><Glyph name="pin"/> {count}</span>
  </button>;
}

export function GardenGoalsScreen({ goals, onNavigate, onClose, pinned, onPin }) {
  const dialog = useRef(null);
  const [selection, select] = useState(null);
  const selected = goals.find(goal => goal.id === selection) ?? goals[0];
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);
  return <dialog className="game-screen garden-goals-screen" ref={dialog} aria-labelledby="garden-goals-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="screen-header">
      <h2 id="garden-goals-title"><Glyph name="pin"/> Цели сада</h2>
      <button type="button" className="pixel-button" onClick={onClose}><Glyph name="back"/> Карта</button>
    </header>
    <div className="garden-goals-body">
      <div className="pixel-window goals-speaker">
        <HedgeSprite hedge={GUIDE}/>
        <div><h3>Картошка</h3><p>Вот куда можно двигаться дальше. Выбирай, за что взяться.</p></div>
        <button type="button" className="pixel-button mini" aria-pressed={pinned} onClick={onPin}>{pinned ? 'Скрыть цель на карте' : 'Показать цель на карте'}</button>
      </div>
      <div className="garden-goals-layout">
        <nav className="garden-goal-list" aria-label="Доступные цели">
          {goals.map(goal => <button type="button" key={goal.id} className="pixel-button" aria-pressed={selected?.id === goal.id} onClick={() => select(goal.id)}>
            <span>{goal.title}</span>{goal.progress && <small>{goal.progress}</small>}
          </button>)}
        </nav>
        {selected && <section className="pixel-window goal-details">
          <h3>{selected.title}</h3>
          {selected.progress && <strong>{selected.progress}</strong>}
          <p>{selected.text}</p>
          {selected.action && <button type="button" className="pixel-button" onClick={() => onNavigate(selected.action)}>
            <Glyph name="map"/> {selected.action.label}
          </button>}
        </section>}
      </div>
      {!goals.length && <p>Сейчас новых задач нет. Можно развивать сад в своём темпе.</p>}
    </div>
  </dialog>;
}
