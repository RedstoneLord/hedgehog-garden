import { pixelPaths } from './art.jsx';
import { PERKS } from './perks.js';

// The subject shows the perk's theme. The small corner symbol shows what it affects.
const art = {
  pockets:['pocket','amber','apple'], glean:['apple','leaf','eye'], bloom:['flower','rose','bolt'], trail:['trail','aqua','boot'], hearty:['heart','red','plus'],
  satchel:['satchel','amber','apple'], sharp:['lens','violet','flower'], steady:['paw','aqua','apple'], early:['bed','amber','sun'], runner:['boot','leaf','speed'],
  oak:['acorn','leaf','heart'], picker:['apple','red','check'], hauler:['crate','amber','boot'], nimble:['feather','cyan','speed'], dawn:['sun','red','bed'],
  pollen:['compass','leaf','flower'], sweep:['basket','rose','plus'], iron:['shield','cyan','heart'], sprint:['boot','red','bolt'], laden:['basket','violet','apple'],
  moon:['moon','violet','bed'], wind:['wind','cyan','speed'], granary:['crateStack','rose','apple'], bees:['bee','amber','flower'], twilight:['apple','violet','moon'],
  lightning:['bolt','cyan','boot'], mountain:['mountain','aqua','crate'], star:['star','violet','flower'], marathon:['hourglass','amber','heart'], handful:['hands','leaf','apple'],
  orchardEye:['basket','leaf','eye'], rainmaker:['wateringCan','cyan','sprout'], berryWhisperer:['berries','rose','paw'], woodlandSense:['trees','aqua','flower'],
  silverTongue:['stall','amber','coin'], bridgekeeper:['bridge','violet','basket'], longHauler:['crateStack','red','boot'], roadCaptain:['tractor','aqua','speed'],
  batchMaster:['tray','amber','plus'], sharpBuyer:['jar','leaf','discount'], stoneListener:['pick','violet','coal'], brightSpark:['flask','cyan','bolt'],
  steadyCurrent:['generator','red','shield'],
};
const palettes = {
  amber:['#27162f','#74324b','#b8543a','#fc962d','#ffcf59','#fff0b5'],
  red:['#291231','#701d48','#ca294c','#f14a56','#ff9a65','#ffe4a4'],
  leaf:['#102929','#185438','#278748','#65b648','#b0e367','#f7f7bd'],
  aqua:['#142038','#144b62','#227f7d','#46b9a3','#81ecd0','#e3fff0'],
  cyan:['#161a38','#1d397a','#216da9','#3db3e1','#a0e9fc','#f0fdff'],
  violet:['#251637','#4d2764','#87459c','#b883e6','#e1b7f9','#fff0ff'],
  rose:['#321737','#6b2b68','#ba4b83','#e46c99','#ff9eae','#ffebe0'],
};
const borders = {
  common:'#a78370', uncommon:'#88bd7d', rare:'#96c7db', epic:'#ca9fe5', legendary:'#fac774', godly:'#fff0b9', unique:'#ffe09a',
};

