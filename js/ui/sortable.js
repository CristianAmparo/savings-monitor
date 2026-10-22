import { h } from '../dom.js';
import { icon } from '../icons.js';
import { toast } from './toast.js';

// A reorderable list. Drag a row by its handle (touch or mouse), or focus the handle
// and use the arrow keys. items: [{ id, name }]. renderContent(item) returns the row's content.
// onReorder(ids) is called with the new id order after every change.
//
// While dragging, rows only move visually (transforms); the DOM is reordered on release,
// because moving the dragged element mid-gesture makes the browser drop the pointer.
export function sortableList(items, renderContent, onReorder) {
  const list = h('div', { class: 'list', role: 'list' });

  const currentIds = () => [...list.children].map((row) => Number(row.dataset.id));
  const commit = async (before) => {
    const ids = currentIds();
    if (ids.join() === before.join()) return;
    try {
      await onReorder(ids);
    } catch (error) {
      console.error(error);
      toast('Could not save the new order.', 'error');
    }
  };

  const buildRow = (item) => {
    const row = h('div', { class: 'list__row sortable__row', role: 'listitem', 'data-id': String(item.id) });

    const startDrag = (event) => {
      if (event.button > 0) return;
      event.preventDefault();
      const handle = event.currentTarget;
      const before = currentIds();
      const rows = [...list.children];
      const from = rows.indexOf(row);
      const rects = rows.map((r) => r.getBoundingClientRect());
      const height = rects[from].height;
      const startY = event.clientY;
      const minShift = rects[0].top - rects[from].top;
      const maxShift = rects[rows.length - 1].bottom - rects[from].bottom;
      let to = from;

      handle.setPointerCapture(event.pointerId);
      row.classList.add('sortable__row--dragging');

      const move = (e) => {
        const shift = Math.max(minShift, Math.min(maxShift, e.clientY - startY));
        row.style.transform = `translateY(${shift}px)`;
        const center = rects[from].top + height / 2 + shift;
        to = rows.filter((r, i) => i !== from && rects[i].top + rects[i].height / 2 < center).length;
        rows.forEach((r, i) => {
          if (i === from) return;
          let offset = 0;
          if (from < to && i > from && i <= to) offset = -height;
          if (from > to && i >= to && i < from) offset = height;
          r.style.transform = offset ? `translateY(${offset}px)` : '';
        });
      };

      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        rows.forEach((r) => (r.style.transform = ''));
        row.classList.remove('sortable__row--dragging');
        if (to !== from) list.insertBefore(row, to > from ? rows[to].nextElementSibling : rows[to]);
        commit(before);
      };

      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    };

    const onKey = (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      const before = currentIds();
      if (event.key === 'ArrowUp' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
      if (event.key === 'ArrowDown' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
      event.currentTarget.focus();
      commit(before);
    };

    const handle = h(
      'button',
      {
        class: 'sortable__handle',
        type: 'button',
        'aria-label': `Reorder ${item.name}. Drag, or use the up and down arrow keys.`,
        onPointerDown: startDrag,
        onKeyDown: onKey,
      },
      icon('grip-vertical', 20),
    );
    row.append(handle, h('div', { class: 'list__main' }, renderContent(item)));
    return row;
  };

  items.forEach((item) => list.append(buildRow(item)));
  return list;
}
