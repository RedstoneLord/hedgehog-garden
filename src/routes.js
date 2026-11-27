import { fenceSegments, PIXEL, terrainKind, TRADE_ROADS, WORLD } from './terrain.js';

const CELL = 24;
const columns = WORLD.width / CELL;
const rows = WORLD.height / CELL;
const roadSpeed = 1.42;
const steps = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const surface = new Uint8Array(columns * rows);
const edges = new Map();
const cache = new Map();
const roadAccess = new Map();
const cellLinks = new Map();
const CACHE_SIZE = 4096;
const pointKey = ({ x, y }) => `${x},${y}`;

function remember(cache, key, value) {
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cellPoint = id => ({ x: WORLD.x + ((id % columns) + .5) * CELL, y: WORLD.y + (Math.floor(id / columns) + .5) * CELL });
const onMap = ({ x, y }) => x >= WORLD.x && y >= WORLD.y && x < WORLD.x + WORLD.width && y < WORLD.y + WORLD.height;

function lineCost(from, to) {
  const length = distance(from, to);
  const samples = Math.max(1, Math.ceil(length / (PIXEL / 2)));
  let cost = 0;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const kind = terrainKind({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    if (kind === 'river') return Infinity;
    const weight = i === 0 || i === samples ? .5 : 1;
    cost += weight / (kind === 'road' ? roadSpeed : 1);
  }
  return cost * length / samples;
}

export const canWalkStraight = (from, to) => Number.isFinite(lineCost(from, to));

const roadNodes = new Map();
const roadSegments = [];
function roadNode(x, y) {
  const key = `${x},${y}`;
  if (!roadNodes.has(key)) roadNodes.set(key, { x, y, neighbors: [] });
  return roadNodes.get(key);
}
for (const path of TRADE_ROADS) {
  const nodes = path.map(([x, y]) => roadNode(x, y));
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1], b = nodes[i];
    const cost = lineCost(a, b);
    if (!Number.isFinite(cost)) continue;
    a.neighbors.push({ node: b, cost });
    b.neighbors.push({ node: a, cost });
    roadSegments.push({ a, b });
  }
}

function nearestRoad(point) {
  const key = pointKey(point);
  if (roadAccess.has(key)) return roadAccess.get(key);
  let nearest = null;
  let best = 540;
  for (const segment of roadSegments) {
    const { a, b } = segment;
    const dx = b.x - a.x, dy = b.y - a.y;
    const fraction = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
    const entry = { x: a.x + fraction * dx, y: a.y + fraction * dy };
    const gap = distance(point, entry);
    if (gap >= best || !onMap(entry) || terrainKind(entry) !== 'road' || !canWalkStraight(point, entry)) continue;
    nearest = { entry, segment };
    best = gap;
  }
  return remember(roadAccess, key, nearest);
}

function roadTrip(from, to, direct) {
  const start = nearestRoad(from);
  const end = nearestRoad(to);
  if (!start || !end) return null;
  const pending = [];
  const costs = new Map();
  const previous = new Map();
  const limit = direct * 1.18;
  let best = limit;
  let finish = null;
  let useSameSegment = false;
  const accessCost = lineCost(from, start.entry) + lineCost(end.entry, to);

  if (start.segment === end.segment) {
    const cost = accessCost + lineCost(start.entry, end.entry);
    if (cost <= limit) { best = cost; useSameSegment = true; }
  }
  for (const node of [start.segment.a, start.segment.b]) {
    if (!onMap(node)) continue;
    const cost = lineCost(start.entry, node);
    costs.set(node, cost);
    push(pending, { node, priority: cost });
  }
  while (pending.length) {
    const { node, priority: cost } = pop(pending);
    if (cost + accessCost >= best) break;
    if (cost !== costs.get(node)) continue;
    if (node === end.segment.a || node === end.segment.b) {
      const total = cost + accessCost + lineCost(node, end.entry);
      if (total < best) { best = total; finish = node; useSameSegment = false; }
    }
    for (const { node: next, cost: travel } of node.neighbors) {
      const proposed = cost + travel;
      if (!onMap(next) || proposed >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, proposed);
      previous.set(next, node);
      push(pending, { node:next, priority:proposed });
    }
  }
  if (!finish && !useSameSegment) return null;
  const waypoints = [];
  for (let node = finish; node; node = previous.get(node)) waypoints.push({ x:node.x, y:node.y });
  const points = [start.entry, ...waypoints.reverse(), end.entry, to]
    .filter((point, i, all) => distance(point, all[i - 1] ?? from) > 0);
  return { cost:best, points };
}