const motifs = {
  basket:['M4 12h3V7h2V4h7v3h2v5h3v3h-2v5h-2v2H8v-2H6v-5H4z','M9 12h7V7H9zm-1 4h9v2H8zm2 3h2v2h-2zm4 0h2v2h-2z'],
  flower:['M11 2h4v2h3v5h4v5h-4v4h-5v4h-2v-5H7v-2H2v-4h3V7h4V4h2z','M10 9h5v5h-5zm3 7h3v2h-3z','M11 10h2v2h-2z'],
  compass:['M9 2h6v2h4v2h2v4h2v5h-2v4h-3v2h-4v2h-5v-2H5v-3H3v-4H1V9h2V6h3V4h3z','M11 6h7v6h-2v3h-3v2H7v-6h2V8h2z','M12 9h4v2h-3v3h-3v-2h2z'],
  heart:['M2 6h2V4h6v2h4V4h6v2h2v3h1v5h-2v3h-3v2h-3v2h-5v-2H7v-2H4v-3H2z','M4 7h5v2H6v3H4zm10 8h4v2h-2v2h-2z'],
  lens:['M8 2h9v2h3v4h2v5h-2v4h-4v2h-3v-1h-2l-6 6-4-4 6-6v-2H5V6h3z','M9 6h7v2h2v5h-2v2h-6v-2H8V8h1z','M10 7h4v2h-3v3H9V9h1z'],
  paw:['M2 6h4v1h1v5H3v-1H2zm6-4h4v1h1v6H9V8H8zm7 0h4v2h1v5h-5zm6 5h3v5h-1v2h-3v-3h1zM8 11h8v3h2v5h-3v2H8v-2H5v-4h3z','M9 14h5v2h2v3h-3v-2H8v1H7v-2h2z'],
  sun:['M11 0h2v4h-2zM3 4h2v3H3zm16 0h2v3h-2zM0 11h4v2H0zm20 0h4v2h-4zM7 7h3V5h5v2h3v3h2v5h-2v3h-3v2h-5v-2H7v-3H5v-5h2zm4 14h2v3h-2z','M10 9h5v2h2v4h-3v2h-4v-2H8v-4h2z','M10 10h3v3h-3z'],
  boot:['M10 3h10v3h2v9h-2v5H3v-2H1v-5h2v-2h3V9h4z','M12 6h6v2h-6zm0 4h6v2h-6zm-6 4h6v2H6zm-3 3h17v2H3z'],
  apple:['M13 2h3v3h-2v2h4v1h4v3h1v7h-2v3h-3v2H7v-2H4v-3H2v-7h2V8h3V7h4V5h2z','M5 10h5v2H8v3H5zm5 8h3v2h-3z','M16 2h5v2h-2v2h-4V4h1z'],
  crate:['M3 5h15v2h3v15H3V7H1V6h2z','M5 7h13v3H5zm1 12h13v2H6zm0-7h3v2h3v2h3v3h-2v-2h-3v-2H7z','M14 11h4v4h-4z'],
  feather:['M17 2h4v2h2v6h-2v3h-3v3h-3v2H9v2H6v2H2v-2h2v-2h2v-6h2V9h3V6h3V4h3z','M18 5h2v2h-2v2h-2v3h-3v2h-3v2H7v-2h2v-3h4V8h3V6h2z'],
  shield:['M3 4h5V2h8v2h5v10h-2v4h-3v3h-3v2h-2v-2H8v-3H5v-4H3z','M5 6h6v13H9v-4H7v-3H5zm8-1h5v4h-2V7h-3z','M14 14h3v3h-3z'],
  moon:['M12 2h6v2h-3v2h-2v3h-1v5h2v3h6v-2h3v4h-3v3H8v-2H5v-3H3V8h2V5h3V3h4z','M6 9h2v8h2v2h4v2H9v-2H7v-3H5v-5h1z'],
  wind:['M2 6h12V4h4v2h2v4h-3v1H8v2h12v-2h3v5h-3v2H8v2h8v2H7v-1H4v-4h4v-2H2v-1H0v-3h2v3h3v-3h3V9h7V7H2z','M9 6h7v2H9zm1 9h11v1H10zM5 19h4v1H5z'],
  bolt:['M13 1h8l-6 8h7l-4 5-5 4-3 5H5l5-10H3z','M13 4h4l-5 7h5l-6 6 2-6H8z'],
  mountain:['M11 2h3v2h2v3h2v3h2v4h2v5h2v3H0v-3h2v-4h3v-4h2V8h2V5h2z','M11 5h3v3h2v3h-3V9h-3v3H8v-2h1V8h2zM4 16h3v3h3v2H4z'],
  star:['M10 0h4v5h2v4h7v4h-4v2h-2v3h3v5h-4v-2h-3v-3h-2v3H8v2H4v-5h3v-3H5v-2H1V9h7V5h2z','M10 7h4v4h4v2h-4v4h-4v-4H6v-2h4z','M11 10h2v4h-2z'],
  hourglass:['M4 2h16v3h-2v4h-2v2h-2v2h2v2h2v4h2v3H4v-3h2v-4h2v-2h2v-2H8V9H6V5H4z','M8 6h8v2h-2v2h-4V8H8zm2 10h4v2h2v2H8v-2h2z'],
  hands:['M2 4h4v3h3v3h2v4h2v-4h2V7h3V4h4v10h-2v3h-3v4H7v-4H4v-3H2z','M5 9h3v3h2v4h4v-4h2V9h3v5h-2v3h-2v2H8v-3H6v-3H5z','M11 3h3v6h-4V5h1z'],
  berries:['M10 2h5v2h5v5h-2v3h4v7h-3v3h-6v-2H8v-2H4v-2H2v-5h2V8h4V5h2z','M5 10h4v2H7v3H4v-3h1zm9 1h3v2h3v3h-2v-2h-4z','M11 3h3v3h3v2h-5V6h-2V4h1z'],
  trees:['M8 1h3v3h2v3h2v3h2v2h4v3h2v5H13v3h-4v-3H1v-4h2v-4h2V9h2V5h1z','M8 6h2v3h2v3H6v-2h2zm0 7h4v3h2v1H4v-2h4zm9 2h3v3h-3z'],
  bridge:['M2 7h3V4h3v3h9V4h3v3h3v8h-4v3h-2v3h-3v-5h-3v5H7v-3H5v-3H1V8h1z','M5 8h3v5H5zm5 1h4v4h-4zm7-1h3v5h-3zM2 14h20v2H2z'],
  jar:['M5 3h14v5h-2v2h2v3h2v8h-2v2H5v-2H3v-8h2v-3h2V8H5z','M7 5h10v2H7zm0 8h10v2h2v4h-3v-3H7zm0 4h3v4H7z'],
  pick:['M7 3h9v2h4v2h3v7h-3v-3h-3V9h-3v4h-3v3H9v3H7v3H2v-4h3v-3h2v-3h2V9h2V7H6V5h1z','M9 4h7v2h4v2h-4V7H9zm3 5h2v3h-2v3h-3v2H7v3H4v-2h2v-3h2v-2h2v-2h2z'],
  flask:['M7 2h10v4h-2v6h2v3h3v6h-2v2H5v-2H3v-5h2v-3h2V9h1V6H7z','M9 5h4v8h2v4h3v3H5v-3h2v-3h2z','M7 17h7v3H7zm5-5h2v3h-2zm3 6h1v1h-1z'],
  pocket:['M3 3h18v13h-2v3h-3v3H8v-3H5v-3H3z','M4 5h16v4H4zm2 7h2v5H6zm3 5h2v3H9zm5 0h2v2h-2z','M5 6h14v1H5z'],
  trail:['M10 1h3v4h3v4h-2v3h-4v3h3v3h6v3h4v2H7v-2H4v-3H2v-5h2v-3h5V8h2V5h-1z','M12 7h1v2h-1zm-5 5h3v1H7zm-2 2h2v2H5zm3 4h2v2H8zm5 2h6v1h-6z','M2 20h2v2H2zm16-14h2v2h-2zM4 5h2v2H4z'],
  satchel:['M5 9h4V6h2V4h2V2h6v2h2v9h2v6h-2v2H5v-2H2v-8h3zm7 0h5V5h-3v2h-2z',
    'M3 12h18v5h-5v-2H9v2H3zm10-8h4v1h-4z','M10 13h4v4h-4zm-6 5h2v2H4z'],
  bed:['M4 3h4v2h9v-1h3v3h2v12h1v3h-4v-2H6v2H2v-3h1V7h1z','M5 6h6v4H5zm6 6h9v6h-9zM4 17h6v2H4z','M6 7h4v2H6zm5 5h7v1h-7z'],
  acorn:['M13 1h3v4h3v2h2v6h-2v5h-2v3h-4v2h-3v-2H7v-3H5v-5H3V7h2V5h3V4h5z','M5 7h13v5H5zm1 7h2v3H6zm2 4h3v2H8z','M7 7h2v2H7zm4 1h2v2h-2zm4-1h2v2h-2z'],
  crateStack:['M2 12h4V4h13v8h3v10H2z','M7 5h10v2H7zm1 3h3v2H8zm5 0h3v2h-3zm-9 5h7v2H4zm10 0h6v2h-6zm-2 4h2v4h-2z','M5 17h4v2H5zm11 1h3v1h-3z'],
  bee:['M8 1h4v3h3V2h4v2h2v5h-2v3h3v5h-3v3h-4v3h-5v-3H7v-3H4v-3H1V9h2V6h5z',
    'M8 7h4v2h-1v4H8v-2H5V9h3zm8-3h3v5h-2v2h-3V8h1V5h1z','M8 13h3v5H8zm6-2h3v8h-3zm5 3h2v3h-2z'],
  wateringCan:['M2 6h3v2h2v2h4V7h3V4h6v2h2v7h-2v4h-1v3H8v-2H6v-6H4V9H2zm14 1v3h3v-3zM2 13h2v3H2zm-2 4h2v3H0zm4 2h2v3H4z',
    'M8 12h9v6H8zm6-6h4v1h-4z','M9 13h2v4H9zm-6 0h1v2H3zm-3 5h1v2H0z'],
  stall:['M3 4h17v2h2v3h1v4h-3v9h-3v-3H7v3H4v-9H1V9h1V6h1z','M4 6h3v4H3V8h1zm7 0h3v4h-3zm7 0h2v2h1v2h-3zM6 14h12v4H6z','M7 7h3v4H7zm7 0h3v4h-3zM7 14h4v2H7z'],
  tractor:['M3 9h2V5h7v2H8v4h5V6h2v5h6v2h2v5h-1v3h-5v-2h-5v3H9v1H4v-2H2v-8h1z',
    'M5 13h5v2h2v4h-2v2H5v-2H3v-4h2zm13 3h3v4h-3z','M6 16h3v3H6zm12-4h3v1h-3z'],
  tray:['M2 9h2V5h4V4h3v4h3V5h4v2h3v2h2v5h-2v3h-2v3H5v-3H3v-3H1v-3h1z',
    'M3 11h18v4h-2v2H5v-2H3zm3 6h12v2H6z','M5 6h4v3H5zm10 1h3v3h-3zm-4 6h3v1h-3z'],
  generator:['M2 8h3V4h13v4h3v2h2v9h-3v3H4v-3H1v-9h1z','M6 6h10v2H6zm-2 5h14v7H4zm14 1h3v4h-3z',
    'M11 11h3l-2 2h3l-5 5 1-3H8zM5 19h2v2H5zm11 0h2v2h-2z'],
};

