import { memo } from 'react';
import landscape from './pixel-landscape.png?inline';
import ambient from './pixel-ambient.png?inline';
import wind from './pixel-wind.png?inline';
import { AMBIENT_FRAMES, fenceSegments, terrainKind, WORLD } from './terrain.js';

export function pixelPaths(rows) {
  const paths = {};
  for (const [y, row] of rows.entries()) {
    for (let x = 0; x < row.length;) {
      const color = row[x];
      let end = x + 1;
      while (row[end] === color) end++;
      if (color !== '.') paths[color] = (paths[color] ?? '') + `M${x} ${y}h${end - x}v1H${x}z`;
      x = end;
    }
  }
  return paths;
}

function Pixels({ paths, palette, flat }) {
  return <g shapeRendering="crispEdges">{Object.entries(paths).map(([color, d]) => <path key={color} d={d} fill={flat ?? palette[color]}/>)}</g>;
}

const strawberryPalette = {
  g: '#4f7044', G: '#819c47', L: '#bfd072',
  o: '#822f3e', d: '#ad3444', r: '#d84247', R: '#f0554d', H: '#ff7f63', s: '#ffd08b',
};
const strawberryArt = pixelPaths([
  '...g.....',
  '...Lg..g.',
  '.g.Lg.Lg.',
  'gLLGgLgg.',
  '.GGoGGRo.',
  '.oHsRRrdo',
  '.oRrRsRdo',
  '..oHsrdo.',
  '...oddo..',
  '....oo...',
]);
const smallStrawberryArt = pixelPaths([
  '.G.g.',
  'GgGg.',
  'oHRdo',
  'oRsdo',
  '.rdo.',
  '..o..',
]);

export function StrawberryPixels({ x = 0, y = 0, small = false }) {
  return <g className="strawberry-pixels" transform={x || y ? `translate(${x} ${y})` : undefined}>
    <Pixels paths={small ? smallStrawberryArt : strawberryArt} palette={strawberryPalette}/>
  </g>;
}