function cellSurface(id) {
  if (!surface[id]) surface[id] = terrainKind(cellPoint(id)) === 'river' ? 2 : 1;
  return surface[id];
}

function edgeCost(a, b) {
  const key = Math.min(a, b) * surface.length + Math.max(a, b);
  if (!edges.has(key)) edges.set(key, lineCost(cellPoint(a), cellPoint(b)));
  return edges.get(key);
}

function push(queue, item) {
  let i = queue.length;
  queue.push(item);
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (queue[parent].priority <= item.priority) break;
    queue[i] = queue[parent];
    i = parent;
  }
  queue[i] = item;
}

function pop(queue) {
  const first = queue[0];
  const last = queue.pop();
  if (!queue.length) return first;
  let i = 0;
  while (i * 2 + 1 < queue.length) {
    const left = i * 2 + 1;
    const right = left + 1;
    const next = right < queue.length && queue[right].priority < queue[left].priority ? right : left;
    if (queue[next].priority >= last.priority) break;
    queue[i] = queue[next];
    i = next;
  }
  queue[i] = last;
  return first;
}

function connect(point) {
  const key = pointKey(point);
  if (cellLinks.has(key)) return cellLinks.get(key);
  const x = Math.floor((point.x - WORLD.x) / CELL);
  const y = Math.floor((point.y - WORLD.y) / CELL);
  const links = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (x + dx < 0 || x + dx >= columns || y + dy < 0 || y + dy >= rows) continue;
    const id = (y + dy) * columns + x + dx;
    if (cellSurface(id) !== 1) continue;
    const cost = lineCost(point, cellPoint(id));
    if (Number.isFinite(cost)) links.push({ id, cost });
  }
  return remember(cellLinks, key, links);
}

function compactRoute(from, points) {
  const compressed = [];
  let start = from;
  for (let i = 0; i < points.length;) {
    let last = i;
    let cost = lineCost(start, points[i]);
    for (let next = i + 1; next < Math.min(i + 10, points.length); next++) {
      cost += lineCost(points[next - 1], points[next]);
      if (lineCost(start, points[next]) <= cost * 1.025) last = next;
    }
    start = points[last];
    compressed.push(start);
    i = last + 1;
  }
  return compressed;
}

function baseRoute(from, to) {
  if (!onMap(from) || !onMap(to) || terrainKind(from) === 'river' || terrainKind(to) === 'river') return null;
  const key = `${pointKey(from)}:${pointKey(to)}`;
  if (cache.has(key)) return cache.get(key);
  const destination = { x: to.x, y: to.y };
  const direct = lineCost(from, destination);
  if (distance(from, destination) < 72 && Number.isFinite(direct)) {
    return remember(cache, key, { cost: direct, points: [destination] });
  }
  const road = distance(from, destination) >= 144 && roadTrip(from, destination, direct);
  if (road) return remember(cache, key, road);
  const targets = new Map(connect(to).map(({ id, cost }) => [id, cost]));
  const pending = [];
  const scores = new Map();
  const parents = new Map();
  const estimate = id => distance(cellPoint(id), to) / roadSpeed;
  for (const { id, cost } of connect(from)) {
    scores.set(id, cost);
    parents.set(id, -1);
    push(pending, { id, cost, priority: cost + estimate(id) });
  }

  let best = direct;
  let finish = -1;
  while (pending.length) {
    const { id, cost, priority } = pop(pending);
    if (priority >= best) break;
    if (scores.get(id) !== cost) continue;
    if (targets.has(id) && cost + targets.get(id) < best) {
      best = cost + targets.get(id);
      finish = id;
    }
    const x = id % columns;
    const y = Math.floor(id / columns);
    for (const [dx, dy] of steps) {
      if (x + dx < 0 || x + dx >= columns || y + dy < 0 || y + dy >= rows) continue;
      const next = (y + dy) * columns + x + dx;
      if (cellSurface(next) !== 1) continue;
      const candidate = cost + edgeCost(id, next);
      if (candidate >= (scores.get(next) ?? Infinity)) continue;
      scores.set(next, candidate);
      parents.set(next, id);
      push(pending, { id: next, cost: candidate, priority: candidate + estimate(next) });
    }
  }
  if (!Number.isFinite(best)) return remember(cache, key, null);
  const points = [destination];
  for (let id = finish; id !== -1; id = parents.get(id)) points.push(cellPoint(id));
  const route = { cost: best, points: compactRoute(from, points.reverse()) };
  return remember(cache, key, route);
}

