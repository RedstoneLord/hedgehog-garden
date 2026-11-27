import { HedgeSprite, HouseArt } from './art.jsx';

export function MountainArt({ mine }) {
  return <svg viewBox="0 0 96 56" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="#465747" d="M1 49h9v-9h7V29h8V19h8V8h10V3h14v7h9v10h8v11h8v8h8v10h5v6H1z"/>
    <path fill="#657365" d="M10 49h9V38h8V26h8V13h9V7h12v8h10v10h7v13h10v12H10z"/>
    <path fill="#889080" d="M24 37h6V23h8v-9h7V8h11v7h6v5H48v9H37v8zm37 2h9v9h12v5H63z"/>
    <path fill="#526349" d="M10 47h11v-6h9v7h10v6H10zm60-10h9v7h7v7H70z"/>
    <path fill="#839451" d="M18 44h8v-4h5v4h6v4H18zm24-31h6V8h8v5h7v5H42zM75 43h7v4h6v4H75z"/>
    <path fill="#404941" d="M33 23h11v3H33zm29 4h12v3H62zM25 36h8v3h-8zm45 2h11v3H70zM43 49h20v4H43z"/>
    {mine && <>
      <path fill="#31262b" d="M29 53V36h5V26h9v-4h14v4h9v10h4v17z"/>
      <path fill="#19191e" d="M37 52V34h25v18z"/>
      <path fill="#7b4f36" d="M33 30h33v5H33zM36 35h6v17h-6zM58 35h6v17h-6z"/>
      <path fill="#aa794b" d="M34 30h31v2H34zM38 35h2v15h-2zm22 0h2v15h-2z"/>
      <path fill="#a29a77" d="M43 47h2v9h-3zm11 0h2l2 9h-3zM43 52h13v2H43z"/>
      <path fill="#e8b768" d="M29 37h4v5h-4zm39 0h4v5h-4z"/>
    </>}
  </svg>;
}

export function WheatArt({ ripe, dry }) {
  return <svg viewBox="0 0 32 30" shapeRendering="crispEdges" aria-hidden="true">
    <path fill={dry ? '#806b47' : '#5b583a'} d="M3 21h25v3h3v3H1v-3h2z"/>
    {[6, 13, 20, 26].map((x, i) => {
      const top = [4, 1, 5, 8][i] + (ripe ? 0 : 6);
      return <g key={x}>
        <path fill={ripe ? '#af762e' : '#66804c'} d={`M${x} ${top}h2v24h-2z`}/>
        <path fill={ripe ? '#e6ac45' : '#90a261'} d={`M${x-2} ${top+2}h6v3h-1v3h-4v-2h-1z M${x-2} ${top+9}h6v3h-2v3h-2v-2h-2z`}/>
        {ripe && <path fill="#ffe086" d={`M${x} ${top+2}h3v2h-3z M${x-1} ${top+9}h3v2h-3z`}/>}
      </g>;
    })}
  </svg>;
}

export function IndustryArt({ site, driver, operator }) {
  if (site.kind === 'house') return <HouseArt/>;
  if (site.kind === 'mine') return <div className={`mine-scene${site.mineAt ? ' mining' : ''}`}>
    <MountainArt mine/>
    {site.mineAt && operator && <HedgeSprite hedge={operator} className="mining-hedge"/>}
    {site.mineAt && <span className="coal-debris" aria-hidden="true"><i/><i/><i/></span>}
  </div>;
  if (site.kind === 'tractor') return <div className={`tractor-art${site.trip ? ' driving' : ''}${site.left === false ? ' mirror' : ''}`}>
    {driver && <div className="tractor-driver"><HedgeSprite hedge={{ ...driver, left: true }}/></div>}
    <svg viewBox="0 0 49 34" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="#302835" d="M2 29h42v4H2zM7 20h38v6H7zM8 4h4v14H8zm25 0h3v17h-3z"/>
      <path fill="#9f3938" d="M4 19h3v-6h5v-3h13v3h5v9h11v-8h5v12H4z"/>
      <path fill="#d55143" d="M7 14h21v7H5v-3h2zm28-2h10v3H34z"/>
      <path fill="#f77e5a" d="M10 13h15v2H10zM37 12h8v2h-8z"/>
      <path fill="#f7d584" d="M5 16h4v3H5z"/>
      <path fill="#514044" d="M14 17h2v4h-2zm4 0h2v4h-2zm4 0h2v4h-2z"/>
      {[[13, 26, 6], [36, 24, 9]].map(([x, y, size]) => <g className="tractor-wheel" style={{ transformOrigin: `${x}px ${y}px` }} key={x}>
        <path fill="#302835" d={`M${x-size+2} ${y-size}h${size*2-4}v2h2v${size*2-4}h-2v2h-${size*2-4}v-2h-2v-${size*2-4}h2z`}/>
        <rect x={x-size/2} y={y-size/2} width={size} height={size} fill="#918782"/>
        <rect x={x-size/3} y={y-size/3} width={size*.67} height={size*.67} fill="#63606b"/>
        <rect x={x} y={y-1} width="2" height="2" fill="#ceaf89"/>
      </g>)}
    </svg>
  </div>;
  return <div className={`workshop-scene${site.batch ? ' making' : ''}`}>
  <svg viewBox="0 0 68 53" shapeRendering="crispEdges" aria-hidden="true" className={site.batch ? 'working-shop' : ''}>
    <path fill="#354338" opacity=".35" d="M4 45h56v3h6v5H0v-4h4z"/>
    <path fill="#584142" d="M4 48V22h7v-7h9V9h9V6h22v6h9v7h5v29z"/>
    <path fill={site.level === 3 ? '#82837a' : '#c59964'} d="M10 24h48v23H10z"/>
    <path fill={site.level === 3 ? '#6e6e69' : '#9b674e'} d="M10 30h48v2H10zm0 7h48v2H10zm0 7h48v2H10z"/>
    <path fill={site.level === 3 ? '#374651' : '#934b43'} d="M3 21h7v-5h9v-6h9V7h24v6h8v6h7v7H3z"/>
    <path fill={site.level === 3 ? '#596c76' : '#c16c50'} d="M7 21h10v-5h7v-4h7V8h20v5H34v5H24v5H7z"/>
    <path fill="#503b39" d="M16 29h14v11H16zm22 0h13v19H38z"/>
    <path fill={site.batch ? '#f7bf66' : '#a2bb9e'} d="M18 31h10v7H18z"/>
    <path fill="#714d43" d="M22 31h2v7h-2zm18 1h9v16h-9z"/>
    <path fill="#d3af76" d="M39 47h12v2H39zM46 40h2v2h-2z"/>
    <path fill="#694843" d={site.level === 3 ? 'M45 2h10v18H45zM56 4h8v17h-8z' : 'M47 5h6v13h-6z'}/>
    <path className="workshop-smoke" fill="#d5c0ad" d="M47 1h5v2h-5zM52 0h7v2h-7z" />
    {site.level >= 2 && <path fill="#eab074" d="M11 26h7v2h-7zM54 26h6v2h-6z"/>}
  </svg>
    {site.batch && operator && <HedgeSprite hedge={operator} className="making-hedge"/>}
  </div>;
}
