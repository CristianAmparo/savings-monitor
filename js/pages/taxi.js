// Taxi records only: never touches savings accounts, totals or targets.
import { h } from '../dom.js';
import { deleteTaxi, listTaxi, putTaxi } from '../db.js';
import {
  addMonths,
  compactPeso,
  formatDateLong,
  formatMonth,
  fromISO,
  monthEnd,
  monthStart,
  parseAmount,
  peso,
  signedPeso,
  todayISO,
  toInputAmount,
} from '../format.js';
import { refresh } from '../router.js';
import { button, card, pageHeader, periodNav, stat } from '../ui/components.js';
import { amountField, clearErrors, readAmount, showError } from '../ui/form.js';
import { confirmDialog, openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

let monthAnchor = monthStart(todayISO());

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const net = (entry) => entry.income - entry.expense;
const tone = (value) => (value > 0 ? 'success' : value < 0 ? 'error' : undefined);

function openDay(date, existing) {
  openSheet(formatDateLong(date), (close) => {
    const fields = {
      income: amountField('Income', { value: existing ? toInputAmount(existing.income) : '' }),
      expense: amountField('Expense', { value: existing ? toInputAmount(existing.expense) : '' }),
    };
    const netValue = h('span', { class: 'num t-h3' });
    const updateNet = () => {
      const income = parseAmount(fields.income.control.value.trim() || '0');
      const expense = parseAmount(fields.expense.control.value.trim() || '0');
      const value = (Number.isNaN(income) ? 0 : income) - (Number.isNaN(expense) ? 0 : expense);
      netValue.textContent = signedPeso(value);
      netValue.className = `num t-h3${tone(value) ? ` text-${tone(value)}` : ''}`;
    };
    fields.income.control.addEventListener('input', updateNet);
    fields.expense.control.addEventListener('input', updateNet);
    updateNet();

    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const income = readAmount(fields.income, { optional: true, allowZero: true });
      const expense = readAmount(fields.expense, { optional: true, allowZero: true });
      if (income === null || expense === null) return;
      if (income === 0 && expense === 0) return fields.income.setError('Enter an income or an expense.');
      try {
        await putTaxi({ date, income, expense });
        toast('Entry saved');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };

    const remove = async () => {
      const ok = await confirmDialog({ title: 'Delete entry?', message: 'This day will be cleared.', confirmLabel: 'Delete', destructive: true });
      if (!ok) return;
      await deleteTaxi(date);
      toast('Entry deleted');
      close();
      refresh();
    };

    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      fields.income.el,
      fields.expense.el,
      h('div', { class: 'row row--between' }, h('span', { class: 't-label text-muted' }, 'Net'), netValue),
      h(
        'div',
        { class: 'sheet__actions' },
        button({ label: 'Save', variant: 'primary', type: 'submit' }),
        existing ? button({ label: 'Delete entry', variant: 'destructive', onClick: remove }) : null,
      ),
    );
  });
}

function dayCell(date, entry, today) {
  const classes = ['calendar__day'];
  if (date === today) classes.push('calendar__day--today');
  const value = entry ? net(entry) : 0;
  if (entry && value > 0) classes.push('calendar__day--gain');
  if (entry && value < 0) classes.push('calendar__day--loss');
  const label = `${formatDateLong(date)}, ${entry ? `net ${signedPeso(value)}` : 'no entry'}`;
  return h(
    'button',
    { class: classes.join(' '), type: 'button', 'aria-label': label, onClick: () => openDay(date, entry) },
    h('span', { class: 'calendar__num' }, String(Number(date.slice(8)))),
    entry && h('span', { class: `calendar__net${tone(value) ? ` text-${tone(value)}` : ''}` }, compactPeso(value)),
  );
}

export async function render() {
  const start = monthAnchor;
  const end = monthEnd(start);
  const entries = await listTaxi(start, end);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const today = todayISO();

  const income = entries.reduce((sum, e) => sum + e.income, 0);
  const expense = entries.reduce((sum, e) => sum + e.expense, 0);
  const monthNet = income - expense;

  const first = fromISO(start);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = fromISO(end).getDate();
  const cells = [...WEEKDAYS.map((d) => h('div', { class: 'calendar__head' }, d)), h('div', { class: 'calendar__head' }, 'Week')];

  const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7;
  let weekNet = 0;
  let weekHasEntry = false;
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - lead + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cells.push(h('div', { class: 'calendar__day calendar__day--blank' }));
    } else {
      const date = `${start.slice(0, 8)}${String(dayNumber).padStart(2, '0')}`;
      const entry = byDate.get(date);
      if (entry) {
        weekNet += net(entry);
        weekHasEntry = true;
      }
      cells.push(dayCell(date, entry, today));
    }
    if (i % 7 === 6) {
      cells.push(
        h(
          'div',
          { class: `calendar__week${weekHasEntry && tone(weekNet) ? ` text-${tone(weekNet)}` : ''}`, title: 'Week net' },
          weekHasEntry ? compactPeso(weekNet) : '',
        ),
      );
      weekNet = 0;
      weekHasEntry = false;
    }
  }

  return h(
    'div',
    null,
    pageHeader({ title: 'Taxi', actions: [button({ label: 'Today', variant: 'primary', size: 'sm', onClick: () => openDay(today, byDate.get(today)) })] }),
    periodNav({
      label: formatMonth(start.slice(0, 7)),
      onPrev: () => { monthAnchor = addMonths(start, -1); refresh(); },
      onNext: () => { monthAnchor = addMonths(start, 1); refresh(); },
      prevLabel: 'Previous month',
      nextLabel: 'Next month',
    }),
    h(
      'section',
      { class: 'section' },
      card(
        h(
          'div',
          { class: 'stat-row' },
          stat('Income', peso(income)),
          stat('Expense', peso(expense)),
          stat('Net', signedPeso(monthNet), { tone: tone(monthNet) }),
        ),
      ),
    ),
    h('section', { class: 'section' }, card(h('div', { class: 'calendar', role: 'group', 'aria-label': 'Daily taxi income' }, cells))),
    h('p', { class: 't-helper text-muted section' }, 'Tap a day to add or edit its income and expense. Taxi records are separate from your savings.'),
  );
}