function projectRoad(point, road) {
  const { from, to } = road;
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy)));
  return { x: from.x + t * dx, y: from.y + t * dy };
}
export const roadGap = (road, point) => distance(point, projectRoad(point, road));
export function closestRoadSegment(point) {
  let best = Infinity;
  let result = null;
  for (const path of TRADE_ROADS) {
    for (let i = 1; i < path.length; i++) {
      const [x, y] = path[i - 1];
      const [endX, endY] = path[i];
      const road = { from: { x, y }, to: { x: endX, y: endY } };
      const gap = roadGap(road, point);
      if (gap < best) {
        best = gap;
        result = road;
      }
    }
  }
  return best < 40 ? result : null;
}

export function findRoute(from, to, roads = []) {
  let best = baseRoute(from, to);
  if (!best || !roads.length) return best;
  for (const road of roads) {
    const entry = projectRoad(from, road);
    const exit = projectRoad(to, road);
    const a = distance(from, entry), b = distance(to, exit);
    if (a > 600 || b > 600) continue;
    const travel = distance(entry, exit) / (road.level === 2 ? 1.85 : roadSpeed);
    if (a / 1.85 + b / 1.85 + travel >= best.cost) continue;
    const enter = baseRoute(from, entry), leave = baseRoute(exit, to);
    if (!enter || !leave) continue;
    const cost = enter.cost + travel + leave.cost;
    if (cost < best.cost) best = { cost, points: [...enter.points, exit, ...leave.points] };
  }
  return best;
}

export function followRoute(actor, route, speed, seconds, roads = []) {
  let remaining = speed * seconds;
  while (remaining > 0 && route.index < route.points.length) {
    const point = route.points[route.index];
    const length = distance(actor, point);
    const custom = roads.reduce((level, road) => roadGap(road, actor) < 16 ? Math.max(level, road.level) : level, 0);
    const multiplier = custom === 2 ? 1.85 : custom === 1 || terrainKind(actor) === 'road' ? roadSpeed : 1;
    const travel = Math.min(length, remaining * multiplier);
    if (length) {
      if (Math.abs(point.x - actor.x) > 1) actor.left = point.x < actor.x;
      actor.x += (point.x - actor.x) * travel / length;
      actor.y += (point.y - actor.y) * travel / length;
    }
    if (travel < length) return false;
    actor.x = point.x;
    actor.y = point.y;
    remaining -= travel / multiplier;
    route.index += 1;
  }
  return route.index === route.points.length;
}

export function routeTo(actor, target, planned, roads = []) {
  planned ??= findRoute(actor, target, roads);
  return planned ? { points: planned.points.map(({ x, y }) => ({ x, y })), index: 0, x: target.x, y: target.y } : null;
}

const MAX_DRIVEWAY = 230;
let freightNetwork;