const glyphs = {
  down: ['........','........','.YYYYYY.','..YYYY..','...YY...','........','........','........'],
  wheat: ['...Y....', 'Y..YY.Y.', '.Y.Y.YY.', '.YYY.Y..', '..YYYY..', '...YYY..', '..K.G...', '.K..G...'],
  flour: ['..KKKK..', '...WW...', '..WWWW..', '.WWYYWW.', '.WYYYYW.', '.WWYYWW.', '.KWWWWK.', '..KKKK..'],
  jar: ['.YYYYYY.', '..KKKK..', '..B..B..', '.B....B.', '.B..B.B.', '.B....B.', '.BWWWWB.', '..BBBB..'],
  fuel: ['....NN..', '..NNNNN.', '.NNYNNN.', '.NNNNNNN', 'NNBNNNNN', 'NNNNNBNN', '.NNNNNN.', '..NNNN..'],
  compote: ['.YYYYYY.', '..KKKK..', '..B..B..', '.BRRRRB.', '.BRYRRB.', '.BRRRRB.', '.BWWWWB.', '..BBBB..'],
  bread: ['..KKKK..', '.KYYYYK.', 'KYTYYYYK', 'KYYYTYKK', 'KYYYYYKK', '.KKKKKK.', '........', '........'],
  pie: ['..YYYY..', '.YYYYYY.', 'YYKKKYKY', 'YKYYKYYY', 'YYYYYKKY', '.KKKKKK.', '..KKKK..', '........'],
  jam: ['.YYYYYY.', '..KKKK..', '..BRRB..', '.BRRRRB.', '.BRYYRB.', '.BRYRRB.', '.BRRRRB.', '..BBBB..'],
  mixedJam: ['.YYYYYY.', '..KKKK..', '..BPRB..', '.BPRRPB.', '.BRYYPB.', '.BPYYRB.', '.BRRPPB.', '..BBBB..'],
  sound: ['....Y...', '...YY.Y.', '.YYYY..Y', '.YYYY.YY', '.YYYY..Y', '...YY.Y.', '....Y...', '........'],
  note: ['....YY..', '....YYY.', '....Y.Y.', '....Y...', '....Y...', '.YYYY...', 'YYYY....', '.YY.....'],

  coin: ['..YYYY..','.YYYYYY.','YYWTTYYY','YYWTYYYY','YYWTYYYY','YYYYYYYY','.YYYYYY.','..TTTT..'],
  market: ['..RRRR..','.RWRWRR.','RWRWRWRR','RRRRRRRR','.K....K.','.KYYRYK.','KKKKKKKK','.K....K.'],

  house: ['...RR...','..RRRR..','.RRRRRR.','RRRRRRRR','.HYHHYH.','.HYKKYH.','.HHKKHH.','.TTTTTT.'],
  bed: ['........','BB......','BWW.VVV.','BBVVVVV.','BVVVVVVV','BBBBBBBB','B......B','........'],
  plotWide: ['..GGGG..','..G..G..','K.G..G.K','KKG..GKK','K.G..G.K','..G..G..','..GGGG..','........'],
  plotLarge: ['K.GGGG.K','.K....K.','G.G..G.G','G......G','G......G','G.G..G.G','.K....K.','K.GGGG.K'],
  fence: ['.Y.YY.Y.','.K.KK.K.','KKKKKKKK','.K.KK.K.','YYYYYYYY','.K.KK.K.','.K.KK.K.','.T.TT.T.'],
  soil: ['....G...','..G.GG..','...GG...','...K....','.TTTTTT.','KTTYTKKK','KKKKTTKK','.KKKKKK.'],
  axe: ['...WWB..','..WWWB..','..WBBKK.','...BKK..','...KK...','..KK....','.KK.....','.T......'],
  groupThree: ['.Y.Y.Y..','YYY.YYY.','KTY.YTK.','...Y....','..YYY...','..TYK...','.KKKKK..','........'],
  groupFour: ['.Y....Y.','YYY..YYY','.K.YY.K.','..YYYY..','Y.KYYK.Y','YYY..YYY','.K....K.','........'],
  graft: ['....GGG.','...GGG..','.G.G.K..','.GG.K...','..GKYK..','...YKT..','..K.....','.K......'],
  seedSatchel: ['..YKKY..','...YK...','..KYKK..','.KYTTKK.','KYYGGTTK','KYTGGTTK','.KTTTTK.','..KKKK..'],
  crate: ['.YYYYYY.','YKKKKKKY','YYTTTTYY','YTYTTYTY','YTTYTTTY','YTYTTYTY','YKKKKKKY','.YYYYYY.'],
  nectar: ['....YG..','..Y.GG..','..PYGY..','.PYPY...','..PYY...','...G.B..','..GG.BB.','...G.B..'],
  fastBasket: ['....KK..','...K..K.','BB.K..K.','..YYYYYY','B.KYYYYK','...KYYK.','B...KK..','........'],
  pickApple: ['....KG..','...KGG..','..RRRR..','.RHRRRR.','.RHRRRR.','..RRR..Y','....Y.YY','....YYYY'],
  flowerClock: ['.PP.....','PYYP....','.PGP....','..G..KK.','..G.KYWK','....KYWK','....KWWK','.....KK.'],
  storage: ['...RR...','..RRRR..','.RTTRTR.','RTTTTTTR','.KKKKKK.','.KYKKYK.','.KYKKYK.','.KKKKKK.'],
  save: ['.BBBBBB.','BBBBNBBB','BWWWWNBB','BWWWWNBB','BBBBBBBB','BNYYYYNB','BNYYYYNB','.BBBBBB.'],
  water: ['....B...','...BB...','..BWWB..','..BWWBB.','.BWWBBB.','.BWWBBB.','..BBBB..','...BB...'],
  speed: ['...Y....','..YY....','..YYT...','.YYYYYY.','...YTT..','..YT....','..T.....','.T......'],
  strength: ['..RR..R.','..RRTTR.','..RRRTT.','.RRRRT..','RRRTTT..','RTTTTR..','.RRRR...','........'],
  endurance: ['.GG..GG.','GWWGGWWG','GWWGGGGG','GGGGGGGG','.GGGGGG.','..GGGG..','...GG...','........'],
  dexterity: ['....Y...','...YY...','..YYY.Y.','..YY..Y.','.YYYYYY.','YTYYTYY.','.TTTTT..','..TTT...'],
  handling: ['..BB....','.BBBBBB.','BBWWBBWB','BBWWBBWB','BBWWBBWB','BBBBBBBB','.NNNNNN.','........'],
  foraging: ['..VVVV..','.VWWVVV.','.VW..VV.','.VV..VV.','..VVVV..','....NN..','.....NN.','......N.'],
  gold: ['....K...','...KGG..','..YYYY..','.YWYYYY.','.YWYYYY.','.TYYYYT.','..TTTT..','...TT...'],
  hedge: ['...KK...','..KKKK..','.KKKKKK.','KKKKKHH.','KKKKHHYK','KKKHHHH.','.KHHHH..','..K..K..'],
  back: ['...Y....','..YY....','.YYYYYY.','YYYYYYYY','YYYYYYYY','.YYYYYY.','..YY....','...Y....'],
  apple: ['....K...','...KGG..','..RRRR..','.RHRRRR.','.RHRRRR.','.RRRRRR.','..RRRR..','...RR...'],
  xp: ['...Y....','...YY...','..YYYY..','YYYYYYYY','.YYYYYY.','..YYYY..','.YY..YY.','.Y....Y.'],
  track: ['.YY...Y.','.YYY.YY.','..YY.Y..','....Y...','..Y.....','.YY..YY.','..Y.YYY.','.....Y..'],
  group: ['..YY.Y..','..YY.YY.','........','.YYYYYY.','YYY.YYYY','YY...YYY','........','........'],
  tree: ['...Y....','..YYY...','.YYYYY..','...Y....','YYYYYYY.','Y..Y..Y.','Y..Y..Y.','........'],
  map: ['YYYYYYYY','Y......Y','Y.YYYY.Y','Y.Y..Y.Y','Y.Y..Y.Y','Y.YYYY.Y','Y......Y','YYYYYYYY'],
  pin: ['..YYYY..','.YWWYYY.','YYKKYYYY','YYKKYYYY','.YYYYYY.','..YYYY..','...YY...','....T...'],
  work: ['..YYYY..','.YK..KY.','KKKKKKKK','KYYYYYYK','KYKYYKYK','KYKYYKYK','.KKKKKK.','........'],
  table: ['.YY...Y.','YYKY.YYY','YYYYYYYY','KKKKKKKK','.KYYYYK.','.K....K.','.K....K.','........'],
  shelves: ['KKKKKKKK','KYYYBBYK','KYYYBBYK','KKKKKKKK','KRYKYYYK','KRYKYYYK','KKKKKKKK','K......K'],
  basket: ['..KKKK..','.K....K.','.K....K.','YYYYYYYY','KYYYYYYK','.KYKYKK.','.KKYKYK.','..KKKK..'],
  seed: ['.....GG.','....GGG.','.GG.G...','.GGGG...','...G....','..KKK...','.KKKKK..','..KKK...'],
  flower: ['...PP...','..PPPP..','.PPYYPP.','..PPPP..','...GG...','.GGGGG..','..GG....','...G....'],
  close: ['........','.Y....Y.','..Y..Y..','...YY...','...YY...','..Y..Y..','.Y....Y.','........'],
  edit: ['.....RR.','....RRWR','...YYRR.','..YYYT..','.YYYT...','.YYT....','.KT.....','K.......'],
  play: ['........','.Y......','.YYY....','.YYYYY..','.YYYYY..','.YYY....','.Y......','........'],
  menu: ['........','YYYYYYYY','........','YYYYYYYY','........','YYYYYYYY','........','........'],
  minus: ['........','........','........','.YYYYYY.','.YYYYYY.','........','........','........'],
  plus: ['........','...YY...','...YY...','.YYYYYY.','.YYYYYY.','...YY...','...YY...','........'],
  center: ['...YY...','...YY...','........','YY.YY.YY','YY.YY.YY','........','...YY...','...YY...'],
  check: ['........','......Y.','.....YY.','.Y..YY..','.YYYY...','..YY....','........','........'],
  help: ['..YYYY..','.YY..YY.','....YY..','...YY...','...YY...','........','...YY...','...YY...'],
  lock: ['...YY...','..Y..Y..','..Y..Y..','.YYYYYY.','.YY..YY.','.YY..YY.','.YYYYYY.','........'],
  hand: ['..Y.....','..Y.Y.Y.','..YYYYY.','.YYYYYY.','YYYYYYY.','.YYYYY..','..YYYY..','..YYYY..'],
  crown: ['........','Y..YY..Y','YY.YY.YY','YYYYYYYY','.YYYYYY.','.YYYYYY.','........','........'],
};
const glyphPalette = { Y: '#f6d58f', K: '#ac733e', R: '#d4624b', H: '#f49b75', G: '#b0bf67', P: '#d6a3d7',
  T: '#be794d', B: '#78b8cc', V: '#bb9ce5', W: '#fff0ca', N: '#4b6286' };
