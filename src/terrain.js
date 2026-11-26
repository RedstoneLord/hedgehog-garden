export const WORLD = { x: -1200, y: -1272, width: 7200, height: 5184 };
export const OLD_MAP_OFFSET = { x: 1200, y: 750 };
export const PIXEL = 6;
export const TERRAIN_SIZE = { width: WORLD.width / PIXEL, height: WORLD.height / PIXEL };
export const AMBIENT_FRAMES = 8;

const river = [
  [3620, -1320], [3520, -940], [3370, -470], [3260, -80], [3150, 230], [3210, 430], [3280, 620], [3200, 860], [3020, 1060],
  [2835, 1210], [2745, 1380], [2675, 1560], [2740, 1740], [2960, 1870],
  [3140, 2090], [3165, 2290], [3375, 2450], [3660, 2630], [3800, 3030], [3900, 3430], [4120, 3990],
];
const mainRoad = [
  [-1240, 1950], [-620, 1840], [-60, 1810], [260, 1790], [580, 1630], [850, 1520], [1220, 1460], [1550, 1430],
  [1840, 1460], [2075, 1514], [2270, 1529], [2470, 1516], [2650, 1494], [2830, 1445],
  [3040, 1440], [3290, 1510], [3650, 1630], [3950, 1700], [4290, 1670], [4580, 1570], [4870, 1520], [5460, 1460], [6040, 1620],
];
const sideRoad = [[690, 3960], [800, 3520], [940, 3070], [1050, 2630], [1310, 2310], [1540, 2130], [1710, 2030], [1810, 1850], [1900, 1720], [2075, 1514]];
const northRoad = [[2470, 1516], [2410, 1330], [2330, 1190], [2210, 1020], [2180, 830], [2290, 620], [2520, 390], [2500, -70], [2400, -460], [2260, -940], [2180, -1312]];
const ridgeRoad = [[4290, 1670], [4590, 1410], [4820, 1120], [5160, 810], [5470, 590], [6040, 410]];
const riversideRoad = [
  [4290, 1670], [4170, 1830], [3970, 1980], [3750, 2200], [3770, 2440], [3920, 2610],
  [4050, 2860], [4120, 3120], [4230, 3410], [4380, 3660], [4530, 3960],
];
export const TRADE_ROADS = [mainRoad, sideRoad, northRoad, ridgeRoad, riversideRoad];
export const TRADE_GATES = [
  { x: -1195, y: 1942 }, { x: 5995, y: 1608 }, { x: 702, y: 3905 }, { x: 2189, y: -1267 }, { x: 5995, y: 424 },
  { x: 4503, y: 3905 },
];
export const FOREST_CLEARING = { x: 2220, y: 2980, width: 774, height: 520 };
const southwestForestDistance = (x, y) => Math.hypot((x - 2420) / 1220, (y - 3180) / 800);
export function regionAt(x, y) {
  if ((x > 4740 && y < 1510) || (x > 4400 && y < 350) || southwestForestDistance(x, y) < 1) return 'forest';
  if (y > 3000) return 'south';
  if (y < 0) return 'north';
  if (x < 0) return 'west';
  return 'orchards';
}
const bridge = { x: 2707, y: 1479, length: 76, width: 29 };
const crossingLength = Math.hypot(180, 49);
const crossingDirection = { x: 180 / crossingLength, y: -49 / crossingLength };

function toSegments(path) {
  return path.slice(1).map(([x, y], i) => {
    const [startX, startY] = path[i];
    const dx = x - startX;
    const dy = y - startY;
    return { x: startX, y: startY, dx, dy, inverse: 1 / (dx * dx + dy * dy), minX: Math.min(x, startX), maxX: Math.max(x, startX), minY: Math.min(y, startY), maxY: Math.max(y, startY) };
  });
}
const waterSegments = toSegments(river);
const roadSegments = TRADE_ROADS.flatMap(toSegments);

