import { useCallback, useEffect, useRef, useState } from 'react';
import { Glyph } from './art.jsx';
import { between, confine, transformAround, worldPoint, zoomRange } from './camera.js';

const midpoint = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const separation = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);
const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export function usePanorama({ bounds, initial, fit = 'cover', onHover, onDrag, onEnter }) {
  const viewport = useRef(null);
  const [size, setSize] = useState(() => ({ width: globalThis.innerWidth || 1440, height: globalThis.innerHeight || 900 }));
  const [camera, setCamera] = useState(() => initial(size));
  const contacts = useRef(new Map());
  const moved = useRef(false);
  const wheelAction = useRef(null);
  const limits = zoomRange(size.width, size.height, bounds, fit);
  const center = { x: size.width / 2, y: size.height / 2 };
  const local = event => {
    const rect = viewport.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const toWorld = event => worldPoint(camera, local(event), size);
  const zoomAt = (factor, point = center) => setCamera(current => transformAround(current, between(current.zoom * factor, limits.min, limits.max), point, point, size, bounds));
  const focus = useCallback(point => setCamera(current => confine({ ...current, ...point }, size, bounds)), [size, bounds]);
  wheelAction.current = event => {
    event.preventDefault();
    zoomAt(Math.exp(-between(event.deltaY, -175, 175) * .0017), local(event));
  };

  useEffect(() => {
    const node = viewport.current;
    let measured = false;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const next = { width, height };
      setSize(next);
      const { min, max } = zoomRange(width, height, bounds, fit);
      if (!measured) setCamera(initial(next));
      else setCamera(current => confine({ ...current, zoom: between(current.zoom, min, max) }, next, bounds));
      measured = true;
    });
    observer.observe(node);
    const wheel = event => wheelAction.current(event);
    node.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); node.removeEventListener('wheel', wheel); };
  }, [bounds, fit, initial]);

  function pointerDown(event) {
    if (event.button > 0) return;
    if (!contacts.current.size) moved.current = false;
    contacts.current.set(event.pointerId, local(event));
    if (contacts.current.size > 1) moved.current = true;
  }

  function pointerMove(event) {
    const point = local(event);
    const previous = contacts.current.get(event.pointerId);
    if (!previous || (!moved.current && separation([point, previous]) < 5)) {
      if (event.pointerType === 'mouse') onHover?.(toWorld(event));
      return;
    }
    moved.current = true;
    const before = [...contacts.current.values()];
    contacts.current.set(event.pointerId, point);
    const after = [...contacts.current.values()];
    const node = viewport.current;
    if (!node.hasPointerCapture(event.pointerId)) node.setPointerCapture(event.pointerId);
    onDrag?.();
    if (after.length === 2) {
      const factor = separation(after) / Math.max(1, separation(before));
      setCamera(current => transformAround(current, between(current.zoom * factor, limits.min, limits.max), midpoint(before), midpoint(after), size, bounds));
    } else if (after.length === 1) {
      setCamera(current => transformAround(current, current.zoom, previous, point, size, bounds));
    }
  }

  const pointerUp = event => contacts.current.delete(event.pointerId);
  function keyDown(event) {
    if (event.target !== viewport.current) return;
    if (Object.hasOwn(directions, event.key)) {
      event.preventDefault();
      const [x, y] = directions[event.key];
      setCamera(current => confine({ ...current, x: current.x + x * 95 / current.zoom, y: current.y + y * 95 / current.zoom }, size, bounds));
    } else if (event.key === '+' || event.key === '=') zoomAt(1.25);
    else if (event.key === '-') zoomAt(.8);
    else if (event.key === 'Enter') onEnter?.(camera);
  }

  return {
    surface: {
      ref: viewport, tabIndex: 0, onPointerDown: pointerDown, onPointerMove: pointerMove,
      onPointerUp: pointerUp, onPointerCancel: pointerUp, onLostPointerCapture: pointerUp, onKeyDown: keyDown,
      onPointerLeave: () => { onDrag?.(); if (!moved.current) contacts.current.clear(); },
    },
    scene: { width: bounds.width, height: bounds.height, transform: `translate(${center.x - camera.x * camera.zoom}px, ${center.y - camera.y * camera.zoom}px) scale(${camera.zoom})` },
    dragged: event => moved.current && event.detail !== 0,
    toWorld, centerPoint: camera, zoom: camera.zoom, zoomAt, reset: () => setCamera(initial(size)),
    focus,
  };
}

export function PanoramaControls({ panorama, label, resetLabel, children }) {
  return <nav className="camera-controls" aria-label={`Масштаб и положение: ${label}`}>
    <button type="button" className="pixel-button square" aria-label="Отдалить" onClick={() => panorama.zoomAt(.8)}><Glyph name="minus"/></button>
    <output aria-label={`Масштаб: ${label}`}>{Math.round(panorama.zoom * 100)}%</output>
    <button type="button" className="pixel-button square" aria-label="Приблизить" onClick={() => panorama.zoomAt(1.25)}><Glyph name="plus"/></button>
    <button type="button" className="pixel-button square center-control" aria-label={resetLabel} onClick={panorama.reset}><Glyph name="center"/></button>
    {children}
  </nav>;
}
