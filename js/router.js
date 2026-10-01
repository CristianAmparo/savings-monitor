// Minimal hash router. Routes are registered by app.js to avoid circular imports.
import { h } from './dom.js';
import { alertBox } from './ui/components.js';

let routes = [];
let renderToken = 0;
let onRendered = () => {};

export function setRoutes(list, afterRender) {
  routes = list.map((route) => ({
    ...route,
    keys: [...route.pattern.matchAll(/:(\w+)/g)].map((m) => m[1]),
    regex: new RegExp('^' + route.pattern.replace(/:\w+/g, '([^/]+)') + '$'),
  }));
  onRendered = afterRender;
}

export function currentPath() {
  return location.hash.slice(1) || '/';
}

async function renderRoute({ keepScroll = false } = {}) {
  const path = currentPath();
  let match;
  for (const route of routes) {
    const m = path.match(route.regex);
    if (m) {
      const params = {};
      route.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])));
      match = { route, params };
      break;
    }
  }
  if (!match) {
    location.replace('#/');
    return;
  }

  const token = ++renderToken;
  const view = document.getElementById('view');
  const scroll = window.scrollY;
  let node;
  try {
    node = await match.route.render(match.params);
  } catch (error) {
    console.error(error);
    node = h('div', { class: 'page-error' }, alertBox('error', 'Something went wrong while loading this screen.'));
  }
  if (token !== renderToken) return;
  view.replaceChildren(node);
  onRendered(match.route);
  if (keepScroll) window.scrollTo(0, scroll);
  else {
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }
}

export function refresh() {
  return renderRoute({ keepScroll: true });
}

export function navigate(path) {
  location.hash = '#' + path;
}

export function start() {
  window.addEventListener('hashchange', () => renderRoute());
  renderRoute();
}