const glyphPaths = Object.fromEntries(Object.entries(glyphs).map(([name, rows]) => [name, pixelPaths(rows)]));
export function Glyph({ name, className = '' }) {
  if (name === 'berry') return <svg viewBox="0 0 9 10" className={`glyph ${className}`} aria-hidden="true"><StrawberryPixels/></svg>;
  return <svg viewBox="0 0 8 8" className={`glyph ${className}`} aria-hidden="true"><Pixels paths={glyphPaths[name]} palette={glyphPalette}/></svg>;
}

const hedgeRows = [
  '............................',
  '............................',
  '............................',
  '..........O...O.............',
  '.......O.OQO.OQO.O..........',
  '......OQOQQQOQQQOQO.........',
  '....OOQQqQQQqQQQqQQO........',
  '...OQQqQQqQQQQqQOQQQO.......',
  '..OQQQQQQQqQQQQOQqqQO.......',
  '.OQQqQQQQQQQQqQOOQOOsO......',
  '.OQQQQQqQQQqQQQOQQOssSO.....',
  '.OQQQqQQQQQQQQOOOOSSSSSO....',
  '.OQQQQQQqQQQQOOOSSSSEsSSO...',
  '..OQQQQQQQQOOOOOSSSSEsSSOO..',
  '..OOQQQQQOOOOOSSSSSSSSSSSOO.',
  '....OOOOOOSSSSSSSSSSSSSSSPO.',
  '.....OSSSsSSSSssSSSSSSsPOO..',
  '......OsssssssssssssssOO....',
  '.......OOOOsOOOOOOsOOOO.....',
  '.........OOO.....OOO........',
];
const restingHedge = pixelPaths(hedgeRows);
const sleepingHedge = pixelPaths(hedgeRows.map((row, y) => [...row].map((color, x) => {
  if (y === 13 && x >= 18 && x <= 21 && 'SEs'.includes(color)) return 'E';
  return color === 'E' ? 'S' : color;
}).join('')));
const hatchHedge = pixelPaths(hedgeRows.map((row, y) => {
  if (y < 4 || y > 10) return row;
  return [...row].map((color, x) => color === 'Q' && (x + y * 2) % 6 === 1 ? 'q' : color).join('');
}));
const quillColors = [
  ['#341e21','#713b31','#9a5b42'], ['#382522','#83543b','#ad774f'], ['#382731','#745057','#976b68'], ['#312621','#655044','#907662'], ['#452520','#95503d','#c18157'], ['#241f3c','#68508c','#a487c6'], ['#1b3436','#407a74','#75aa87'], ['#402d38','#9c7e83','#d3b5a9'],
];
const skinColors = [
  ['#ecc49a','#c58d65','#f3ae94'], ['#e2b187','#ad7853','#eaa087'], ['#f3d1ac','#ca9d76','#f0a48f'], ['#bb8c6b','#90624a','#d68a72'], ['#f3c39c','#c48663','#ea8e7d'], ['#e8e0ba','#b8b18d','#f4aaad'], ['#e5a1b4','#af6986','#f4c692'], ['#b9cec4','#80a194','#e8a4a0'],
];
const hats = {
  berry: ['....G...','...GG...','..RRRR..','.RRHRRR.','.RRRRRR.','KKKKKKKK'],
  leaf: ['G.......','GGGG....','.GGGGGG.','..GHGGGG','...GGGG.','..KKKKK.'],
  acorn: ['...G....','..KKKK..','.KYKKY..','.YKYKYK.','KKKKKKKK','.YYYYYY.'],
};
const hatPaths = Object.fromEntries(Object.entries(hats).map(([id, rows]) => [id, pixelPaths(rows)]));

