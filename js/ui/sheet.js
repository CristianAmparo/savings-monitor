import { h } from '../dom.js';
import { iconButton, button } from './components.js';

let sheetCount = 0;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Opens a bottom sheet (dialog on desktop). build(close) must return the body node(s).
export function openSheet(title, build, { onClose } = {}) {
  const root = document.getElementById('overlay-root');
  const previous = document.activeElement;
  const titleId = `sheet-title-${++sheetCount}`;
  let overlay;

  const close = () => {
    if (!overlay) return;
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    overlay = null;
    if (previous && previous.focus) previous.focus();
    if (onClose) onClose();
  };

  const onKey = (event) => {
    if (!overlay || root.lastElementChild !== overlay) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      const items = [...overlay.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const sheet = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h(
      'div',
      { class: 'sheet__head' },
      h('h2', { class: 't-h2', id: titleId }, title),
      iconButton({ iconName: 'x', label: 'Close', onClick: close }),
    ),
    build(close),
  );
  overlay = h('div', { class: 'overlay', onMouseDown: (event) => event.target === overlay && close() }, sheet);
  root.append(overlay);
  document.addEventListener('keydown', onKey);

  const firstField = sheet.querySelector('input, select, textarea');
  (firstField || sheet.querySelector('button')).focus();
  return { close };
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', destructive = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (value, close) => {
      answered = true;
      resolve(value);
      close();
    };
    openSheet(
      title,
      (close) =>
        h(
          'div',
          null,
          h('p', { class: 't-body text-muted' }, message),
          h(
            'div',
            { class: 'sheet__actions' },
            button({ label: confirmLabel, variant: destructive ? 'destructive' : 'primary', onClick: () => answer(true, close) }),
            button({ label: 'Cancel', variant: 'secondary', onClick: () => answer(false, close) }),
          ),
        ),
      { onClose: () => !answered && resolve(false) },
    );
  });
}
