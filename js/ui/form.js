import { h } from '../dom.js';
import { ValidationError } from '../db.js';
import { parseAmount } from '../format.js';
import { toast } from './toast.js';

let counter = 0;

// Wraps a control with a label, optional helper text and an inline error slot.
// `wrap` is the node actually inserted (e.g. an input group around the control).
export function field(label, control, { helper, wrap } = {}) {
  const id = `field-${++counter}`;
  control.id = id;
  const describedBy = [`${id}-error`];
  const error = h('div', { class: 'field__error', id: `${id}-error`, role: 'alert' });
  const helperNode = helper ? h('div', { class: 'field__helper', id: `${id}-help` }, helper) : null;
  if (helperNode) describedBy.unshift(`${id}-help`);
  control.setAttribute('aria-describedby', describedBy.join(' '));
  return {
    control,
    el: h('div', { class: 'field' }, h('label', { class: 'field__label', for: id }, label), wrap || control, helperNode, error),
    setError(message) {
      error.textContent = message || '';
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    },
  };
}

export function textField(label, { value = '', placeholder, maxlength = 60, helper } = {}) {
  const input = h('input', { class: 'input', type: 'text', value, placeholder, maxlength, autocomplete: 'off' });
  return field(label, input, { helper });
}

export function amountField(label, { value = '', helper } = {}) {
  const input = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value, placeholder: '0.00', autocomplete: 'off' });
  const wrap = h('div', { class: 'input-group' }, h('span', { class: 'input-group__prefix', 'aria-hidden': 'true' }, '₱'), input);
  return field(label, input, { helper, wrap });
}

export function dateField(label, value) {
  return field(label, h('input', { class: 'input', type: 'date', value }));
}

export function selectField(label, options, value) {
  const select = h(
    'select',
    { class: 'input' },
    options.map((option) => h('option', { value: option.value }, option.label)),
  );
  if (value !== undefined) select.value = String(value);
  return field(label, select);
}

// Returns centavos, or null after showing an inline error on the field.
export function readAmount(f, { optional = false, allowZero = false } = {}) {
  const text = f.control.value.trim();
  if (!text) {
    if (optional) return 0;
    f.setError('Enter an amount.');
    return null;
  }
  const centavos = parseAmount(text);
  if (Number.isNaN(centavos)) {
    f.setError('Enter a valid amount with up to 2 decimals.');
    return null;
  }
  if (centavos === 0 && !allowZero) {
    f.setError('Amount must be greater than 0.');
    return null;
  }
  return centavos;
}

export function readDate(f) {
  if (!f.control.value) {
    f.setError('Choose a date.');
    return null;
  }
  return f.control.value;
}

export function clearErrors(fields) {
  Object.values(fields).forEach((f) => f.setError(''));
}

// Routes a thrown ValidationError to its field, or shows a toast for anything else.
export function showError(error, fields) {
  if (error instanceof ValidationError) {
    const target = error.field && fields[error.field];
    if (target) {
      target.setError(error.message);
      target.control.focus();
    } else {
      toast(error.message, 'error');
    }
  } else {
    console.error(error);
    toast('Something went wrong. Please try again.', 'error');
  }
}