const inks = {
  apple:['#f37658','#bd3748','#b8e56b'], heart:['#f6656d','#9d2a54','#ffd4be'], berries:['#f0527a','#a22861','#a6d96f'],
  flower:['#f398c6','#a34f85','#ffe078'], trees:['#67b989','#30614e','#c0ec93'], acorn:['#d9a660','#89523a','#fff1ba'],
  basket:['#efb767','#8a5036','#fff1b2'], crate:['#e4aa63','#8c583a','#fff1b2'], crateStack:['#dba35e','#805038','#ffeab2'],
  pocket:['#8fb4e6','#426184','#eac7aa'], satchel:['#dca474','#895344','#fff0be'], trail:['#ddab75','#9e743f','#f1d2a0'],
  bed:['#aa9bdf','#694980','#fff9dc'], bee:['#ffc74c','#412938','#cce9fa'], bridge:['#e0b07b','#895e48','#f2e1b8'],
  tractor:['#e66656','#414750','#ffdb8a'], stall:['#e98658','#9c583f','#ffe4ab'], tray:['#d8955a','#633e45','#fff2a1'],
  jar:['#9bd8d6','#41878f','#ffe082'], pick:['#b98c5b','#5b4250','#eef0fa'], flask:['#c2e5ea','#488c9a','#c7f69c'],
  wateringCan:['#74c9e2','#3c7caa','#e6faff'], generator:['#ca9b76','#5a505b','#ffeb80'],
};

