import { h } from '../dom.js';
import { icon } from '../icons.js';
import { peso } from '../format.js';

export function button({ label, variant = 'secondary', iconName, size, block, onClick, type = 'button', disabled }) {
  const classes = ['btn', `btn--${variant}`];
  if (size) classes.push(`btn--${size}`);
  if (block) classes.push('btn--block');
  return h(
    'button',
    { class: classes.join(' '), type, onClick, disabled },
    iconName && icon(iconName, 20),
    label,
  );
}

export function iconButton({ iconName, label, onClick, href, className = '' }) {
  const tag = href ? 'a' : 'button';
  return h(tag, { class: `icon-btn ${className}`.trim(), 'aria-label': label, title: label, onClick, href, type: href ? null : 'button' }, icon(iconName, 24));
}

export function pageHeader({ title, back, actions = [] }) {
  return h(
    'header',
    { class: 'page-header' },
    back && iconButton({ iconName: 'chevron-left', label: 'Back', href: back, className: 'page-header__back' }),
    h('h1', { class: 'page-header__title t-h1' }, title),
    actions,
  );
}

export function card(children, { flush = false } = {}) {
  return h('div', { class: flush ? 'card card--flush' : 'card' }, children);
}

export function stat(label, value, { hero = false, tone } = {}) {
  const toneClass = tone ? ` text-${tone}` : '';
  return h(
    'div',
    { class: hero ? 'stat stat--hero' : 'stat' },
    h('span', { class: 'stat__label' }, label),
    h('span', { class: `stat__value${toneClass}` }, value),
  );
}

export function badge(text, tone = 'neutral') {
  return h('span', { class: `badge badge--${tone}` }, text);
}

export function alertBox(tone, children, iconName = 'alert-circle') {
  return h('div', { class: `alert alert--${tone}`, role: tone === 'error' ? 'alert' : null }, icon(iconName, 20), h('div', { class: 'alert__body' }, children));
}

export function emptyState({ iconName = 'inbox', title, hint, action }) {
  return h(
    'div',
    { class: 'empty' },
    icon(iconName, 24),
    h('div', { class: 'empty__title' }, title),
    hint && h('div', { class: 't-label' }, hint),
    action,
  );
}

export function progress(ratio, tone) {
  const percent = Math.max(0, Math.min(100, ratio * 100));
  return h(
    'div',
    {
      class: tone ? `progress progress--${tone}` : 'progress',
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(Math.round(percent)),
      style: `--value:${percent.toFixed(1)}`,
    },
    h('div', { class: 'progress__bar' }),
  );
}

// Segmented control. items: [{ value, label }]
export function tabs(items, selected, onSelect, ariaLabel) {
  return h(
    'div',
    { class: 'tabs', role: 'tablist', 'aria-label': ariaLabel },
    items.map((item) =>
      h(
        'button',
        {
          class: 'tabs__tab',
          type: 'button',
          role: 'tab',
          'aria-selected': String(item.value === selected),
          onClick: () => onSelect(item.value),
        },
        item.label,
      ),
    ),
  );
}

export function periodNav({ label, onPrev, onNext, prevLabel = 'Previous', nextLabel = 'Next' }) {
  return h(
    'div',
    { class: 'period-nav' },
    iconButton({ iconName: 'chevron-left', label: prevLabel, onClick: onPrev }),
    h('div', { class: 'period-nav__label', 'aria-live': 'polite' }, label),
    iconButton({ iconName: 'chevron-right', label: nextLabel, onClick: onNext }),
  );
}

export function listRow({ title, sub, value, valueSub, valueTone, href, onClick }) {
  const children = [
    h('div', { class: 'list__main' }, h('span', { class: 'list__title' }, title), sub && h('span', { class: 'list__sub' }, sub)),
    value != null &&
      h(
        'div',
        { class: `list__value${valueTone ? ` text-${valueTone}` : ''}` },
        value,
        valueSub && h('span', { class: 'list__value-sub' }, valueSub),
      ),
    (href || onClick) && icon('chevron-right', 20),
  ];
  if (href) return h('a', { class: 'list__row', href }, children);
  if (onClick) return h('button', { class: 'list__row', type: 'button', onClick }, children);
  return h('div', { class: 'list__row' }, children);
}

// Shared wording for "expected vs actual" comparisons (home card and targets).
export function targetStatus(expected, actual) {
  const diff = actual - expected;
  const ratio = expected > 0 ? actual / expected : 0;
  const percent = expected > 0 ? Math.round(ratio * 100) : 0;
  const detail = `${peso(actual)} of ${peso(expected)}${expected > 0 ? ` · ${percent}%` : ''}`;
  if (diff < 0) return { tone: 'warning', title: `${peso(-diff)} to go`, detail, ratio, diff };
  if (diff === 0) return { tone: 'success', title: 'Target reached', detail, ratio, diff };
  return { tone: 'success', title: `${peso(diff)} over target`, detail, ratio, diff };
}