function freightGraph(roads) {
  const signature = roads.map(({ from, to, level }) => `${pointKey(from)}:${pointKey(to)}:${level}`).join(';');
  if (freightNetwork?.signature === signature) return freightNetwork;
  const segments = TRADE_ROADS.flatMap(road => road.slice(1).map((to, index) => {
    const from = road[index];
    return { from: { x: from[0], y: from[1] }, to: { x: to[0], y: to[1] }, level: 1 };
  })).concat(roads);
  const vertices = new Map();
  const node = point => {
    const key = `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`;
    if (!vertices.has(key)) vertices.set(key, { ...point, legs: [] });
    return vertices.get(key);
  };
  const split = segments.map(segment => ({ ...segment, stops: [node(segment.from), node(segment.to)] }));
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const delta = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  for (const [i, a] of split.entries()) {
    const ad = delta(a.to, a.from);
    for (const b of split.slice(i + 1)) {
      const bd = delta(b.to, b.from);
      const denominator = cross(ad, bd);
      if (Math.abs(denominator) > .0001) {
        const gap = delta(b.from, a.from);
        const t = cross(gap, bd) / denominator;
        const u = cross(gap, ad) / denominator;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          const join = node({ x: a.from.x + t * ad.x, y: a.from.y + t * ad.y });
          a.stops.push(join);
          b.stops.push(join);
        }
      }
      for (const [source, target] of [[a,b],[b,a]]) for (const end of [source.from, source.to]) {
        const contact = projectRoad(end, target);
        if (distance(end, contact) > 18 || !canWalkStraight(end, contact)) continue;
        const from = node(end), to = node(contact);
        target.stops.push(to);
        if (from === to) continue;
        const cost = distance(from, to);
        from.legs.push({ to, cost });
        to.legs.push({ to: from, cost });
      }
    }
  }
  for (const segment of split) {
    segment.speed = segment.level === 2 ? 1.85 : roadSpeed;
    segment.stops = [...new Set(segment.stops)].sort((a, b) => distance(segment.from, a) - distance(segment.from, b));
    for (let i = 1; i < segment.stops.length; i++) {
      const from = segment.stops[i - 1], to = segment.stops[i];
      const cost = distance(from, to) / segment.speed;
      from.legs.push({ to, cost });
      to.legs.push({ to: from, cost });
    }
  }
  freightNetwork = { signature, segments: split, routes: new Map() };
  return freightNetwork;
}

export function findFreightRoute(from, to, roads = []) {
  if (distance(from, to) <= 40 && canWalkStraight(from, to)) return { cost: distance(from,to), points: [to] };
  const network = freightGraph(roads);
  const key = `${pointKey(from)}:${pointKey(to)}`;
  if (network.routes.has(key)) return network.routes.get(key);
  const access = point => network.segments.flatMap(segment => {
    const approach = projectRoad(point, segment);
    const gap = distance(approach, point);
    if (gap > MAX_DRIVEWAY || !canWalkStraight(point, approach)) return [];
    const index = segment.stops.findIndex(stop => distance(segment.from, stop) >= distance(segment.from, approach));
    const stops = index <= 0 ? [segment.stops[index === 0 ? 0 : segment.stops.length - 1]] : segment.stops.slice(index - 1, index + 1);
    return [{ segment, approach, gap, stops }];
  }).sort((a,b) => a.gap - b.gap).slice(0, 5);
  const entries = access(from), exits = access(to);
  const queue = [], parents = new Map(), starts = new Map(), targets = new Map(), scores = new Map();
  let result = null;
  for (const e of entries) for (const x of exits) {
    if (e.segment !== x.segment) continue;
    const cost = e.gap + x.gap + distance(e.approach,x.approach) / e.segment.speed;
    if (!result || cost < result.cost) result = { cost, points: [e.approach, x.approach, to] };
  }
  for (const exit of exits) for (const stop of exit.stops) {
    const cost = exit.gap + distance(stop,exit.approach) / exit.segment.speed;
    if (!targets.has(stop) || cost < targets.get(stop).cost) targets.set(stop, { cost, approach: exit.approach });
  }
  for (const entry of entries) for (const stop of entry.stops) {
    const cost = entry.gap + distance(stop,entry.approach) / entry.segment.speed;
    if (cost >= (scores.get(stop) ?? Infinity)) continue;
    starts.set(stop, entry.approach);
    scores.set(stop, cost);
    push(queue, { id: stop, priority: cost, cost });
  }
  while (queue.length) {
    const { id, cost } = pop(queue);
    if (cost !== scores.get(id)) continue;
    if (result && cost >= result.cost) break;
    const target = targets.get(id);
    if (target && (!result || cost + target.cost < result.cost)) {
      const points = [to, target.approach, id];
      let first = id;
      while (parents.has(first)) { first = parents.get(first); points.push(first); }
      points.push(starts.get(first));
      result = { cost: cost + target.cost, points: points.reverse() };
    }
    for (const leg of id.legs) {
      const next = cost + leg.cost;
      if (next >= (scores.get(leg.to) ?? Infinity)) continue;
      scores.set(leg.to, next);
      parents.set(leg.to, id);
      push(queue, { id: leg.to, priority: next, cost: next });
    }
  }
  if (result) result.points = result.points.map(({ x, y }) => ({ x, y }));
  return remember(network.routes, key, result);
}