const marks = {
  apple:   ['....GG..','...YG...','..RRRR..','.RORRRR.','.RRRRRR.','.RRRRRR.','..RRRR..','...RR...'],
  eye:     ['........','..WWWW..','.WWBBWW.','WWBDDBWW','WWBDDBWW','.WWBBWW.','..WWWW..','........'],
  bolt:    ['....Y...','...YY...','..YYY...','.YYYYYY.','...YYY..','...YY...','..YY....','..Y.....'],
  boot:    ['...OOOO.','...OYOO.','...OOOO.','...OYOO.','.OOOOOO.','OOOOOOO.','YYYYYYYY','........'],
  plus:    ['...GG...','...GG...','...GG...','GGGGGGGG','GGGGGGGG','...GG...','...GG...','........'],
  flower:  ['...PP...','...PP...','.PPYYPP.','.PPYYPP.','...PP...','...GG...','.GGGG...','...G....'],
  sun:     ['...Y....','.Y...Y..','..OOO...','Y.OOO.Y.','..OOO...','.Y...Y..','...Y....','........'],
  speed:   ['.BB.BB..','..BB.BB.','...BB.BB','...BB.BB','..BB.BB.','.BB.BB..','........','........'],
  heart:   ['.RR..RR.','RORRRORR','RRRRRRRR','.RRRRRR.','..RRRR..','...RR...','........','........'],
  check:   ['......GG','.....GG.','....GG..','GG.GG...','.GGG....','..G.....','........','........'],
  bed:     ['........','O.......','OWW.....','OWWPPPP.','OPPPPPPP','OOOOOOOO','O......O','........'],
  moon:    ['...YY...','..YY....','.YY.....','.YY.....','.YY...Y.','..YYYYY.','...YYY..','........'],
  crate:   ['.OOOOOO.','OYOOOOYO','OYYOOYYO','OOYYYYOO','OYYOOYYO','OYOOOOYO','.OOOOOO.','........'],
  sprout:  ['.....GG.','....GGG.','.GG.G...','.GGGG...','...G....','..OOO...','.OOOOO..','........'],
  paw:     ['..PP.PP.','P.PP.PP.','PP.....P','PP.PP.PP','..PPPP..','.PPPPPP.','.PPPPPP.','........'],
  coin:    ['..YYYY..','.YYOOYY.','YYOYYOYY','YYOYYOYY','YYOOYOYY','.YYOOYY.','..YYYY..','........'],
  basket:  ['..OOO...','.O...O..','.O...O..','YYYYYYYY','OYYYYYYO','.OYOYYO.','..OOOO..','........'],
  discount:['...YY...','...YY...','...YY...','YYYYYYYY','.YYYYYY.','..YYYY..','...YY...','........'],
  coal:    ['...BB...','..BDDB..','.BDDDDB.','.DDDDDDD','DDDDDDDD','.DDDDDD.','........','........'],
  shield:  ['.BBBBBB.','.BWWBBB.','.BWWBBB.','.BBBBBB.','..BBBB..','..BBBB..','...BB...','........'],
};
const markColors = { Y:'#ffe29b', O:'#c38a53', R:'#fa7d78', G:'#9de480', P:'#eaa0d9', W:'#fff4df', B:'#8cd9f4', D:'#596486' };
const markPaths = Object.fromEntries(Object.entries(marks).map(([name, rows]) => [name,pixelPaths(rows)]));