function nearby(x, y, segments, limit) {
  let shortest = limit * limit;
  for (const segment of segments) {
    if (x < segment.minX - limit || x > segment.maxX + limit || y < segment.minY - limit || y > segment.maxY + limit) continue;
    const fraction = Math.max(0, Math.min(1, ((x - segment.x) * segment.dx + (y - segment.y) * segment.dy) * segment.inverse));
    const dx = x - segment.x - fraction * segment.dx;
    const dy = y - segment.y - fraction * segment.dy;
    shortest = Math.min(shortest, dx * dx + dy * dy);
  }
  return Math.sqrt(shortest);
}

function terrainAt(x, y) {
  const water = nearby(x, y, waterSegments, 64);
  const road = nearby(x, y, roadSegments, 31);
  const offsetX = x - bridge.x;
  const offsetY = y - bridge.y;
  let deck = null;
  if (Math.abs(offsetX) < 83 && Math.abs(offsetY) < 49) {
    const along = offsetX * crossingDirection.x + offsetY * crossingDirection.y;
    const across = -offsetX * crossingDirection.y + offsetY * crossingDirection.x;
    if (Math.abs(along) < bridge.length && Math.abs(across) < bridge.width) deck = { along, across };
  }
  const kind = deck ? 'road' : water < 45 ? 'river' : road < 21 ? 'road' : 'ground';
  return { kind, water, road, deck };
}

const terrainCodes = { ground: 1, road: 2, river: 3 };
const terrainNames = ['', 'ground', 'road', 'river'];
const terrainCache = new Uint8Array(TERRAIN_SIZE.width * TERRAIN_SIZE.height);

export function terrainKind(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return 'ground';
  const col = Math.floor(point.x / PIXEL);
  const row = Math.floor(point.y / PIXEL);
  const x = col - WORLD.x / PIXEL;
  const y = row - WORLD.y / PIXEL;
  if (x < 0 || x >= TERRAIN_SIZE.width || y < 0 || y >= TERRAIN_SIZE.height) {
    return terrainAt((col + .5) * PIXEL, (row + .5) * PIXEL).kind;
  }
  const index = y * TERRAIN_SIZE.width + x;
  if (!terrainCache[index]) {
    terrainCache[index] = terrainCodes[terrainAt((col + .5) * PIXEL, (row + .5) * PIXEL).kind];
  }
  return terrainNames[terrainCache[index]];
}

export function riverDistance(point) {
  return nearby(point.x, point.y, waterSegments, 6000);
}

export function roadDistance(point) {
  return nearby(point.x, point.y, roadSegments, 6000);
}

function hash(x, y) {
  let value = Math.imul(x + 137, 0x27d4eb2d) ^ Math.imul(y - 71, 0x165667b1);
  value = Math.imul(value ^ (value >>> 15), 0x85ebca77);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967296;
}

function field(x, y, scale) {
  const i = Math.floor(x / scale);
  const j = Math.floor(y / scale);
  let u = x / scale - i;
  let v = y / scale - j;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  const upper = hash(i, j) * (1 - u) + hash(i + 1, j) * u;
  const lower = hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u;
  return upper * (1 - v) + lower * v;
}

const grass = ['#536a4e', '#637a51', '#6c8654', '#749157', '#809b5c', '#8ba562', '#96ac68', '#a3b574'];
const biomeGrass = {
  forest: ['#3e604a','#486b4d','#55774e','#5c814f','#648650','#728e55','#81955b','#90a063'],
  north: ['#536c64','#627c70','#6a8375','#708975','#81927b','#8d9c81','#96a88a','#a2ad8d'],
  south: ['#67744d','#788754','#869557','#94a15d','#a0a966','#a6ae6a','#b3b777','#bbb97f'],
  west: ['#596b4e','#697652','#78834f','#828f57','#8e995e','#99a265','#a5ab70','#b0b47a'],
};
function smoothEdge(distance, width) {
  const t = Math.max(0, Math.min(1, .5 + distance / width));
  return t * t * (3 - 2 * t);
}

