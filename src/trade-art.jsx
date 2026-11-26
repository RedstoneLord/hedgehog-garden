import { HedgeSprite, StrawberryPixels } from './art.jsx';

import { beardStyles, faces, hats, hairstyles, looks, outfits } from './customer-looks.js';

const standardFace = [
  'M9 10h4V7h16v3h4v7h3v8h-4v5h-4v4H15v-3h-4v-6H7v-8h2z',
  'M12 11h6V9h10v3h4v8h2v4h-3v5h-4v3H16v-3h-4v-6H9v-4h3z',
  'M13 13h5V9h9v4h4v7h-2v8h-3v2h-9v-3h-4z',
];

export function CustomerPortrait({ look, speaking = false }) {
  if (look === 'hedgehog') return <div className="customer-hedge"><HedgeSprite hedge={{quills:4,skin:2,hat:null,pose:0}} speaking={speaking}/></div>;
  const p = looks[look] ?? looks.traveler;
  const hat = hats[p.hat];
  const hair = hairstyles[p.hairStyle];
  const beard = beardStyles[p.beardStyle];
  const outfit = outfits[p.outfit];
  const [faceShadow, faceBase, faceLight] = faces[p.face] ?? standardFace;
  return <svg viewBox="0 0 42 49" className={`customer-portrait${speaking ? ' customer-speaking' : ''}`} aria-hidden="true" shapeRendering="crispEdges">
    <g className="portrait-body">
      {hair?.back && <path d={hair.back} fill={p.hair}/>}
      {p.long && <path d="M9 9h23v7h4v16h3v11h-7v-5H8v4H3V24h3V14h3z" fill={p.hair}/>}
      <path d="M3 43h3v-4h5v-3h6v-5h10v5h5v3h5v4h3v6H3z" fill={p.coat}/>
      <path d="M3 45h5v-4h6v-3h4v4h5v-4h5v3h6v4h5v4H3z" fill={p.seam}/>
      <path d="M17 29h10v8h3v3h-5v3h-7v-3h-5v-4h4z" fill={p.shade}/>
      <path d="M18 30h8v8h-8z" fill={p.skin}/>
      {p.suit && <><path d="M13 37h5v3h8v-3h5l-6 12h-8z" fill="#e9dcca"/><path d="M20 40h3v3h1v6h-5v-6h1z" fill={p.tie ?? '#634454'}/><path d="M10 38h6l3 11h-4v-5h-4zM27 38h6l-2 6h-4v5h-4z" fill={p.coat}/></>}
      {p.hood && <path d="M10 37h5v4h4v5h5v-5h5v-4h5v6h-4v6h-4v-3h-9v3h-4v-6h-3z" fill="#7a3441"/>}
      {outfit && <path d={outfit.cut} fill={outfit.detail}/>}
      {outfit?.accents?.map(({ fill, path }) => <path key={path} d={path} fill={fill}/>)}
      <g className="portrait-face">
        <path d={faceShadow} fill={p.shade}/>
        <path d={faceBase} fill={p.skin}/>
        <path d={faceLight} fill={p.light}/>
        <path d="M8 17h3v5H9v-2H8zM33 19h3v4h-3zM21 19h2v5h2v2h-5v-2h1zM14 25h4v1h-4zM27 25h3v1h-3z" fill={p.shade}/>
        {hair ? <><path d={hair.cap} fill={p.hair}/><path d={hair.shine} fill={p.glint}/></>
          : <><path d="M8 12h2V8h4V5h13v2h5v3h2v8h-3v-4h-4v-3h-6v2h-5v2h-3v4H9z" fill={p.hair}/><path d="M12 10h4V8h9V7h3v2h-7v2h-5v2h-4z" fill={p.glint}/></>}
        {hat && <><path d={hat[0]} fill={hat[1]}/><path d="M10 10h16V8h6v2h3v1H10z" fill={hat[2]}/></>}
        <path d="M13 17h6v1h-6zM24 17h6v1h-6z" fill={p.hair}/>
        <g className="portrait-eyes">
          <path d={p.narrowEyes ? 'M14 20h5v2h-5zM24 20h5v2h-5z' : 'M13 19h6v3h-6zM24 19h5v3h-5z'} fill={p.narrowEyes ? '#e6c6a8' : '#fff1d9'}/>
          <path d={p.narrowEyes ? 'M16 20h2v2h-2zM26 20h2v2h-2z' : 'M16 19h2v3h-2zM25 19h2v3h-2z'} fill={p.eyes}/>
        </g>
        <path className="portrait-blink" d="M13 19h6v2h-6zM24 19h5v2h-5z" fill={p.shade}/>
        {p.glasses && <path d={p.glasses === 'round'
          ? 'M12 19h1v-1h6v1h1v3h-1v1h-6v-1h-1zM23 19h1v-1h5v1h1v3h-1v1h-5v-1h-1zM20 20h3M10 19h2M30 19h2'
          : 'M12 18h8v5h-8zM23 18h7v5h-7zM20 20h3'} fill="none" stroke={p.glasses === 'round' ? '#be9c75' : '#584553'}/>}
        {p.beard && <path d="M13 25h2v3h3v2h9v-2h2v-3h2v6h-4v3H16v-2h-3z" fill={p.hair}/>}
        {beard && <><path d={beard.outline} fill={beard.color}/><path d={beard.texture} fill={beard.highlight}/></>}
        {(p.beard || beard || p.mustache) && <path d="M17 25h4v-1h4v1h3v2h-5v-1h-2v1h-4z" fill={p.hair}/>}
        <path d="M18 28h7v1h-7z" fill="#743e44"/>
        <path className="portrait-mouth" d="M18 27h7v1h1v2h-2v1h-5v-1h-2v-2h1z" fill="#633443"/>
        <path className="portrait-mouth" d="M19 28h5v1h-5z" fill="#f7d4ad"/>
      </g>
      {look === 'artist' && <path d="M9 43h9v3H9zM29 45h3v3h-3zM33 41h2v2h-2z" fill="#cb867f"/>}
      {look === 'teacher' && <><path d="M5 43h9v2h2v4H5z" fill="#674959"/><path d="M5 44h8v1H5zM6 47h9v1H6z" fill="#e2bf94"/></>}
      {look === 'porter' && <path d="M10 39h4v10h-4zM27 37h4v12h-4zM11 41h2v1h-2zM28 40h2v1h-2z" fill="#d0a26d"/>}
      {look === 'singer' && <path d="M31 32h3v1h1v4h-2v9h-2v-9h-2v-4h2z" fill="#4c4d61"/>}
    </g>
  </svg>;
}

