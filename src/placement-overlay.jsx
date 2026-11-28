import { useEffect, useRef } from 'react';
import { industryStations } from './industry.js';
import { MARKET_REACH, soilRate } from './siting.js';
import { landSite, marketSite } from './trade.js';
import { WORLD } from './terrain.js';

function blend(color, target, fraction) {
  return color.map((component, index) => Math.round(component + (target[index] - component) * fraction));
}

const poor = [219,71,76];
const fair = [244,184,74];
const good = [114,214,95];
const terrainColors = Array.from({ length:101 }, (_, score) => score <= 50
  ? blend(poor,fair,score/50) : blend(fair,good,(score-50)/50));

export function PlacementOverlay({ state, mode, plots, gardens, movingPlot, movingStall, rivals }) {
  const canvas = useRef(null);
  const input = useRef(null);
  input.current = { state, plots, gardens, movingPlot };
  const market = mode === 'market';
  const stations = industryStations(state).filter(site => site.kind !== 'tractor');
  const layout = JSON.stringify([movingPlot, ...plots, ...gardens,
    ...[...stations, ...state.trade.stalls, ...state.trade.wild].map(({id,x,y}) => [id,x,y])]);

  useEffect(() => {
    const node = canvas.current;
    const context = node.getContext('2d');
    if (!context) return;
    const { state, plots, gardens, movingPlot } = input.current;
    const snapshot = { ...state, industry:{ ...state.industry, tractors:[] } };
    const neighbors = gardens.filter(plot => plot !== movingPlot);
    const image = context.createImageData(node.width, node.height);
    let row = 0;
    let frame;
    function paint() {
      const end = Math.min(node.height, row + 8);
      for (; row < end; row++) {
        const y = WORLD.y + (row + .5) * WORLD.height / node.height;
        for (let col = 0; col < node.width; col++) {
          const point = { x:WORLD.x + (col + .5) * WORLD.width / node.width, y };
          const site = market ? marketSite(snapshot, point, plots, movingStall) : landSite(snapshot, point, plots, movingPlot);
          const yieldRate = site ? market ? site.demand : soilRate(site, neighbors) : 0;
          const offset = (row * node.width + col) * 4;
          image.data.set(terrainColors[Math.round(Math.min(1,yieldRate)*100)],offset);
          image.data[offset+3] = site ? 110 : 39;
        }
      }
      if (row < node.height) frame = requestAnimationFrame(paint);
      else context.putImageData(image, 0, 0);
    }
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [layout, market, mode, movingStall]);

  return <div className="placement-overlay" aria-hidden="true">
    <canvas ref={canvas} width={market ? 200 : 145} height={market ? 144 : 104}
      style={{ left:WORLD.x, top:WORLD.y, width:WORLD.width, height:WORLD.height }}/>
    {market && state.trade.stalls.filter(stall => stall.id !== movingStall).map(stall =>
      <div key={stall.id} className="market-reach" data-competing={rivals?.includes(stall) || undefined}
        style={{ left:stall.x, top:stall.y, width:MARKET_REACH * 2, height:MARKET_REACH * 2 }}/>)}
  </div>;
}