export function HedgeSprite({ hedge, hidden = false, walking = false, sleeping = false, speaking = false, eyesClosed = false, className = '' }) {
  const [O, Q, q] = quillColors[hedge.quills] ?? quillColors[0];
  const [S, s, P] = skinColors[hedge.skin] ?? skinColors[0];
  const color = { O, Q, q, S, s, P, E: '#211820' };
  const pose = sleeping ? 'sleeping' : walking ? 'walking' : '';
  const pixels = sleeping || eyesClosed ? sleepingHedge : hedge.pose === 1 ? hatchHedge : restingHedge;
  return <svg viewBox="0 0 28 22" className={`hedge-sprite ${pose} ${className}`} aria-hidden="true">
    <g transform={hedge.left ? 'translate(28 0) scale(-1 1)' : undefined}>
      <g transform={sleeping ? 'translate(0 5) scale(1 .75)' : undefined}>
        <g className="hedge-body">
          <Pixels paths={pixels} palette={color} flat={hidden ? '#271a31' : undefined}/>
          {hedge.pose === 2 && !hidden && <path fill={s} shapeRendering="crispEdges" d="M20 15h3v1h-3z"/>}
          {speaking && <g className="hedge-mouth" fill={O} shapeRendering="crispEdges">
            <path className="mouth-closed" d="M23 16h2v1h-2z"/>
            <path className="mouth-open" d="M22 15h3v2h-3z"/><path className="mouth-open" fill={P} d="M23 16h1v1h-1z"/>
          </g>}
          {hedge.hat && <g transform="translate(10 0)"><Pixels paths={hatPaths[hedge.hat]} palette={glyphPalette}/></g>}
        </g>
      </g>
      {walking && !sleeping && <g className="hedge-paws" fill={O} shapeRendering="crispEdges"><path d="M8 19h4v1H8z"/><path d="M16 20h4v1h-4z"/></g>}
    </g>
  </svg>;
}