export function CustomerSprite({ look, walking, left }) {
  if (look === 'hedgehog') return <HedgeSprite hedge={{quills:4,skin:2,left,pose:0}} walking={walking}/>;
  const p = looks[look] ?? looks.traveler;
  const hair = hairstyles[p.hairStyle];
  const beard = beardStyles[p.beardStyle];
  const outfit = outfits[p.outfit];
  return <svg viewBox="0 0 15 22" className={`map-customer-art${walking ? ' customer-walking' : ''}`} aria-hidden="true" shapeRendering="crispEdges">
    <g transform={left ? 'translate(15 0) scale(-1 1)' : undefined}>
      <g className="customer-leg-a"><path d="M4 15h4v5H7v1H3v-2h1z" fill="#41404b"/></g>
      <g className="customer-leg-b"><path d="M8 15h3v4h2v2H9v-1H8z" fill="#393641"/></g>
      <path d="M4 8h7v2h2v6h-3v1H5v-1H2v-5h2z" fill={p.coat}/>
      <path d="M4 10h2v4H4zM10 10h2v3h-2z" fill={p.seam}/>
      <path d="M4 2h2V1h5v2h2v4h-2v2H6V7H4z" fill={p.skin}/>
      <path d={hair?.map ?? 'M4 2h2V1h5v1h2v2h-2V3H7v1H5v2H4z'} fill={p.hair}/>
      {p.hat && <path d="M3 2h2V0h6v2h3v2H3z" fill={hats[p.hat][1]}/>}
      <path d="M10 5h1v1h-1z" fill={p.eyes}/>
      {p.glasses === 'round' && <path d="M8 5h4v1H8z" fill="#b0967f"/>}
      {outfit && <path d={outfit.map} fill={outfit.detail}/>}
      {beard && <path d={beard.map} fill={beard.highlight}/>}
      {p.suit && <path d="M7 9h2v4H7z" fill="#e7cfb4"/>}
      {look === 'teacher' && <path d="M2 13h4v3H2zM2 5h2v3H2z" fill="#674959"/>}
      {look === 'porter' && <path d="M5 9h1v7H5zM9 9h1v7H9z" fill="#d0a26d"/>}
    </g>
  </svg>;
}