function forestCover(x, y, wobble) {
  return Math.max(
    smoothEdge(x - 4740 + wobble, 390) * smoothEdge(1510 - y - wobble, 360),
    smoothEdge(x - 4400 + wobble, 480) * smoothEdge(350 - y + wobble, 380),
    smoothEdge(1 - southwestForestDistance(x + wobble, y - wobble), .36),
  );
}

const nearForest = (x, y) => (x > 4050 && y < 1800) || (x > 850 && x < 4000 && y > 2100);

const mixedGrass = new Map();
function mixShade(base, border, fraction) {
  const step = Math.round(fraction * 12);
  if (!step) return base;
  if (step === 12) return border;
  const key = `${base}${border}${step}`;
  if (!mixedGrass.has(key)) {
    const target = color(border);
    const channels = color(base).map((channel, i) => Math.round((channel * (12 - step) + target[i] * step) / 12));
    mixedGrass.set(key, `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`);
  }
  return mixedGrass.get(key);
}

function groundShade(px, py, wx, wy, tone) {
  const uneven = (field(px + 17, py - 31, 27) - .5) * 190;
  let base = grass[tone];
  if (wx < 240) base = mixShade(base, biomeGrass.west[tone], smoothEdge(-wx + uneven, 280));
  if (wy < 250) base = mixShade(base, biomeGrass.north[tone], smoothEdge(-wy - uneven, 300));
  if (wy > 2730) base = mixShade(base, biomeGrass.south[tone], smoothEdge(wy - 3000 + uneven, 340));
  if (nearForest(wx, wy)) base = mixShade(base, biomeGrass.forest[tone], forestCover(wx, wy, uneven));
  return base;
}

const shore = ['#839b71', '#a1a77b', '#b7b284'];
const waterColors = ['#426f78', '#527f89', '#608d96', '#6d9ea3', '#80afb3', '#a5c5bd'];
const roadColors = ['#827758', '#a38f61', '#b5a071', '#cab781', '#d7c38b'];
const accents = { shadow:'#354c42', dark:'#425b46', middle:'#54734e', light:'#6a8554', bright:'#8b9f5e', deep:'#44594b', rock:'#737e69', shine:'#a2a58a', straw:'#b3bf77' };
const bridgePlanks = ['#b98753', '#d0a06a', '#be905b'];

function bridgeColor({ along, across }) {
  const edge = Math.abs(across);
  if (Math.abs(along) >= 68) return edge > 21 ? '#6c5845' : '#a79571';
  if (edge >= 22) {
    if (Math.abs(along % 26) < 4) return '#dab17a';
    return across < 0 ? '#8b6246' : '#644734';
  }
  const board = along + bridge.length;
  if (board % 11 < 2 || edge >= 18) return '#956a48';
  return bridgePlanks[Math.floor(board / 11) % bridgePlanks.length];
}

const leaves = { d: '#334d40', m: '#52724d', l: '#718e54', t: '#68543e', T: '#9c784c', s: '#405b44' };
const needles = { d: '#2c4642', m: '#46695a', l: '#62876a', t: '#584a3c', T: '#85684b', s: '#364e46' };
const bushColors = { d: accents.dark, m: accents.middle, l: accents.light, s: accents.shadow };
const rockColors = { h: accents.shine, r: accents.rock, d: accents.deep, s: accents.dark };
const tuftColors = { a: accents.middle, b: accents.bright, t: accents.straw };
const rocks = [
  ['.hr.', 'drrd', '.ss.'],
  ['..hh..', '.hhrh.', 'ddrrrd', '.dddss'],
  ['...hhh..', '..hrrrh.', '.hhrrrrd', 'ddrrrddd', '.dssdd..'],
  ['....hhhh..', '..hhrhrhh.', '.hrhrhrrrd', '.hhrrrdrrd', 'ddrrdddddd', '.dssdddss.'],
  ['.....hhh....', '...hhrrrh...', '..hrrrhrhh..', '.hhrrhdrrrd.', '.hrrhddrrrdd', 'ddrrddrdrddd', '.dssdddddss.'],
];
const tufts = [
  ['.b.', 'aaa'],
  ['..t..', '.abt.', 'abaaa'],
  ['.b..t.', '.abt..', 'aaaata', '..aa..'],
  ['.....t..', '..b..t..', 't.ab.a.b', '.aaababa', '..aaaa..'],
  ['...b......', '.t.a...t..', '.t.ab..a.b', 'babata.a.a', '.aaaaabaaa', '...aaaaa..'],
];