const fenceCache = new Map();

export function findGardenRoute(from, to, roads, plots) {
  const regular = findRoute(from, to, roads);
  if (!regular || !plots.length) return regular;
  const fences = plots.map(plot => {
    const { x, y, width, height } = plot;
    const key = `${x},${y},${width},${height}`;
    return fenceCache.get(key) ?? remember(fenceCache, key, fenceSegments(plot));
  });
  const clear = (a,b) => fences.every(segments => segments.every(([p,q]) => {
    const vertical = p.x === q.x;
    const start = vertical ? a.x : a.y, end = vertical ? b.x : b.y;
    const boundary = vertical ? p.x : p.y;
    if (start === end || (start - boundary) * (end - boundary) > 0) return true;
    const mix = (boundary - start) / (end - start);
    const at = vertical ? a.y + mix * (b.y - a.y) : a.x + mix * (b.x - a.x);
    return at < (vertical ? p.y : p.x) || at > (vertical ? q.y : q.x);
  }));
  if (regular.points.every((point, i) => clear(i ? regular.points[i-1] : from,point))) return regular;
  const bounds = [from, ...regular.points];
  const minX = Math.min(...bounds.map(p=>p.x)), maxX = Math.max(...bounds.map(p=>p.x));
  const minY = Math.min(...bounds.map(p=>p.y)), maxY = Math.max(...bounds.map(p=>p.y));
  const relevant = plots.filter(({ x,y,width,height }) => x < maxX+120 && x+width > minX-120 && y < maxY+120 && y+height > minY-120);
  const nodes = [from, to, ...regular.points.slice(0,-1), ...relevant.flatMap(({ x, y, width:w, height:h }) => [
    { x:x-16, y:y-16 }, { x:x+w+16, y:y-16 }, { x:x-16, y:y+h+16 }, { x:x+w+16, y:y+h+16 },
    { x:x+w/2, y }, { x:x+w/2, y:y+h }, { x, y:y+h/2 }, { x:x+w, y:y+h/2 },
  ])];
  const scores = Array(nodes.length).fill(Infinity), parents = [], queue = [];
  scores[0]=0;
  push(queue, { id:0, priority:0 });
  while (queue.length) {
    const { id, priority } = pop(queue);
    if (priority !== scores[id]) continue;
    if (id === 1) {
      const points = [to];
      for (let previous=parents[id]; previous; previous=parents[previous]) points.push(nodes[previous]);
      return { points:points.reverse(), cost:priority };
    }
    for (let next=1; next<nodes.length; next++) {
      if (next === id || scores[id] + distance(nodes[id],nodes[next]) / 1.85 >= scores[next]
        || !clear(nodes[id],nodes[next])) continue;
      const cost = scores[id] + lineCost(nodes[id],nodes[next]);
      if (cost >= scores[next]) continue;
      scores[next]=cost;
      parents[next]=id;
      push(queue, { id:next, priority:cost });
    }
  }
  return null;
}