function burst(seed, tier) {
  const rays = tier === 'unique' ? 15 : tier === 'godly' ? 12 : 9;
  const angle = seed * .7;
  return Array.from({ length:32 }, (_, y) => Array.from({ length:32 }, (_, x) => {
    if (x < 2 || x > 29 || y < 2 || y > 29) return '.';
    const dx = x - (13 + seed % 6), dy = y - (14 + seed % 5);
    const edge = Math.hypot(dx, dy);
    const light = Math.sin(Math.atan2(dy, dx) * rays + angle);
    const spark = (x * 53 + y * 131 + seed * 31) % 149;
    if (spark === 0 && edge > 11) return '5';
    if (edge < 8) return '1';
    if (light > .89 && edge < 18) return '4';
    if (light > .52) return '3';
    if (edge < 17 || light > -.2) return '2';
    return edge > 20 ? '0' : '1';
  }).join(''));
}

const tiles = Object.fromEntries(Object.keys(PERKS).map((id, seed) => {
  const [motif, color, mark] = art[id];
  const palette = palettes[color];
  return [id, { palette, colors:inks[motif] ?? [palette[4],palette[2],palette[5]], motif:motifs[motif], mark:markPaths[mark],
    backdrop:pixelPaths(burst(seed,PERKS[id].tier)) }];
}));

export function PerkIcon({ perk, className = '' }) {
  const tile = tiles[perk];
  if (!tile) return null;
  const { palette, colors, motif, mark, backdrop } = tile;
  const tier = PERKS[perk].tier;
  const special = ['unique','legendary','godly'].includes(tier);
  return <svg className={`perk-sprite ${className}`} viewBox="0 0 32 32" width="32" height="32" shapeRendering="crispEdges"
    data-perk={perk} data-tier={tier} aria-hidden="true">
    <path d="M0 0h32v32H0z" fill="#21192b"/>
    <path d="M2 1h28v1h1v28h-1v1H2v-1H1V2h1z" fill={borders[tier]}/>
    {Object.entries(backdrop).map(([i,d]) => <path key={i} d={d} fill={palette[i]}/>)}
    <g transform="translate(3 3)">
      <path d={motif[0]} fill="#20172b" stroke="#20172b" strokeWidth="3" strokeLinejoin="round" transform="translate(1 1)"/>
      <path d={motif[0]} fill={colors[0]} stroke="#251c32" strokeWidth="1.3" strokeLinejoin="round" fillRule="evenodd"/>
      <path d={motif[1]} fill={colors[1]} fillRule="evenodd"/>
      {motif[2] && <path d={motif[2]} fill={colors[2]}/>}
    </g>
    {special && <path d="M5 2h2v3H5v2H3V5H2V3h3zM25 4h2v1h2v2h-2v1h-2V7h-1V5h1z" fill={palette[5]}/>}
    {tier === 'unique' && <path d="M3 24h1v2h2v1H4v2H3v-2H1v-1h2zM28 13h1v2h2v1h-2v2h-1v-2h-2v-1h2z" fill="#fff1c9"/>}
    <path d="M22 20h7v1h2v8h-1v2H21v-1h-1v-8h2z" fill={borders[tier]}/>
    <path d="M22 21h7v1h1v7h-1v1h-7v-1h-1v-7h1z" fill="#221c2d"/>
    <g transform="translate(22 22)">{Object.entries(mark).map(([color,d]) => <path key={color} d={d} fill={markColors[color]}/>)}</g>
  </svg>;
}