function nativeSprite(width, height, draw) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => draw(x, y)).join(''));
}

function leafySprite(width, height, lobes, trunk = 0) {
  const mid = Math.floor(width / 2);
  const foot = height - 2;
  return nativeSprite(width, height, (x, y) => {
    const seed = hash(x + width, y - height);
    const distance = Math.min(...lobes.map(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2));
    if (distance < 1 + (seed - .5) * .18) {
      if (distance > .78 || (y > foot - trunk - 1 && seed > .24)) return 'd';
      if (distance < .58 && y < (foot - trunk) * .7 && seed > .28) return 'l';
      return 'm';
    }
    if (trunk && y >= foot - trunk && y <= foot && Math.abs(x - mid) <= (width > 23 ? 2 : 1)) return x < mid ? 't' : 'T';
    return y >= foot && Math.abs(x - mid + (y === foot ? 1 : 0)) <= Math.round(width * .28) ? 's' : '.';
  });
}

function pineSprite(width, height, tiers) {
  const mid = Math.floor(width / 2);
  return nativeSprite(width, height, (x, y) => {
    const tier = tiers.find(([top, base, radius]) => y >= top && y <= base && Math.abs(x - mid) <= Math.floor((y - top) * radius / (base - top)));
    if (tier) {
      const [top, base, radius] = tier;
      const edge = Math.floor((y - top) * radius / (base - top));
      const side = x - mid;
      if (y === base || Math.abs(side) === edge || (side > 0 && hash(x, y) > .66)) return 'd';
      return side <= 0 && side > -edge * .7 && hash(x + width, y) > .17 ? 'l' : 'm';
    }
    if (y >= height - 6 && y < height - 1 && Math.abs(x - mid) < 2) return x === mid ? 'T' : 't';
    return y >= height - 2 && Math.abs(x - mid) < width * .28 ? 's' : '.';
  });
}

const broadleaf = [
  leafySprite(12, 13, [[5, 4, 4, 4], [3, 6, 3, 3], [8, 6, 3, 3]], 4),
  leafySprite(16, 16, [[7, 5, 5, 5], [4, 7, 4, 4], [11, 7, 4, 4]], 5),
  leafySprite(20, 20, [[9, 6, 6, 6], [5, 9, 5, 5], [14, 9, 5, 5]], 6),
  leafySprite(26, 23, [[12, 7, 7, 7], [6, 10, 6, 6], [19, 10, 6, 6]], 7),
  leafySprite(31, 28, [[14, 8, 8, 8], [8, 12, 8, 7], [22, 11, 8, 8], [15, 14, 8, 6]], 9),
];
const pines = [
  pineSprite(9, 14, [[0, 5, 2], [3, 8, 3], [5, 10, 4]]),
  pineSprite(11, 18, [[0, 7, 3], [4, 11, 4], [8, 14, 5]]),
  pineSprite(15, 21, [[0, 8, 3], [4, 13, 5], [8, 17, 7]]),
  pineSprite(19, 25, [[0, 7, 4], [4, 12, 5], [8, 17, 7], [12, 21, 9]]),
  pineSprite(23, 30, [[0, 9, 4], [5, 15, 7], [10, 21, 9], [15, 25, 11]]),
];
const bushes = [
  leafySprite(7, 5, [[3, 2, 3, 2]]),
  leafySprite(10, 6, [[4, 2, 3, 2], [6, 3, 3, 2]]),
  leafySprite(13, 8, [[5, 3, 4, 3], [9, 4, 4, 3], [3, 5, 3, 2]]),
  leafySprite(16, 10, [[7, 3, 5, 3], [4, 6, 4, 3], [11, 5, 4, 4]]),
  leafySprite(20, 12, [[8, 4, 6, 4], [14, 6, 5, 4], [5, 7, 5, 4]]),
];

