import { h } from '../dom.js';
import { getMeta, getTarget, listAccounts, listExpenses, listTaxi } from '../db.js';
import { daysBetween, formatMonth, monthKey, monthStart, peso, signedPeso, todayISO, weekStart } from '../format.js';
import { refresh } from '../router.js';
import { alertBox, button, card, pageHeader, progress, stat, targetStatus } from '../ui/components.js';
import { balanceText, hideToggle } from '../ui/money.js';

const BACKUP_REMINDER_DAYS = 7;

const sumBy = (rows, from, to, pick) => rows.filter((r) => r.date >= from && r.date <= to).reduce((sum, r) => sum + pick(r), 0);

export async function render() {
  const today = todayISO();
  const week = weekStart(today);
  const month = monthStart(today);
  const earliest = week < month ? week : month;

  const [accounts, target, expenses, taxi, lastBackup] = await Promise.all([
    listAccounts(),
    getTarget(monthKey(today)),
    listExpenses(earliest, today),
    listTaxi(earliest, today),
    getMeta('lastBackup'),
  ]);
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  const needsBackup = accounts.length > 0 && (!lastBackup || daysBetween(lastBackup, today) >= BACKUP_REMINDER_DAYS);

  let targetCard;
  if (target) {
    const status = targetStatus(target.expected, total);
    targetCard = card(
      h(
        'div',
        { class: 'stack stack--2' },
        h('div', { class: 'row row--between' }, h('span', { class: 't-label text-muted' }, `${formatMonth(monthKey(today))} target`), h('a', { class: 't-label', href: '#/targets' }, 'All targets')),
        h('div', { class: `t-h2 text-${status.tone}` }, status.title),
        progress(status.ratio, status.tone),
        h('div', { class: 't-label text-muted num' }, status.detail),
      ),
    );
  } else {
    targetCard = card(
      h(
        'div',
        { class: 'stack stack--4' },
        h('div', { class: 'stack stack--2' }, h('span', { class: 't-h3' }, 'Monthly target'), h('span', { class: 't-label text-muted' }, 'Set how much money you expect to have this month and compare it with your total.')),
        button({ label: 'Set target', variant: 'secondary', iconName: 'target', onClick: () => (location.hash = '#/targets') }),
      ),
    );
  }

  const spent = (from) => peso(sumBy(expenses, from, today, (e) => e.amount));
  const taxiNet = (from) => sumBy(taxi, from, today, (e) => e.income - e.expense);
  const taxiTone = (value) => (value > 0 ? 'success' : value < 0 ? 'error' : undefined);

  return h(
    'div',
    { class: 'stack stack--6' },
    pageHeader({ title: 'Home', actions: [hideToggle(refresh)] }),
    needsBackup
      ? alertBox(
          'info',
          [lastBackup ? 'It has been a while since your last backup. ' : 'You have not backed up yet. ', h('a', { href: '#/settings' }, 'Back up now')],
          'download',
        )
      : null,
    card(
      h(
        'div',
        { class: 'stack stack--2' },
        stat('Total savings', balanceText(total), { hero: true }),
        h('span', { class: 't-label text-muted' }, `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`),
      ),
    ),
    targetCard,
    h(
      'section',
      null,
      h('h2', { class: 't-h3 section__title' }, 'Spent'),
      card(h('div', { class: 'stat-row' }, stat('Today', spent(today)), stat('This week', spent(week)), stat('This month', spent(month)))),
    ),
    h(
      'section',
      null,
      h('h2', { class: 't-h3 section__title' }, 'Taxi net'),
      card(
        h(
          'div',
          { class: 'stat-row' },
          ...[
            ['Today', today],
            ['This week', week],
            ['This month', month],
          ].map(([label, from]) => stat(label, signedPeso(taxiNet(from)), { tone: taxiTone(taxiNet(from)) })),
        ),
      ),
    ),
  );
}
