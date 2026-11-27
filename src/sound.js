import { useEffect, useRef, useState } from 'react';
import ambienceUrl from './audio/orchard-ambience.mp3?inline';
import musicUrl from './audio/forget-me-not.mp3?inline';
import chimeUrl from './audio/game-chime.wav?inline';
import tapUrl from './audio/tap.mp3?inline';
import basketUrl from './audio/basket.mp3?inline';
import harvestAUrl from './audio/harvest-a.mp3?inline';
import harvestBUrl from './audio/harvest-b.mp3?inline';
import harvestCUrl from './audio/harvest-c.mp3?inline';
import waterUrl from './audio/water.mp3?inline';
import coinsUrl from './audio/coins.mp3?inline';
import chirpUrl from './audio/chirp.mp3?inline';

const backgroundTracks = [
  { url: ambienceUrl, volume: .16 },
  { url: musicUrl, volume: .10 },
];

const samples = {
  tap: { clips: [tapUrl], volume: .22, gap: 65, chime: { volume: .085, rate: 1.12 } },
  basket: { clips: [basketUrl], volume: .33, gap: 550, chime: { volume: .13, rate: .84 } },
  harvest: { clips: [harvestAUrl, harvestBUrl, harvestCUrl], volume: .4, gap: 275, chime: { volume: .13, rate: 1 } },
  water: { clips: [waterUrl], volume: .45, gap: 500, chime: { volume: .11, rate: 1.26 } },
  coins: { clips: [coinsUrl], volume: .53, gap: 260, chime: { volume: .19, rate: 1.5 } },
  chirp: { clips: [chirpUrl], volume: .34, gap: 720 },
};

function setting(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function decodeSample(engine, url) {
  if (!engine.decoded.has(url)) {
    const bytes = Uint8Array.from(atob(url.split(',')[1]), char => char.charCodeAt(0));
    engine.decoded.set(url, engine.decodeAudioData(bytes.buffer));
  }
  return engine.decoded.get(url);
}

function startVoice(engine, buffer, { volume, rate }, when) {
  const source = engine.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const gain = engine.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(engine.destination);
  source.start(when);
}

function playSample(engine, name) {
  if (!engine || engine.state !== 'running' || document.hidden) return;
  const sample = samples[name];
  const clip = sample.clips[Math.floor(Math.random() * sample.clips.length)];
  const accent = sample.chime ? decodeSample(engine, chimeUrl).catch(() => null) : null;
  Promise.all([decodeSample(engine, clip), accent]).then(([recording, chime]) => {
    if (engine.state !== 'running' || document.hidden || engine.muted) return;
    const at = performance.now();
    if (at - (engine.lastPlayed.get(name) ?? -Infinity) < sample.gap) return;
    engine.lastPlayed.set(name, at);
    const when = engine.currentTime + .008;
    startVoice(engine, recording, { volume: sample.volume, rate: .94 + Math.random() * .12 }, when);
    if (chime && at - (engine.lastPlayed.get('chime') ?? -Infinity) >= 70) {
      engine.lastPlayed.set('chime', at);
      startVoice(engine, chime, sample.chime, when + .018);
    }
  }).catch(() => {});
}

const visitorIds = state => new Set(state.trade.stalls.flatMap(stall =>
  stall.customers.filter(customer => customer.phase === 'queue').map(customer => customer.id)));

export function useGameAudio(state) {
  const [effects, setEffects] = useState(() => setting('orchard-sounds', true));
  const [ambience, setAmbience] = useState(() => setting('orchard-music', false));
  const context = useRef(null);
  const background = useRef([]);
  const seen = useRef(null);

  function syncAmbience(enabled) {
    if (!enabled || document.hidden) {
      for (const audio of background.current) audio.pause();
      return;
    }
    if (!background.current.length) {
      background.current = backgroundTracks.map(({ url, volume }) => {
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = volume;
        return audio;
      });
    }
    for (const audio of background.current) {
      if (audio.paused) audio.play().catch(() => {});
    }
  }

  useEffect(() => {
    function activate() {
      if (effects) {
        const AudioEngine = window.AudioContext ?? window.webkitAudioContext;
        if (AudioEngine && !context.current) {
          const engine = new AudioEngine();
          engine.decoded = new Map();
          engine.lastPlayed = new Map();
          context.current = engine;
        }
        const engine = context.current;
        if (engine?.state !== 'running') engine?.resume().catch(() => {});
      }
      if (ambience) syncAmbience(true);
    }
    function click(event) {
      activate();
      if (effects && event.target.closest?.('button:not([disabled]):not(.map-item), select')) {
        playSample(context.current, 'tap');
      }
    }
    function visibility() {
      syncAmbience(ambience);
    }
    if (!ambience) syncAmbience(false);
    if (context.current) context.current.muted = !effects;
    window.addEventListener('click', click);
    window.addEventListener('keydown', activate);
    window.addEventListener('pointerup', activate);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('click', click);
      window.removeEventListener('keydown', activate);
      window.removeEventListener('pointerup', activate);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [ambience, effects]);
  useEffect(() => () => {
    for (const audio of background.current) audio.pause();
    context.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    const before = seen.current;
    const visitors = visitorIds(state);
    const harvest = state.trees.reduce((latest, tree) => Math.max(latest, tree.pulse?.id ?? 0), 0);
    const receipt = Math.max(state.basketReceipt?.id ?? 0, before?.receipt ?? 0);
    seen.current = { visitors, harvest, receipt, notice: state.notice?.serial, guide: state.guide?.serial,
      quote: state.quote?.until, coins: state.trade.coins, water: state.trade.canWater };
    if (!before || !effects) return;

    if (state.trade.coins > before.coins) playSample(context.current, 'coins');
    if (state.trade.canWater !== before.water || state.notice?.symbol === 'water' && state.notice.serial !== before.notice) {
      playSample(context.current, 'water');
    }
    if (harvest > before.harvest) playSample(context.current, 'harvest');
    if (receipt > before.receipt) playSample(context.current, 'basket');
    if (state.guide && state.guide.serial !== before.guide || state.quote && state.quote.until !== before.quote
      || [...visitors].some(id => !before.visitors.has(id))) playSample(context.current, 'chirp');
  }, [state, effects]);

  function saveSetting(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Optional preferences. */ }
  }
  function toggleEffects() {
    if (context.current) context.current.muted = effects;
    setEffects(!effects);
    saveSetting('orchard-sounds', !effects);
  }
  function toggleAmbience() {
    setAmbience(!ambience);
    saveSetting('orchard-music', !ambience);
    syncAmbience(!ambience);
  }
  return { effects, ambience, toggleEffects, toggleAmbience };
}
