import { useEffect, useRef } from 'react';

export function useModalFocus(open, onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement;
    const dialog = ref.current;
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
    const frame = requestAnimationFrame(() => (focusable()[0] || dialog).focus());
    function keydown(event) {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); dialog.focus(); return; }
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return ref;
}
