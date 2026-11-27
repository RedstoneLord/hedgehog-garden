import { pixelPaths } from './art.jsx';
import { PERKS } from './perks.js';

const art = {
  pockets:['basket','amber'], glean:['eye','leaf'], bloom:['flower','rose'], trail:['compass','aqua'], hearty:['heart','red'],
  satchel:['sack','amber'], sharp:['lens','violet'], steady:['paw','aqua'], early:['sun','amber'], runner:['boot','leaf'],
  oak:['leaf','leaf'], picker:['apple','red'], hauler:['crate','amber'], nimble:['feather','cyan'], dawn:['sun','red'],
  pollen:['compass','leaf'], sweep:['paw','rose'], iron:['shield','cyan'], sprint:['boot','red'], laden:['basket','violet'],
  moon:['moon','violet'], wind:['wind','cyan'], granary:['sack','rose'], bees:['hive','amber'], twilight:['apple','violet'],
  lightning:['bolt','cyan'], mountain:['mountain','aqua'], star:['star','violet'], marathon:['hourglass','amber'], handful:['hands','leaf'],
  orchardEye:['orchard','leaf'], rainmaker:['rain','cyan'], berryWhisperer:['berries','rose'], woodlandSense:['trees','aqua'],
  silverTongue:['coin','amber'], bridgekeeper:['bridge','violet'], longHauler:['crate','red'], roadCaptain:['wheel','aqua'],
  batchMaster:['gear','amber'], sharpBuyer:['jar','leaf'], stoneListener:['pick','violet'], brightSpark:['flask','cyan'], steadyCurrent:['plug','red'],
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
  eye:['M1 11h3V8h3V6h3V5h5v1h4v2h3v3h2v3h-3v2h-3v2H7v-2H4v-2H1z','M10 8h5v2h2v5h-2v2h-5v-2H8v-5h2zm-4 4h2v2H6z','M10 10h3v3h-3z'],
  flower:['M11 2h4v2h3v5h4v5h-4v4h-5v4h-2v-5H7v-2H2v-4h3V7h4V4h2z','M10 9h5v5h-5zm3 7h3v2h-3z','M11 10h2v2h-2z'],
  compass:['M9 2h6v2h4v2h2v4h2v5h-2v4h-3v2h-4v2h-5v-2H5v-3H3v-4H1V9h2V6h3V4h3z','M11 6h7v6h-2v3h-3v2H7v-6h2V8h2z','M12 9h4v2h-3v3h-3v-2h2z'],
  heart:['M2 6h2V4h6v2h4V4h6v2h2v3h1v5h-2v3h-3v2h-3v2h-5v-2H7v-2H4v-3H2z','M4 7h5v2H6v3H4zm10 8h4v2h-2v2h-2z'],
  sack:['M7 2h10v2h2v3h-3v3h3v4h2v6h-3v2H5v-2H2v-5h3v-4h3V8H6V5h1z','M8 7h8v2H8zm0 6h3v2H8zm4 4h6v3h-6z'],
  lens:['M8 2h9v2h3v4h2v5h-2v4h-4v2h-3v-1h-2l-6 6-4-4 6-6v-2H5V6h3z','M9 6h7v2h2v5h-2v2h-6v-2H8V8h1z','M10 7h4v2h-3v3H9V9h1z'],
  paw:['M2 6h4v1h1v5H3v-1H2zm6-4h4v1h1v6H9V8H8zm7 0h4v2h1v5h-5zm6 5h3v5h-1v2h-3v-3h1zM8 11h8v3h2v5h-3v2H8v-2H5v-4h3z','M9 14h5v2h2v3h-3v-2H8v1H7v-2h2z'],
  sun:['M11 0h2v4h-2zM3 4h2v3H3zm16 0h2v3h-2zM0 11h4v2H0zm20 0h4v2h-4zM7 7h3V5h5v2h3v3h2v5h-2v3h-3v2h-5v-2H7v-3H5v-5h2zm4 14h2v3h-2z','M10 9h5v2h2v4h-3v2h-4v-2H8v-4h2z','M10 10h3v3h-3z'],
  boot:['M10 3h10v3h2v9h-2v5H3v-2H1v-5h2v-2h3V9h4z','M12 6h6v2h-6zm0 4h6v2h-6zm-6 4h6v2H6zm-3 3h17v2H3z'],
  leaf:['M21 2h2v8h-2v4h-2v3h-3v3H8v-2H6v3H3v3H1v-4l6-5v-4h2V8h3V6h4V4h5z','M19 6h2v2h-2v3h-4v3h-3v3H8v-2h2v-3h4V9h5z'],
  apple:['M13 2h3v3h-2v2h4v1h4v3h1v7h-2v3h-3v2H7v-2H4v-3H2v-7h2V8h3V7h4V5h2z','M5 10h5v2H8v3H5zm5 8h3v2h-3z','M16 2h5v2h-2v2h-4V4h1z'],
  crate:['M3 5h15v2h3v15H3V7H1V6h2z','M5 7h13v3H5zm1 12h13v2H6zm0-7h3v2h3v2h3v3h-2v-2h-3v-2H7z','M14 11h4v4h-4z'],
  feather:['M17 2h4v2h2v6h-2v3h-3v3h-3v2H9v2H6v2H2v-2h2v-2h2v-6h2V9h3V6h3V4h3z','M18 5h2v2h-2v2h-2v3h-3v2h-3v2H7v-2h2v-3h4V8h3V6h2z'],
  shield:['M3 4h5V2h8v2h5v10h-2v4h-3v3h-3v2h-2v-2H8v-3H5v-4H3z','M5 6h6v13H9v-4H7v-3H5zm8-1h5v4h-2V7h-3z','M14 14h3v3h-3z'],
  moon:['M12 2h6v2h-3v2h-2v3h-1v5h2v3h6v-2h3v4h-3v3H8v-2H5v-3H3V8h2V5h3V3h4z','M6 9h2v8h2v2h4v2H9v-2H7v-3H5v-5h1z'],
  wind:['M2 6h12V4h4v2h2v4h-3v1H8v2h12v-2h3v5h-3v2H8v2h8v2H7v-1H4v-4h4v-2H2v-1H0v-3h2v3h3v-3h3V9h7V7H2z','M9 6h7v2H9zm1 9h11v1H10zM5 19h4v1H5z'],
  hive:['M10 3h4v2h4v2h2v3h2v7h-2v3h-3v2H7v-2H4v-3H2v-7h2V7h2V5h4z','M7 7h11v2H7zm-3 4h16v2H4zm0 5h5v2H4zm12 0h4v2h-4z','M9 14h5v6H9z'],
  bolt:['M13 1h8l-6 8h7l-4 5-5 4-3 5H5l5-10H3z','M13 4h4l-5 7h5l-6 6 2-6H8z'],
  mountain:['M11 2h3v2h2v3h2v3h2v4h2v5h2v3H0v-3h2v-4h3v-4h2V8h2V5h2z','M11 5h3v3h2v3h-3V9h-3v3H8v-2h1V8h2zM4 16h3v3h3v2H4z'],
  star:['M10 0h4v5h2v4h7v4h-4v2h-2v3h3v5h-4v-2h-3v-3h-2v3H8v2H4v-5h3v-3H5v-2H1V9h7V5h2z','M10 7h4v4h4v2h-4v4h-4v-4H6v-2h4z','M11 10h2v4h-2z'],
  hourglass:['M4 2h16v3h-2v4h-2v2h-2v2h2v2h2v4h2v3H4v-3h2v-4h2v-2h2v-2H8V9H6V5H4z','M8 6h8v2h-2v2h-4V8H8zm2 10h4v2h2v2H8v-2h2z'],
  hands:['M2 4h4v3h3v3h2v4h2v-4h2V7h3V4h4v10h-2v3h-3v4H7v-4H4v-3H2z','M5 9h3v3h2v4h4v-4h2V9h3v5h-2v3h-2v2H8v-3H6v-3H5z','M11 3h3v6h-4V5h1z'],
  orchard:['M2 8h3V5h3V3h6v2h4v4h3v6h-3v3h-4v5H9v-5H5v-3H2z','M5 8h5v3H8v3H5zm8 1h4v4h-4z','M14 10h2v2h-2zm-7 4h2v2H7z'],
  rain:['M7 4h3V2h6v2h4v3h3v5h-4v2h-4v-2H3v-2H1V7h6zm-2 11h3v3H5zm6 2h3v5h-3zm7-2h3v4h-3z','M10 5h6v2h3v2H8v2H5V8h5zm-3 11h2v2H7z'],
  berries:['M10 2h5v2h5v5h-2v3h4v7h-3v3h-6v-2H8v-2H4v-2H2v-5h2V8h4V5h2z','M5 10h4v2H7v3H4v-3h1zm9 1h3v2h3v3h-2v-2h-4z','M11 3h3v3h3v2h-5V6h-2V4h1z'],
  trees:['M8 1h3v3h2v3h2v3h2v2h4v3h2v5H13v3h-4v-3H1v-4h2v-4h2V9h2V5h1z','M8 6h2v3h2v3H6v-2h2zm0 7h4v3h2v1H4v-2h4zm9 2h3v3h-3z'],
  coin:['M8 2h9v2h4v4h2v9h-2v3h-4v2H8v-2H4v-3H2V8h2V4h4z','M8 5h9v2h3v10h-3v2H8v-2H5V8h3z','M11 7h3v3h3v3h-3v4h-3v-4H8v-3h3z'],
  bridge:['M2 7h3V4h3v3h9V4h3v3h3v8h-4v3h-2v3h-3v-5h-3v5H7v-3H5v-3H1V8h1z','M5 8h3v5H5zm5 1h4v4h-4zm7-1h3v5h-3zM2 14h20v2H2z'],
  wheel:['M8 2h8v2h4v3h2v4h1v5h-2v4h-4v2H8v-2H4v-4H2v-5H1V9h3V6h2V4h2z','M8 6h8v2h2v3h-4l-2-2-2 2H6V9h2zm-2 7h5v6H8v-3H6zm8 0h5v3h-2v3h-3z','M11 11h3v3h-3z'],
  gear:['M10 1h5v3h3l2-2 3 4-3 3v3h3v5h-3v2l-4 1v3h-6v-3H7l-2 2-4-4 3-3v-3H1V7h3l2-4 3 1h1z','M8 8h8v8H8zm2 2v4h4v-4z','M10 10h4v4h-4z'],
  jar:['M5 3h14v5h-2v2h2v3h2v8h-2v2H5v-2H3v-8h2v-3h2V8H5z','M7 5h10v2H7zm0 8h10v2h2v4h-3v-3H7zm0 4h3v4H7z'],
  pick:['M7 3h9v2h4v2h3v7h-3v-3h-3V9h-3v4h-3v3H9v3H7v3H2v-4h3v-3h2v-3h2V9h2V7H6V5h1z','M9 4h7v2h4v2h-4V7H9zm3 5h2v3h-2v3h-3v2H7v3H4v-2h2v-3h2v-2h2v-2h2z'],
  flask:['M7 2h10v4h-2v6h2v3h3v6h-2v2H5v-2H3v-5h2v-3h2V9h1V6H7z','M9 5h4v8h2v4h3v3H5v-3h2v-3h2z','M7 17h7v3H7zm5-5h2v3h-2zm3 6h1v1h-1z'],
  plug:['M7 1h3v6h4V1h3v6h3v5h-2v4h-4v5h-2v3H5v-3h4v-5H6v-2H4V7h3z','M6 9h12v2h-3v2H8v-2H6zm4 7h3v4h-3z','M8 8h7v2H8z'],
};

