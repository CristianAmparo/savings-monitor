// Money is stored as integer centavos. All formatting goes through this file.
const MINUS = '−';

export function peso(centavos) {
  const abs = Math.abs(centavos);
  const whole = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = abs % 100;
  const body = `₱${whole}${cents ? '.' + String(cents).padStart(2, '0') : ''}`;
  return centavos < 0 ? MINUS + body : body;
}

export function signedPeso(centavos) {
  if (centavos > 0) return '+' + peso(centavos);
  return peso(centavos);
}

// Short form for tight spaces (calendar cells): 1250 -> "1.3k"
export function compactPeso(centavos) {
  const sign = centavos < 0 ? MINUS : '';
  const pesos = Math.abs(centavos) / 100;
  if (pesos >= 1000) return sign + (pesos / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return sign + String(Math.round(pesos));
}

// Returns centavos, or NaN when the text is not a valid amount (max 2 decimals).
export function parseAmount(text) {
  const s = String(text).replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s) && !/^\.\d{1,2}$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}

export function toInputAmount(centavos) {
  if (!centavos) return '';
  const pesos = centavos / 100;
  return Number.isInteger(pesos) ? String(pesos) : pesos.toFixed(2);
}

// ---------- Dates (local time, ISO yyyy-mm-dd) ----------
const pad = (n) => String(n).padStart(2, '0');

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso, n) {
  const d = fromISO(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

// Weeks run Monday to Sunday.
export function weekStart(iso) {
  const d = fromISO(iso);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toISO(d);
}

export function monthStart(iso) {
  return iso.slice(0, 8) + '01';
}

export function monthEnd(iso) {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function monthKey(iso) {
  return iso.slice(0, 7);
}

export function daysBetween(fromIso, toIso) {
  return Math.round((fromISO(toIso) - fromISO(fromIso)) / 86400000);
}

export function formatDate(iso) {
  return fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(iso) {
  return fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateLong(iso) {
  return fromISO(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatMonth(key) {
  return fromISO(key + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
