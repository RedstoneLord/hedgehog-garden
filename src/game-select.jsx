import { useId, useRef, useState } from 'react';
import { Glyph } from './art.jsx';

export function GameSelect({ label, value, options, onChange, disabled = false }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const control = useRef(null);
  const choice = options.find(option => option.value === value);

  function close(returnFocus) {
    setOpen(false);
    if (returnFocus) control.current.focus();
  }
  function navigate(event) {
    const { key } = event;
    if (open && key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key) || disabled) return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      requestAnimationFrame(() => {
        const list = control.current?.parentElement.querySelectorAll('[role="option"]:not(:disabled)');
        if (!list?.length) return;
        if (key === 'ArrowUp' || key === 'End') list[list.length - 1].focus();
        else (Array.from(list).find(option => option.getAttribute('aria-selected') === 'true') ?? list[0]).focus();
      });
      return;
    }
    const list = [...event.currentTarget.querySelectorAll('[role="option"]:not(:disabled)')];
    const active = list.indexOf(document.activeElement);
    const index = key === 'Home' ? 0 : key === 'End' ? list.length - 1 : Math.max(0, Math.min(list.length - 1, active + (key === 'ArrowUp' ? -1 : 1)));
    list[index]?.focus();
  }

  return <div className="orchard-select game-select" onKeyDown={navigate}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(false); }}>
    <span id={`${id}-label`}>{label}</span>
    <button ref={control} type="button" className="game-select-toggle" role="combobox" aria-controls={`${id}-options`}
      aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}>
      <span id={`${id}-value`}>{choice?.label ?? 'Выбрать'}</span><Glyph name="down"/>
    </button>
    {open && <div className="game-select-options" role="listbox" id={`${id}-options`} aria-labelledby={`${id}-label`}>
      {options.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value}
        className="game-select-option" disabled={option.disabled} onClick={() => { onChange(option.value); close(true); }}>
        <span>{option.label}</span>{option.value === value && <Glyph name="check"/>}
      </button>)}
    </div>}
  </div>;
}