function burst(seed, tier) {
  const rays = tier === 'unique' ? 15 : tier === 'godly' ? 12 : 9;
  const angle = seed * .7;
  return Array.from({ length:32 }, (_, y) => Array.from({ length:32 }, (_, x) => {
    if (x < 2 || x > 29 || y < 2 || y > 29) return '.';
    const dx = x - (13 + seed % 6), dy = y - (14 + seed % 5);
    const edge = Math.hypot(dx, dy);
    const light = Math.sin(Math.atan2(dy, dx) * rays + angle);
    const spark = (x * 53 + y * 131 + seed * 31) % 121;
    if (spark === 0 && edge > 10) return '5';
    if (edge < 6 || light > .86 && edge < 18) return '4';
    if (edge < 12 || light > .58) return '3';
    if (edge < 17 || light > -.1) return '2';
    return edge > 20 ? '0' : '1';
  }).join(''));
}

const tiles = Object.fromEntries(Object.keys(PERKS).map((id, seed) => {
  const [motif, color] = art[id];
  return [id, { seed, palette:palettes[color], motif:motifs[motif], backdrop:pixelPaths(burst(seed,PERKS[id].tier)) }];
}));

export function PerkIcon({ perk, className = '' }) {
  const tile = tiles[perk];
  if (!tile) return null;
  const { seed, palette, motif, backdrop } = tile;
  const tier = PERKS[perk].tier;
  const special = ['unique','legendary','godly'].includes(tier);
  return <svg className={`perk-sprite ${className}`} viewBox="0 0 32 32" width="32" height="32" shapeRendering="crispEdges"
    data-perk={perk} data-tier={tier} aria-hidden="true">
    <path d="M0 0h32v32H0z" fill="#21192b"/>
    <path d="M2 1h28v1h1v28h-1v1H2v-1H1V2h1z" fill={borders[tier]}/>
    {Object.entries(backdrop).map(([i,d]) => <path key={i} d={d} fill={palette[i]}/>)}
    <g transform={`translate(${seed % 2 ? 4 : 3} 4)`}>
      <path d={motif[0]} fill={palette[0]} stroke={palette[0]} strokeWidth="3" strokeLinejoin="round" transform="translate(1 1)"/>
      <path d={motif[0]} fill={palette[4]} stroke="#251c32" strokeWidth="1.3" strokeLinejoin="round" fillRule="evenodd"/>
      <path d={motif[1]} fill={palette[2]} fillRule="evenodd"/>
      {motif[2] && <path d={motif[2]} fill={palette[5]}/>}
    </g>
    {special && <path d="M5 2h2v3H5v2H3V5H2V3h3zM29 25h1v5h-5v-2h2v-2h2zM25 4h2v1h2v2h-2v1h-2V7h-1V5h1z" fill={palette[5]}/>}
    {tier === 'unique' && <path d="M3 24h1v2h2v1H4v2H3v-2H1v-1h2zM28 13h1v2h2v1h-2v2h-1v-2h-2v-1h2z" fill="#fff1c9"/>}
  </svg>;
}
