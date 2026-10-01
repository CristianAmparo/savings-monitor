// Per-device conveniences (theme, hide balance). Not part of the exported data.
const memory = {};

export function getPref(key, fallback) {
  try {
    const value = localStorage.getItem('sm.' + key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return key in memory ? memory[key] : fallback;
  }
}

export function setPref(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem('sm.' + key, JSON.stringify(value));
  } catch {
    /* storage unavailable; memory fallback is used */
  }
}

export function applyTheme() {
  const theme = getPref('theme', 'system');
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}
