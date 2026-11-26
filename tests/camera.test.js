import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confine, initialCamera, transformAround, worldPoint, zoomRange } from '../src/camera.js';
import { PLOTS } from '../src/game.js';
import { WORLD } from '../src/terrain.js';

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 780 };

test('the starting orchard is visible on a wide and a narrow screen', () => {
  for (const viewport of [desktop, mobile]) {
    const camera = initialCamera(viewport);
    const topLeft = worldPoint(camera, { x: 0, y: 0 }, viewport);
    const bottomRight = worldPoint(camera, { x: viewport.width, y: viewport.height }, viewport);
    const orchard = PLOTS[0];
    assert.ok(topLeft.x < orchard.x && topLeft.y < orchard.y);
    assert.ok(bottomRight.x > orchard.x + orchard.width && bottomRight.y > orchard.y + orchard.height);
  }
});

test('zoom preserves the map point under the pointer and panning projects exact coordinates', () => {
  const start = initialCamera(desktop);
  const screenPoint = { x: 827.5, y: 351.25 };
  const expected = worldPoint(start, screenPoint, desktop);
  const zoomed = transformAround(start, start.zoom * 1.3, screenPoint, screenPoint, desktop);
  const zoomedPoint = worldPoint(zoomed, screenPoint, desktop);
  assert.ok(Math.abs(expected.x - zoomedPoint.x) < 1e-8 && Math.abs(expected.y - zoomedPoint.y) < 1e-8);
  const dragged = { x: screenPoint.x + 100.5, y: screenPoint.y + 81.3 };
  const panned = transformAround(zoomed, zoomed.zoom, screenPoint, dragged, desktop);
  const actual = worldPoint(panned, dragged, desktop);
  assert.ok(Math.abs(expected.x - actual.x) < 1e-8 && Math.abs(expected.y - actual.y) < 1e-8);
});

test('camera stays within the world instead of revealing unpainted screen edges', () => {
  assert.ok(WORLD.x < 0 && WORLD.y < 0 && WORLD.x + WORLD.width > 4800 && WORLD.y + WORLD.height > 3000);
  const zoom = zoomRange(desktop.width, desktop.height).min;
  const camera = confine({ x: -5000, y: -5000, zoom }, desktop);
  const { x, y } = worldPoint(camera, { x: 0, y: 0 }, desktop);
  assert.ok(x >= WORLD.x - 1e-8);
  assert.ok(Math.abs(y - WORLD.y) < 1e-8);
});


test('the upgrade panorama uses its own canvas bounds and keeps the anchor when zooming', () => {
  const graphBounds = { width: 1120, height: 800 };
  const view = { width: 400, height: 290 };
  const lo = zoomRange(view.width, view.height, graphBounds, 'contain').min;
  assert.equal(lo, 400 / 1120);
  const camera = { x: 560, y: 400, zoom: 1 };
  const point = { x: 173, y: 123 };
  const next = transformAround(camera, 1.5, point, point, view, graphBounds);
  assert.deepEqual(worldPoint(next, point, view), worldPoint(camera, point, view));
});
