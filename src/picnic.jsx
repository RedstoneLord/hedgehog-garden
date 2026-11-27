import { memo } from 'react';
import { BasketArt, HedgeSprite } from './art.jsx';
import { WORLD } from './terrain.js';
import { Tooltip } from './tooltip.jsx';
import blanket from './picnic-blanket.png?inline';
import './picnic.css';

export const PICNIC_SPOT = { x:WORLD.x + 378, y:WORLD.y + 550 };
const position = { left:PICNIC_SPOT.x, top:PICNIC_SPOT.y, zIndex:PICNIC_SPOT.y - WORLD.y };
const fedya = { quills:1, skin:0, pose:0, hat:'leaf' };
const sasha = { quills:2, skin:2, pose:0, left:true };

export const PicnicScene = memo(function PicnicScene() {
  return <Tooltip label="Федя и Саша" tap>
    <button type="button" className="map-item picnic" style={position} aria-label="Федя и Саша на пикнике">
      <img className="picnic-blanket" src={blanket} alt="" draggable={false}/>
      <span className="picnic-hedge picnic-fedya"><HedgeSprite hedge={fedya} eyesClosed/></span>
      <span className="picnic-hedge picnic-sasha"><HedgeSprite hedge={sasha} eyesClosed/></span>
      <span className="picnic-basket"><BasketArt level={1}/></span>
      <span className="picnic-hearts" aria-hidden="true"><i/><i/><i/></span>
    </button>
  </Tooltip>;
});
