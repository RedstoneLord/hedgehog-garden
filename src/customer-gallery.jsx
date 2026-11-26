import { useState } from 'react';
import { Glyph } from './art.jsx';
import { CUSTOMERS } from './customers.js';
import { Tooltip } from './tooltip.jsx';
import { CustomerPortrait, CustomerSprite } from './trade-art.jsx';

const categories = { all: 'Все', regular: 'Постоянные', traveler: 'Путники', unique: 'Особые' };
const categoryOf = customer => customer.unique ? 'unique' : customer.regular ? 'regular' : 'traveler';

export function CustomerGallery({ seen }) {
  const [category, filter] = useState('all');
  const [preview, play] = useState({ id: null, serial: 0 });
  const customers = Object.entries(CUSTOMERS).filter(([, customer]) => category === 'all' || categoryOf(customer) === category);
  return <section className="customer-gallery" aria-label="Галерея посетителей">
    <div className="gallery-filters" role="group" aria-label="Кто приходит в лавку">
      {Object.entries(categories).map(([id, label]) =>
        <button type="button" key={id} className="pixel-button mini" aria-pressed={category === id}
          onClick={() => filter(id)}>{label}</button>)}
    </div>
    <ul className="gallery-grid">
      {customers.map(([id, customer]) => seen.includes(id) ? <li key={id} className="gallery-card pixel-window">
        <div className="gallery-art">
          <div className="gallery-portrait" role="img" aria-label={`Портрет · ${customer.name}`}>
            <CustomerPortrait key={preview.id === id ? preview.serial : 'still'} look={customer.look} speaking={preview.id === id}/>
          </div>
          <div className="gallery-map-sprite" role="img" aria-label={`Спрайт на карте · ${customer.name}`}>
            <CustomerSprite look={customer.look} walking={preview.id === id} left={false}/>
          </div>
        </div>
        <div className="gallery-caption">
          <div><h3>{customer.name}</h3><small>{categories[categoryOf(customer)]}</small></div>
          <Tooltip label="Показать анимацию"><button type="button" className="pixel-button square mini"
            aria-label={`Показать анимацию · ${customer.name}`}
            onClick={() => play(current => ({ id, serial: current.serial + 1 }))}><Glyph name="play"/></button></Tooltip>
        </div>
      </li> : <li key={id} className="gallery-card pixel-window gallery-locked" aria-label="Посетитель ещё не встречен">
        <div className="gallery-art" aria-hidden="true"><Glyph name="lock"/></div>
        <div className="gallery-caption"><h3>???</h3></div>
      </li>)}
    </ul>
  </section>;
}