export function MarketStallArt({ level = 0, levels, stock }) {
  return <svg viewBox="0 0 50 36" className="market-stall-art" aria-hidden="true" shapeRendering="crispEdges">
    <g className="market-awning">
      <path d="M6 12h3v17H6zM42 12h3v17h-3zM8 10h35v4H8z" fill="#604330"/>
      <path d="M3 4h44v3h2v7H1V7h2z" fill="#733b44"/>
      <path d="M5 5h7v7H3V8h2zm16 0h7v7h-7zm16 0h8v3h2v4H37z" fill={level ? '#e6b978' : '#dca87b'}/>
      <path d="M1 12h48v2H1zM3 14h4v2H3zm13 0h6v2h-6zm13 0h6v2h-6zm13 0h5v2h-5z" fill="#ab5a57"/>
      {level > 0 && <path d="M20 15h11v5H20z" fill="#c3935a"/>}
    </g>
    <path d="M4 25h42v3h2v3h-3v4H6v-4H2v-4h2z" fill="#694632"/>
    <path d="M4 27h42v2H4zM7 31h36v3H7z" fill="#ae7650"/>
    <path d="M7 32h3v3H7zM40 32h3v3h-3zM14 31h2v3h-2zM22 31h2v3h-2zM33 31h2v3h-2z" fill="#865a42"/>
    <path d="M10 22h13v4H10zM29 22h11v4H29z" fill="#85643e"/>
    <path d="M5 5h41v1H5zM5 28h38v1H5zM8 32h4v1H8zM24 32h8v1h-8zM37 31h5v1h-5z" fill="#c08d65" opacity=".52"/>
    {levels?.shelves > 0 && <path d="M10 16h10v2H10zm20 0h10v2H30zM11 19h2v3h-2zm25 0h2v3h-2z" fill="#b38359"/>}
    {levels?.queue > 0 && <path d="M0 32h3v4H0zm47 0h3v4h-3z" fill="#deb484"/>}
    {levels?.value > 0 && <path className="market-lantern" d="M4 15h3v5H4zm39 0h3v5h-3z" fill="#ffcf77"/>}
    {(stock?.jam || stock?.mixedJam || stock?.compote || stock?.berryCompote) > 0 && <path d="M25 20h3v4h-3zm4 0h3v4h-3z" fill="#ac5481"/>}
    {stock?.apples > 0 && <>
      <path d="M10 21h3v2h-3zM14 20h4v3h-4zM19 21h3v2h-3z" fill="#b5564b"/>
      <path d="M10 21h1v1h-1zM14 20h2v1h-2zM19 21h1v1h-1z" fill="#e08569"/>
    </>}
    {stock?.berries > 0 && <><StrawberryPixels small x={30} y={18}/><StrawberryPixels small x={35} y={19}/></>}
  </svg>;
}

const strawberryPositions = [[1, 7], [14, 6], [8, 9]];

export function BerryBushArt({ fruit, drying = false, watered = false }) {
  const [shadow, leaves, light] = drying ? ['#555e3b', '#84854d', '#afac62'] : ['#2b543d', '#5e8647', '#a6b760'];
  return <svg viewBox="0 0 24 19" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M5 16h14v1h2v1H3v-1h2z" fill={watered ? '#635647' : '#84734b'}/>
    <path d="M10 2h4v1h2v2h3v1h2v1h2v4h-2v2h-4v2h-4v2h-3v-2H7v-2H4v-2H2V7h2V6h3V5h2V3h1z" fill={shadow}/>
    <path d="M10 3h4v1h2v4h-2v2h-2v3h-2v-3H8V7h1V5h1zM3 8h2V7h4v1h1v3h-2v2H6v-1H4v-1H3zM17 6h3v1h2v4h-2v1h-4v1h-3v-2h1V9h2V7h1z" fill={leaves}/>
    <path d="M11 4h2v1h-1v3h-1v2h-1V7h1zM5 8h3v1H7v1H5v1H4V9h1zM17 7h2v1h-1v1h-2v1h-2V9h2V8h1z" fill={light}/>
    {strawberryPositions.slice(0, Math.ceil(fruit / 4)).map(([x, y]) => <StrawberryPixels key={x} x={x} y={y}/>)}
  </svg>;
}

export function MarketLandscape() {
  return <svg className="market-landscape" viewBox="0 0 160 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M0 0h160v92H0z" fill="#8cb7af"/>
    <path d="M0 11h19v2h24v3H0zM86 9h24V6h17v3h11v3H86zM120 21h14v2h26v3h-40z" fill="#c0d1b3"/>
    <path d="M0 39h7v-5h6v-5h12v-4h13v4h12v4h14v3h23v-3h13v-5h17v4h9v3h19v6h15v51H0z" fill="#618d7d"/>
    <path d="M0 43h12v-4h16v3h18v-3h17v3h15v3h19v-4h19v-4h17v1h14v5h13v49H0z" fill="#4a7666"/>
    <path d="M0 52h10v-4h9v-7h7v6h7v4h12v-6h6v3h9v6h52v-5h6v-5h8v4h4v5h12v-6h6v-5h7v7h5v43H0z" fill="#42684b"/>
    <path d="M0 61h20v-5h13v3h16v-3h29v3h20v-3h17v2h19v-3h26v37H0z" fill="#889461"/>
    <path d="M0 77h14v-3h31v-4h72v3h27v3h16v16H0z" fill="#b5a173"/>
    <path d="M1 84h29v-2h27v2h20v2H4zM108 77h22v2h24v2h-37zM69 88h28v2H69z" fill="#9e8a62"/>
    <path d="M13 69h4v2h-4zm19-3h5v1h-5zm93 0h5v2h-5zm12 3h6v1h-6z" fill="#c3b579"/>
    <path d="M4 57h2v3H4zm8 6h1v3h-1zm8-12h1v4h-1zm70 10h2v3h-2zm22-3h2v2h-2zm30 4h2v3h-2zM154 67h3v2h-3z" fill="#62835e"/>
    <path d="M13 58h5v1h-5zm21 3h3v1h-3zm56 6h4v1h-4zm38-4h7v1h-7zm18 7h4v1h-4zM152 57h4v1h-4z" fill="#a4a777"/>
    <path d="M6 81h7v1H6zm13-4h5v1h-5zm37 5h9v1h-9zm48-5h6v1h-6zm36 6h8v1h-8z" fill="#d4b98a"/>
  </svg>;
}