export function SleepLetters({ className = '' }) {
  return <span aria-hidden="true" className={`sleep-letters ${className}`}><span>Z</span><span>z</span><span>z</span></span>;
}

const canopy = [
  '......DDDD......', '....DDLLlLDD....', '...DLllLllmLD...', '..DLllmmmLmlLD..',
  '.DLlmllLmmLmmLD.', '.DMLlmmLmLlmmLD.', 'DLlmmMDMLlllLmLD', 'DLlmLDmMmLlLmmMD',
  'DMmmMmMLmLmmmMMD', '.DMmmMLmMLmmMMD.', '.DDmMmmLMmmMDD..', '..DDDDMMMDDDD...',
  '....DDDDDDD.....',
];
const trunk = ['.......KK.......', '.......Kk.......', '.......Kk.......', '......KKkK......', '.....KKKCCC.....'];
const artColors = { D:'#263e35', M:'#355643', L:'#4c7148', l:'#85a25a', m:'#648747', K:'#684132', k:'#ab7044', C:'#75523a', R:'#bf5140', H:'#f48859' };
const amberColors = { ...artColors, D:'#35492f', M:'#4d683b', L:'#678048', l:'#a8a85a', m:'#87934c', R:'#dc9a35', H:'#ffe598' };
const canopyPaths = pixelPaths(canopy);
const trunkPaths = pixelPaths(trunk);
const treeFruit = [[3, 5], [7, 3], [11, 5], [5, 8], [10, 9], [2, 8], [12, 7], [7, 10], [9, 6], [5, 5]];
export function AppleTree({ fruit, variety, grafted = false }) {
  const palette = variety === 'forest' ? { ...artColors, D:'#244539', L:'#477f55', R:'#a94a71', H:'#e6a0a3' } : variety === 'gold' ? amberColors : artColors;
  return <svg viewBox="0 0 16 18" aria-hidden="true" className="tree-sprite">
    <g transform="translate(0 12)"><Pixels paths={trunkPaths} palette={palette}/></g>
    {grafted && <path className="tree-graft" d="M7 13h2v1h1v1H7z" fill={variety === 'gold' ? '#ecbf69' : '#c57051'} shapeRendering="crispEdges"/>}
    <g className="tree-crown">
      <Pixels paths={canopyPaths} palette={palette}/>
      <g shapeRendering="crispEdges">{treeFruit.slice(0, fruit).map(([x,y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
        <path d="M0 0h2v2H0z" fill={palette.R}/><path d="M0 0h1v1H0z" fill={palette.H}/>
      </g>)}</g>
    </g>
  </svg>;
}

const soilPaths = pixelPaths([
  '....KKKKKKKK....','..KKttKttttKKK..','.KtttKttKtttKtK.','KKtKttttttKtttKK',
  'KKtttKKttttKKtKK','.KKKKttttKttKKK.','...KKKKKKKKKK...',
]);
const bedPaths = pixelPaths([
  '.................','....KKKKKKKK.....','..KKYYYYWYYKKK...','.KKYYWYYWWYYYKK..',
  '.KYYYYYYYYYYYYKK.','KKYYTYYYYYTYTYKK.','KKTTTTTTTTTTTTKK.','.KKKKKKKKKKKKKK..',
]);
const storagePaths = pixelPaths([
  '.......RRRR.......','......RRTTRR......','.....RTTTTTRR.....','....RRTRTTRTRR....','...RRTTRTTTRTRR...',
  '..RRTRTTTRTTRTRR..','.RRTTRTRTTTRRTRRR.','RRRRRRRRRRRRRRRRRR','..KKKKKKKKKKKKKK..','..KYKYDDDDYKYKYK..',
  '..KKYKDTTDKYKYKK..','..KYKYDTTDYKYKYK..','..KKYKDTTDKYKYKK..','..KYKYDTTDYKYKYK..','..KKKKDDDDKKKKKK..',
]);
export function SoilArt() {
  return <svg viewBox="0 0 16 7" aria-hidden="true"><Pixels paths={soilPaths} palette={{ K: '#745235', t: '#996f4d' }}/></svg>;
}
export function BedArt() {
  return <svg viewBox="0 0 17 8" aria-hidden="true"><Pixels paths={bedPaths} palette={{ K: '#71513a', Y: '#ce9e57', W: '#f0cd8a', T: '#aa773f' }}/></svg>;
}
export function StorageArt() {
  return <svg viewBox="0 0 18 15" aria-hidden="true"><Pixels paths={storagePaths} palette={{ R: '#634a39', T: '#a78159', D: '#4b3d35', K: '#8b6547', Y: '#af865c' }}/></svg>;
}

export function WorkerMarker() {
  return <svg viewBox="0 0 14 14" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M4 0h6v5h4v3h-2v2h-2v2H8v2H6v-2H4v-2H2V8H0V5h4z" fill="#473327"/>
    <path d="M5 1h4v5h4v1h-2v2H9v2H8v1H6v-1H5V9H3V7H1V6h4z" fill="#ffd65f"/>
    <path d="M5 1h4v1H6v5H2V6h3z" fill="#fff2a0"/>
    <path d="M8 4h1v2h3v1h-2v2H8v2H7V8h1z" fill="#e6a842"/>
  </svg>;
}

const compostPaths = pixelPaths(['..t..K.....K..','...KT..t.KT...','Ktk.....kT..tK','.KT..tK....TK.','....KT..KT....']);
export function CompostArt({ level }) {
  return <svg viewBox="0 0 14 5" aria-hidden="true">
    <Pixels paths={compostPaths} palette={{ K: '#52422d', T: '#97734a', k: '#6b563b', t: '#87925b' }}/>
    {level > 1 && <path d="M1 1h1v1H1zM5 3h2v1H5zM10 2h2v1h-2zM8 0h1v1H8zM12 3h1v1h-1z" fill="#ac9b60" shapeRendering="crispEdges"/>}
  </svg>;
}

const tablePaths = pixelPaths([
  '..............','...TTTTTTTTT..','..TYYYYYYYYTK.','.TYYYYYYYYTKK.','TKKKKKKKKKKK..',
  '..KY......KY..','..KYYYYYYYKY..','..KY......KY..','..KK......KK..',
]);
export function LoadingTableArt({ level }) {
  return <svg viewBox="0 0 14 9" aria-hidden="true">
    <Pixels paths={tablePaths} palette={{ T: '#92613b', Y: '#bd8d55', K: '#65472f' }}/>
    {level > 1 && <path d="M7 2h3v1H7zM6 3h3v1H6z" fill="#e3bd77" shapeRendering="crispEdges"/>}
    {level > 2 && <path d="M3 1h1v2H3zM9 6h2v1H9z" fill="#d7aa65" shapeRendering="crispEdges"/>}
  </svg>;
}

const cratePaths = pixelPaths(['KKKKKK','KYYYYK','KYTYYK','KYYTYK','KKKKKK']);
export function CrateRackArt({ level }) {
  return <svg viewBox="0 0 16 12" aria-hidden="true">
    <path d="M0 4h16v2H0zM1 10h14v1H1zM1 4h2v8H1zM13 4h2v8h-2z" fill="#725339" shapeRendering="crispEdges"/>
    {[[2,0],[8,0],[5,6]].slice(0, level).map(([x,y]) => <g key={x} transform={`translate(${x} ${y})`}>
      <Pixels paths={cratePaths} palette={{ K: '#745035', T: '#b07a46', Y: '#d1a56c' }}/>
    </g>)}
  </svg>;
}

export const OrchardPavers = memo(function OrchardPavers({ x, y, width, height, level }) {
  const edges = [
    { length: height, position: along => [width - 3, along] },
    { length: width, position: along => [along, 3] },
    { length: width, position: along => [along, height - 3] },
    { length: height, position: along => [3, along] },
  ];
  let stones = [];
  for (const { length, position } of edges) {
    const onRoad = [];
    for (let along = 12; along < length - 12; along += 6) {
      const [sx, sy] = position(along);
      if (terrainKind({ x: x + sx, y: y + sy }) === 'road') onRoad.push([sx, sy]);
      else if (onRoad.length >= 3) break;
      else onRoad.length = 0;
    }
    if (onRoad.length >= 3) {
      const middle = Math.floor(onRoad.length / 2);
      const center = onRoad[middle];
      const vertical = center[0] === onRoad[0][0];
      stones = [-12, 0, 12, -24, 24, -36, 36].slice(0, 1 + 2 * level).map(offset => [
        center[0] + (vertical ? offset : 0), center[1] + (vertical ? 0 : offset),
      ]);
      break;
    }
  }
  return <svg className="orchard-pavers" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" shapeRendering="crispEdges">
    {stones.map(([sx,sy]) => <path key={`${sx}-${sy}`} d={`M${sx - 4} ${sy - 3}h8v2h2v4h-12v-4h2z`} fill="#9a896b" stroke="#74654f"/>)}
  </svg>;
});

export const OrchardFence = memo(function OrchardFence({ x, y, width, height }) {
  const segments = fenceSegments({ x,y,width,height }).map(pair =>
    pair.map(point => ({ x: point.x - x, y: point.y - y })));
  const rail = offset => segments.map(([a,b]) => `M${a.x} ${a.y + offset}L${b.x} ${b.y + offset}`).join('');
  const posts = segments.map(([a,b]) => `M${a.x - 3} ${a.y - 17}h6v23h-6zM${b.x - 3} ${b.y - 17}h6v23h-6z`).join('');
  return <svg className="orchard-fence" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" shapeRendering="crispEdges">
    <path d={rail(-4)} stroke="#674b35" strokeWidth="8" fill="none"/>
    <path d={rail(-10)} stroke="#be935e" strokeWidth="5" fill="none"/>
    <path d={posts} fill="#845e43"/>
  </svg>;
});

const basketRows = ['....OOO.....','...OKKKO....','..OK...KO...','..O.....O...','..O.....O...','.OOOOOOOOO..','.KKKKKKKKO..','..KyKyKyO...','..KykKykO...','...OKKKO....','....OOOO....'];
const flowerRows = ['...PPPP.....','..PHHHPP....','.PHHYYHPP...','.PPYYHHP....','..PPPPPP....','...PPG......','.....G..G...','..G..G.GG...','..GGGGLG....','....LG......','....GGG.....'];
const basketStyles = [0, 1, 2, 3].map(level => {
  const rows = [...basketRows.slice(0, 8), ...Array.from({ length: level }, () => '..KyKyKyO...'), ...basketRows.slice(8)];
  return { paths: pixelPaths(rows), height: rows.length };
});
const flowerPaths = pixelPaths(flowerRows);
const housePaths = pixelPaths([
  '..................MM......','.................MMM......','...........DD....MMM......','..........DRRD..MMMM......',
  '.........DRRRRDDMMMM......','........DRRrRRRDMMMM......','.......DRrRRrRRRDRRD......','......DRRRrRRRRRRRRDD.....',
  '.....DRrRRRRrRRRRrRRDD....','....DRRRRrRRRRrRRRRRRDD...','...DRrRRRRrRRRRRRrRRRRDD..','..DRRRRRrRRRRrRRRRRRrRRDD.',
  '.DDRRRRRRRRrRRRRRRRRRRDDD.','DDDDDDDDDDDDDDDDDDDDDDDDDD','..MMMMMMMMMMMMMMMMMMMMMM..','..MeEEEeEEMBBBMeEEEeEEMM..',
  '..MeEYWEMEMBBBMeEYWEeEMM..','..MeEYWEMEMBBBMeEYWEeEMM..','..MeEEEEEEMBHBMeEEEEEEMM..','..MeEEEEEEEBBBMEEEEEEEMM..',
  '..MMMMMMMMDDBDMMMMMMMMMM..','...SSSSSSSCCCCSSSSSSSSS...','..........CCCC............',
]);
export function HouseArt() {
  return <svg viewBox="0 0 26 23" aria-hidden="true"><Pixels paths={housePaths} palette={{
    M:'#513b32', D:'#56382f', R:'#a65743', r:'#c67655', E:'#bd9469', e:'#e4be89', B:'#7a513c',
    H:'#e6bb76', Y:'#e9ab61', W:'#fff1ab', S:'#737b62', C:'#a2936c',
  }}/></svg>;
}
export function BasketArt({ level = 0 }) {
  const { paths, height } = basketStyles[level] ?? basketStyles[0];
  return <svg viewBox={`0 0 12 ${height}`} aria-hidden="true"><Pixels paths={paths} palette={{O:'#573733',K:'#ab7547',y:'#e2b274',k:'#c38e55'}}/></svg>;
}

const sprinklerPaths = pixelPaths([
  '..............','..............','..............','..............','....OOOOOO....','...OGGGGBOO...',
  '....OOKBOO....','.....OKBO.....','.....OKBO.....','....OOKBOO....','...OOGKKBOO...',
  '..OOGGBBBBBO..','..OOOBBBOOOO..','.....OOOO.....',
]);
export function SprinklerArt({ spray = true, level = 1 }) {
  return <svg viewBox="0 0 14 14" overflow="visible" aria-hidden="true">
    <Pixels paths={sprinklerPaths} palette={{ O: '#324044', G: level > 1 ? '#d1ae65' : '#91a268', K: '#b9bc84', B: '#5e7d78' }}/>
    {spray && <g fill="#b5f1ec" shapeRendering="crispEdges">
      {[-11, -8, -5, -3, 3, 5, 8, 11].map((offset, index) => <rect key={offset} className="sprinkler-drop" x="6.5" y="3"
        width="1.2" height="1" style={{ '--dx': `${offset}px`, '--delay': `-${(index * 3 % 8) * .15}s` }}/>)}
    </g>}
  </svg>;
}
export function FlowerArt({ variant }) {
  const [P,H] = [['#99549b','#dda2ce'], ['#bd6a56','#efae91'], ['#755aa5','#b9a2e3']][variant];
  return <svg viewBox="0 0 12 11" aria-hidden="true"><Pixels paths={flowerPaths} palette={{P,H,Y:'#f8d989',G:'#4c7847',L:'#a6bc66'}}/></svg>;
}

export const TerrainPortrait = memo(function TerrainPortrait({ x, y, cover = false }) {
  const size = 408;
  const left = Math.max(WORLD.x, Math.min(WORLD.x + WORLD.width - size, x - size / 2));
  const top = Math.max(WORLD.y, Math.min(WORLD.y + WORLD.height - size, y - size / 2));
  return <svg className="portrait-terrain" viewBox={`${left} ${top} ${size} ${size}`}
    preserveAspectRatio={cover ? 'xMidYMid slice' : undefined} aria-hidden="true">
    <image href={landscape} x={WORLD.x} y={WORLD.y} width={WORLD.width} height={WORLD.height}/>
  </svg>;
});

export const WorldBackdrop = memo(function WorldBackdrop() {
  const origin = { left: WORLD.x, top: WORLD.y };
  const ambientStyle = texture => ({ ...origin, backgroundImage: `url(${texture})`,
    '--ambient-frames': AMBIENT_FRAMES, backgroundSize: `100% ${(AMBIENT_FRAMES + 1) * 100}%` });
  return <>
    <img src={landscape} style={origin} className="world-backdrop" alt="" draggable={false}/>
    <div className="world-ambient river-ambient" aria-hidden="true" style={ambientStyle(ambient)}/>
    <div className="world-ambient wind-ambient" aria-hidden="true" style={ambientStyle(wind)}/>
  </>;
});