const rgbCache = new Map();
function color(hex) {
  if (!rgbCache.has(hex)) rgbCache.set(hex, [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)]);
  return rgbCache.get(hex);
}

export function createTerrainPixels(waterFrame = 0, windFrame = 0) {
  const { width, height } = TERRAIN_SIZE;
  const originX = WORLD.x / PIXEL;
  const originY = WORLD.y / PIXEL;
  const pixels = new Uint8Array(width * height * 4);
  const kinds = new Uint8Array(width * height);
  function paint(x, y, hex) {
    const index = (y * width + x) * 4;
    const [r, g, b] = color(hex);
    pixels[index] = r; pixels[index + 1] = g; pixels[index + 2] = b; pixels[index + 3] = 255;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + originX;
      const py = y + originY;
      const wx = (px + .5) * PIXEL;
      const wy = (py + .5) * PIXEL;
      const tile = terrainAt(wx, wy);
      const rough = hash(px, py);
      const region = field(px, py, 65) * .47 + field(px, py, 24) * .38 + field(px, py, 8) * .13 + (rough - .5) * .025;
      const shade = Math.max(0, Math.min(grass.length - 1, Math.floor(region * 10)));
      let tone = groundShade(px, py, wx, wy, shade);
      if (tile.water < 58) tone = shore[tile.water < 49 ? 2 : tile.water < 53 ? 1 : 0];
      if (tile.kind === 'road') {
        const index = tile.road > 18 ? 0 : tile.road > 14 ? 1 : rough > .97 ? 4 : region > .52 ? 3 : 2;
        tone = tile.deck ? bridgeColor(tile.deck) : roadColors[index];
        kinds[y * width + x] = 1;
      }
      if (tile.kind === 'river') {
        const wave = hash(Math.floor((x + originX) / 4), y + originY);
        const index = tile.water >= 41 ? 0 : tile.water >= 35 ? 1 : wave > .985 ? 5 : wave > .935 ? 4 : region > .49 ? 3 : 2;
        tone = waterColors[index];
        kinds[y * width + x] = 2;
      }
      paint(x, y, tone);
    }
  }

  for (let y = ((-originY % 4 + 4) % 4); y < height; y += 4) {
    for (let x = ((-originX % 3 + 3) % 3); x < width; x += 3) {
      if (kinds[y * width + x] !== 2 || hash(x + originX + 19, y + originY) > .47) continue;
      const phase = (waterFrame + Math.floor(hash(x + originX - 3, y + originY + 31) * AMBIENT_FRAMES)) % AMBIENT_FRAMES;
      const dy = y + phase;
      if (dy >= height || phase === 0 || phase === AMBIENT_FRAMES - 1) continue;
      const wave = phase < 3 || phase > 5 ? '#77a5a8' : '#8ab2b1';
      for (let dx = x; dx < Math.min(x + 2, width); dx++) {
        if (kinds[dy * width + dx] === 2 && kinds[dy * width + dx - 1] === 2 && kinds[dy * width + dx + 1] === 2) paint(dx, dy, wave);
      }
    }
  }

  function putSprite(x, y, rows, palette, sway = 0) {
    for (const [row, line] of rows.entries()) {
      for (let col = 0; col < line.length; col++) {
        const value = line[col];
        if (value === '.') continue;
        const px = x + col + (row < rows.length * .48 ? sway : 0);
        const py = y + row;
        if (px < 0 || py < 0 || px >= width || py >= height || kinds[py * width + px]) continue;
        paint(px, py, palette[value]);
      }
    }
  }

  const clearings = [
    { left: 319, top: 192, right: 477, bottom: 301 },
    { left: 502, top: 245, right: 618, bottom: 329 },
    { left: 476, top: 217, right: 503, bottom: 245 },
    { left: FOREST_CLEARING.x / PIXEL - 8, top: FOREST_CLEARING.y / PIXEL - 8,
      right: (FOREST_CLEARING.x + FOREST_CLEARING.width) / PIXEL + 8, bottom: (FOREST_CLEARING.y + FOREST_CLEARING.height) / PIXEL + 8 },
  ].map(plot => ({ left: plot.left - originX, top: plot.top - originY, right: plot.right - originX, bottom: plot.bottom - originY }));
  function clearOfTerrain(x, y, rows) {
    const spriteWidth = Math.max(...rows.map(row => row.length));
    const clearance = 2;
    const left = Math.max(0, x - clearance);
    const right = Math.min(width, x + spriteWidth + clearance);
    const top = Math.max(0, y - clearance);
    const bottom = Math.min(height, y + rows.length + clearance);
    if (clearings.some(plot => left < plot.right && right > plot.left && top < plot.bottom && bottom > plot.top)) return false;
    for (let py = top; py < bottom; py++) {
      for (let px = left; px < right; px++) {
        if (kinds[py * width + px]) return false;
      }
    }
    return true;
  }

  for (let y = (-originY % 8 + 8) % 8; y < height; y += 8) {
    for (let x = (-originX % 9 + 9) % 9; x < width; x += 9) {
      if (hash(x + originX + 13, y + originY + 19) > .81) {
        const tuft = tufts[Math.floor(hash(x + originX - 32, y + originY) * tufts.length)];
        putSprite(x + Math.floor(hash(y + originY, x + originX) * 9), y, tuft, tuftColors);
      }
    }
  }

  const props = [];
  for (let row = (-originY % 13 + 13) % 13; row < height; row += 13) {
    for (let col = (-originX % 15 + 15) % 15; col < width; col += 15) {
      const x = col + originX + Math.floor(hash(row + originY, col + originX) * 13) - 8;
      const y = row + originY + Math.floor(hash(col + originX, row + originY) * 12) - 6;
      const density = field(x + 50, y - 29, 68) + field(x, y, 20) * .45;
      const size = Math.floor(hash(x - 28, y) * 5);
      let art, palette, sway = 0;
      const forestDensity = nearForest(x * PIXEL, y * PIXEL)
        ? forestCover(x * PIXEL, y * PIXEL, (field(x + 17, y - 31, 27) - .5) * 190) : 0;
      if (density > .86 - .14 * forestDensity && hash(x, y + 21) > .18) {
        const variety = hash(x - 41, y + 23);
        [art, palette] = variety < .35 ? [bushes[size], bushColors] : variety < .69 ? [broadleaf[size], leaves] : [pines[size], needles];
        if (hash(x + 109, y + 13) > .65) {
          const phase = (windFrame + Math.floor(hash(x + 51, y - 49) * AMBIENT_FRAMES)) % AMBIENT_FRAMES;
          if (phase === 1 || phase === 2) sway = 1;
          else if (phase === 3) sway = -1;
        }
      } else if (hash(x, y - 82) > .91) {
        [art, palette] = [rocks[size], rockColors];
      }
      if (art && clearOfTerrain(x - originX, y - originY, art)) props.push({ x: x - originX, y: y - originY, art, palette, sway });
    }
  }

  props.sort((a, b) => (a.y + a.art.length) - (b.y + b.art.length));
  for (const { x, y, art, palette, sway } of props) putSprite(x, y, art, palette, sway);
  return pixels;
}
