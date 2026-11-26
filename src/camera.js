import { WORLD } from './terrain.js';

const center = { x: 2370, y: 1493 };
export const between = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function zoomRange(width, height, bounds = WORLD, fit = 'cover') {
  const min = (fit === 'contain' ? Math.min : Math.max)(width / bounds.width, height / bounds.height);
  return { min: Math.max(.04, min), max: Math.max(2.7, min) };
}

export function confine(camera, { width, height }, bounds = WORLD) {
  const halfX = Math.min(width / camera.zoom / 2, bounds.width / 2);
  const halfY = Math.min(height / camera.zoom / 2, bounds.height / 2);
  const left = bounds.x ?? 0;
  const top = bounds.y ?? 0;
  return { ...camera, x: between(camera.x, left + halfX, left + bounds.width - halfX),
    y: between(camera.y, top + halfY, top + bounds.height - halfY) };
}

export function worldPoint(camera, point, size) {
  return { x: camera.x + (point.x - size.width / 2) / camera.zoom, y: camera.y + (point.y - size.height / 2) / camera.zoom };
}

export function transformAround(camera, zoom, previous, next, size, bounds = WORLD) {
  const anchor = worldPoint(camera, previous, size);
  return confine({
    zoom, x: anchor.x - (next.x - size.width / 2) / zoom, y: anchor.y - (next.y - size.height / 2) / zoom,
  }, size, bounds);
}

export function initialCamera(size) {
  const { width, height } = size;
  const desired = width < 650 ? (width - 22) / 620 : (width - 430) / 790;
  const zoom = Math.max(zoomRange(width, height).min, Math.min(desired, 1.5));
  return confine({ ...center, zoom }, size);
}
