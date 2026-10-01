import { h } from './dom.js';
import { icon } from './icons.js';
import { applyTheme } from './prefs.js';
import { setRoutes, start } from './router.js';
import * as home from './pages/home.js';
import * as savings from './pages/savings.js';
import * as account from './pages/account.js';
import * as expenses from './pages/expenses.js';
import * as taxi from './pages/taxi.js';
import * as targets from './pages/targets.js';
import * as settings from './pages/settings.js';

applyTheme();

const TABS = [
  { id: 'home', label: 'Home', icon: 'home', href: '#/' },
  { id: 'savings', label: 'Savings', icon: 'wallet', href: '#/savings' },
  { id: 'expenses', label: 'Expenses', icon: 'receipt', href: '#/expenses' },
  { id: 'taxi', label: 'Taxi', icon: 'car', href: '#/taxi' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '#/settings' },
];

const tabbar = document.getElementById('tabbar');
tabbar.append(
  ...TABS.map((tab) =>
    h('a', { class: 'tabbar__item', href: tab.href, 'data-tab': tab.id }, icon(tab.icon, 24), tab.label),
  ),
);

function markActiveTab(route) {
  for (const item of tabbar.children) {
    if (item.dataset.tab === route.tab) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  document.title = `${route.title} · Savings Monitor`;
}

setRoutes(
  [
    { pattern: '/', tab: 'home', title: 'Home', render: home.render },
    { pattern: '/savings', tab: 'savings', title: 'Savings', render: savings.render },
    { pattern: '/savings/:id', tab: 'savings', title: 'Account', render: account.render },
    { pattern: '/expenses', tab: 'expenses', title: 'Expenses', render: expenses.render },
    { pattern: '/taxi', tab: 'taxi', title: 'Taxi', render: taxi.render },
    { pattern: '/targets', tab: 'home', title: 'Targets', render: targets.render },
    { pattern: '/settings', tab: 'settings', title: 'Settings', render: settings.render },
  ],
  markActiveTab,
);

start();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Service worker not registered', error));
}
