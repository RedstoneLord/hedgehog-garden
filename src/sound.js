import { useEffect, useRef, useState } from 'react';

const setting = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const notes = [67, 71, 74, 76, 74, 71, 69, 67, 64, 67, 71, 74, 72, 69, 67, 62];
const bass = [43, 43, 45, 45, 40, 40, 38, 38];

function play(context, midi, time, length, volume, type = 'triangle') {
  const wave = context.createOscillator();
  const gain = context.createGain();
  wave.type = type;
  wave.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  gain.gain.setValueAtTime(.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + .018);
  gain.gain.exponentialRampToValueAtTime(.0001, time + length);
  wave.connect(gain).connect(context.destination);
  wave.start(time);
  wave.stop(time + length);
}

export function useGameAudio(state) {
  const [effects, setEffects] = useState(() => setting('orchard-sounds', true));
  const [music, setMusic] = useState(() => setting('orchard-music', false));
  const [ready, setReady] = useState(false);
  const context = useRef(null);
  const sight = useRef({ guide: state.guide?.serial, notice: state.notice?.serial, customers: new Set(), fruit: state.trees.map(tree => tree.pulse?.id).join(',') });
  useEffect(() => {
    function unlock() {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!Audio) return;
      context.current ??= new Audio();
      context.current.resume().then(() => setReady(true)).catch(() => {});
    }
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  useEffect(() => {
    if (!ready || !effects) return;
    const click = event => {
      if (!event.target.closest?.('button:not([disabled]), select')) return;
      play(context.current, 63, context.current.currentTime, .07, .024, 'square');
    };
    window.addEventListener('click', click);
    return () => window.removeEventListener('click', click);
  }, [effects, ready]);
  useEffect(() => {
    const prev = sight.current;
    const customers = new Set(state.trade.stalls.flatMap(stall => stall.customers.filter(customer => customer.phase === 'queue').map(customer => customer.id)));
    const fruit = state.trees.map(tree => tree.pulse?.id).join(',');
    sight.current = { customers, fruit, notice: state.notice?.serial, guide: state.guide?.serial };
    if (!ready || !effects || document.hidden) return;
    const engine = context.current, now = engine.currentTime;
    let sounds;
    if (state.guide && state.guide.serial !== prev.guide || [...customers].some(id => !prev.customers.has(id))) sounds = [60, 64, 62, 67, 64];
    else if (state.notice && state.notice.serial !== prev.notice) sounds = {
      coin: [72, 79, 84], water: [79, 74, 69], apple: [65, 77], berry: [65, 77], jar: [73, 78], fuel: [46, 50, 53],
    }[state.notice.symbol] ?? [66, 69];
    else if (fruit !== prev.fruit) sounds = [67, 74];
    sounds?.forEach((note, i) => play(engine, note, now + i * .078, .13, i ? .035 : .045));
  }, [state, effects, ready]);
  useEffect(() => {
    if (!ready || !music) return;
    let step = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const engine = context.current, time = engine.currentTime;
      if (step % 4 === 0) play(engine, bass[(step / 4) % bass.length], time, .76, .024);
      play(engine, notes[step++ % notes.length], time, .36, .018);
    }, 490);
    return () => clearInterval(timer);
  }, [music, ready]);
  function toggle(key, value, setter) {
    setter(!value);
    try { localStorage.setItem(key, JSON.stringify(!value)); } catch { /* Optional preferences. */ }
  }
  return { effects, music, toggleEffects: () => toggle('orchard-sounds', effects, setEffects),
    toggleMusic: () => toggle('orchard-music', music, setMusic) };
}
