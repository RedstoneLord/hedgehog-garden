import { cloneElement, createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TooltipContext = createContext(null);

export function TooltipProvider({ children }) {
  const [tip, setTip] = useState(null);
  const hide = useCallback(id => setTip(current => current?.id === id ? null : current), []);
  const update = useCallback((id, label, detail) => {
    setTip(current => current?.id === id && (current.label !== label || current.detail !== detail)
      ? { ...current, label, detail } : current);
  }, []);

  return <TooltipContext value={{ active: tip?.id, show: setTip, hide, update }}>
    {children}
    {tip && createPortal(<TooltipBubble key={tip.id} tip={tip} hide={hide}/>, tip.anchor.closest('dialog') ?? document.body)}
  </TooltipContext>;
}

function TooltipBubble({ tip: { id, anchor, label, detail }, hide }) {
  const bubble = useRef(null);

  useLayoutEffect(() => {
    const node = bubble.current;
    function place() {
      const target = anchor.getBoundingClientRect();
      const frame = anchor.closest('.window-content, .tree-viewport')?.getBoundingClientRect();
      if (!anchor.isConnected || target.bottom < (frame?.top ?? 0) || target.top > (frame?.bottom ?? innerHeight)
        || target.right < (frame?.left ?? 0) || target.left > (frame?.right ?? innerWidth)) {
        hide(id);
        return;
      }
      const width = node.offsetWidth, height = node.offsetHeight;
      const x = Math.max(8, Math.min(innerWidth - width - 8, target.left + (target.width - width) / 2));
      const top = target.top - height - 8;
      const y = Math.max(8, Math.min(innerHeight - height - 8, top >= 8 ? top : target.bottom + 8));
      node.style.left = `${Math.round(x)}px`;
      node.style.top = `${Math.round(y)}px`;
    }

    function outside(event) {
      if (!anchor.contains(event.target)) hide(id);
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('pointerdown', outside, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('pointerdown', outside, true);
    };
  }, [anchor, detail, hide, id, label]);

  return <div ref={bubble} id={id} className="game-tooltip" role="tooltip">
    <strong>{label}</strong>
    {detail && <p>{detail}</p>}
  </div>;
}

export function Tooltip({ label, detail, tap = false, children }) {
  const id = useId();
  const { active, show, hide, update } = useContext(TooltipContext);
  const open = active === id;
  const props = children.props;
  useLayoutEffect(() => {
    if (open) return () => hide(id);
  }, [hide, id, open]);
  useLayoutEffect(() => {
    if (open) update(id, label, detail);
  }, [detail, id, label, open, update]);

  const enter = event => show({ id, anchor: event.currentTarget, label, detail });
  return cloneElement(children, {
    'aria-describedby': [props['aria-describedby'], open && id].filter(Boolean).join(' ') || undefined,
    onPointerEnter: event => { props.onPointerEnter?.(event); if (event.pointerType !== 'touch') enter(event); },
    onPointerLeave: event => { props.onPointerLeave?.(event); if (event.pointerType !== 'touch') hide(id); },
    onFocus: event => { props.onFocus?.(event); if (event.currentTarget.matches(':focus-visible')) enter(event); },
    onBlur: event => { props.onBlur?.(event); hide(id); },
    onKeyDown: event => {
      props.onKeyDown?.(event);
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        hide(id);
      }
    },
    onClick: event => {
      if (tap) enter(event);
      else hide(id);
      props.onClick?.(event);
    },
  });
}
