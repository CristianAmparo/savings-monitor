import { h } from '../dom.js';
import { addExpense, deleteExpense, listAccounts, listCategories, listExpenses, updateExpense } from '../db.js';
import {
  addDays,
  addMonths,
  daysBetween,
  formatDate,
  formatDateShort,
  formatMonth,
  fromISO,
  monthEnd,
  monthStart,
  peso,
  todayISO,
  toInputAmount,
  weekStart,
} from '../format.js';
import { navigate, refresh } from '../router.js';
import { alertBox, button, card, emptyState, listRow, pageHeader, periodNav, progress, stat, tabs } from '../ui/components.js';
import { amountField, clearErrors, dateField, readAmount, readDate, selectField, showError, textField } from '../ui/form.js';
import { balanceText } from '../ui/money.js';
import { confirmDialog, openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

// Report state. Defaults to the current month; the category filter applies to every period.
let period = 'month';
let anchor = todayISO();
let customFrom = monthStart(todayISO());
let customTo = monthEnd(todayISO());
let categoryFilter = 'all';

function rangeFor() {
  switch (period) {
    case 'custom':
      return { start: customFrom, end: customTo, label: `${formatDateShort(customFrom)} – ${formatDate(customTo)}` };
    case 'day':
      return { start: anchor, end: anchor, label: formatDate(anchor) };
    case 'week': {
      const start = weekStart(anchor);
      const end = addDays(start, 6);
      return { start, end, label: `${formatDateShort(start)} – ${formatDate(end)}` };
    }
    case 'year': {
      const year = anchor.slice(0, 4);
      return { start: `${year}-01-01`, end: `${year}-12-31`, label: year };
    }
    default:
      return { start: monthStart(anchor), end: monthEnd(anchor), label: formatMonth(anchor.slice(0, 7)) };
  }
}

function shift(direction) {
  if (period === 'day') anchor = addDays(anchor, direction);
  else if (period === 'week') anchor = addDays(anchor, 7 * direction);
  else if (period === 'month') anchor = addMonths(anchor, direction);
  else anchor = addMonths(anchor, 12 * direction);
  refresh();
}

function buildBuckets(expenses, range) {
  if (period === 'day') return [];
  if (period === 'custom' && daysBetween(range.start, range.end) + 1 > 31) {
    // Long custom ranges are charted per month.
    const keys = [];
    for (let d = monthStart(range.start); d <= range.end; d = addMonths(d, 1)) keys.push(d.slice(0, 7));
    const totals = new Map(keys.map((key) => [key, 0]));
    expenses.forEach((e) => totals.set(e.date.slice(0, 7), (totals.get(e.date.slice(0, 7)) || 0) + e.amount));
    return keys.map((key) => ({ total: totals.get(key), label: 'JFMAMJJASOND'[Number(key.slice(5)) - 1], title: formatMonth(key) }));
  }
  if (period === 'year') {
    const totals = Array(12).fill(0);
    expenses.forEach((e) => (totals[Number(e.date.slice(5, 7)) - 1] += e.amount));
    return totals.map((total, i) => ({ total, label: 'JFMAMJJASOND'[i], title: formatMonth(`${range.start.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`) }));
  }
  const count = daysBetween(range.start, range.end) + 1;
  const totals = Array(count).fill(0);
  expenses.forEach((e) => (totals[daysBetween(range.start, e.date)] += e.amount));
  return totals.map((total, i) => {
    const date = addDays(range.start, i);
    const day = fromISO(date);
    const label = period === 'week' ? day.toLocaleDateString('en-US', { weekday: 'short' }) : (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '';
    return { total, label, title: formatDate(date) };
  });
}

function chart(buckets) {
  const max = Math.max(...buckets.map((b) => b.total), 1);
  return h(
    'div',
    { class: 'chart', role: 'img', 'aria-label': `Spending chart. ${buckets.map((b) => `${b.title}: ${peso(b.total)}`).join('; ')}` },
    h(
      'div',
      { class: 'chart__bars' },
      buckets.map((b) =>
        h(
          'div',
          { class: 'chart__col', title: `${b.title}: ${peso(b.total)}` },
          h('div', { class: b.total ? 'chart__bar' : 'chart__bar chart__bar--zero', style: `--value:${((b.total / max) * 100).toFixed(1)}` }),
        ),
      ),
    ),
    h('div', { class: 'chart__labels' }, buckets.map((b) => h('span', { class: 'chart__label' }, b.label))),
  );
}

async function openExpense(existing) {
  const [accounts, archived, categories] = await Promise.all([
    listAccounts(),
    listAccounts({ archived: true }),
    listCategories(),
  ]);
  const selectable = [...accounts];
  const current = archived.find((a) => existing && a.id === existing.accountId);
  if (current) selectable.push(current);

  // New expenses default to the "Cash" account and the "Food" category when they exist.
  const named = (rows, name) => rows.find((r) => r.name.trim().toLowerCase() === name);
  const defaultAccountId = (named(accounts, 'cash') || {}).id;
  const defaultCategoryId = (named(categories, 'food') || {}).id;

  openSheet(existing ? 'Edit expense' : 'Add expense', (close) => {
    if (!selectable.length) {
      return h(
        'div',
        { class: 'stack stack--4' },
        alertBox('info', 'Add an account first. Expenses are deducted from the account you pay with.'),
        button({ label: 'Go to Savings', variant: 'primary', onClick: () => { close(); navigate('/savings'); } }),
      );
    }
    const fields = {
      amount: amountField('Amount', { value: existing ? toInputAmount(existing.amount) : '' }),
      date: dateField('Date', existing ? existing.date : todayISO()),
      accountId: selectField(
        'Paid from',
        selectable.map((a) => ({ value: a.id, label: `${a.name} (${balanceText(a.balance)})` })),
        existing ? (selectable.some((a) => a.id === existing.accountId) ? existing.accountId : undefined) : defaultAccountId,
      ),
      categoryId: selectField(
        'Category',
        categories.map((c) => ({ value: c.id, label: c.name })),
        existing ? existing.categoryId : defaultCategoryId,
      ),
      note: textField('Note (optional)', { value: existing ? existing.note : '', maxlength: 80 }),
    };

    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const amount = readAmount(fields.amount);
      const date = readDate(fields.date);
      if (amount === null || date === null) return;
      const data = {
        amount,
        date,
        accountId: Number(fields.accountId.control.value),
        categoryId: Number(fields.categoryId.control.value),
        note: fields.note.control.value.trim(),
      };
      try {
        if (existing) await updateExpense(existing.id, data);
        else await addExpense(data);
        toast(existing ? 'Expense updated' : 'Expense added');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };

    const remove = async () => {
      const ok = await confirmDialog({
        title: 'Delete expense?',
        message: 'The amount will be returned to the account it was paid from.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      await deleteExpense(existing.id);
      toast('Expense deleted');
      close();
      refresh();
    };

    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      fields.amount.el,
      fields.date.el,
      fields.accountId.el,
      fields.categoryId.el,
      fields.note.el,
      h(
        'div',
        { class: 'sheet__actions' },
        button({ label: 'Save', variant: 'primary', type: 'submit' }),
        existing ? button({ label: 'Delete expense', variant: 'destructive', onClick: remove }) : null,
      ),
    );
  });
}

function periodControls(range, categories) {
  const controls = [tabs(PERIODS, period, (value) => { period = value; refresh(); }, 'Report period')];

  if (period === 'custom') {
    const from = dateField('From', customFrom);
    const to = dateField('To', customTo);
    from.control.addEventListener('change', () => { if (from.control.value) { customFrom = from.control.value; refresh(); } });
    to.control.addEventListener('change', () => { if (to.control.value) { customTo = to.control.value; refresh(); } });
    controls.push(h('div', { class: 'field-row' }, from.el, to.el));
    if (customFrom > customTo) controls.push(alertBox('error', 'The From date must be on or before the To date.'));
  } else {
    controls.push(periodNav({ label: range.label, onPrev: () => shift(-1), onNext: () => shift(1), prevLabel: 'Previous period', nextLabel: 'Next period' }));
  }

  const category = selectField('Category', [{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))], categoryFilter);
  category.control.addEventListener('change', () => { categoryFilter = category.control.value; refresh(); });
  controls.push(category.el);
  return controls;
}

export async function render() {
  const range = rangeFor();
  const rangeValid = range.start <= range.end;
  const [fetched, accounts, archived, categories] = await Promise.all([
    rangeValid ? listExpenses(range.start, range.end) : [],
    listAccounts(),
    listAccounts({ archived: true }),
    listCategories(),
  ]);
  if (categoryFilter !== 'all' && !categories.some((c) => String(c.id) === String(categoryFilter))) categoryFilter = 'all';
  const filtered = categoryFilter !== 'all';
  const expenses = filtered ? fetched.filter((e) => String(e.categoryId) === String(categoryFilter)) : fetched;
  const accountNames = new Map([...accounts, ...archived].map((a) => [a.id, a.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const today = todayISO();
  const elapsed = !rangeValid || today < range.start ? 0 : daysBetween(range.start, range.end < today ? range.end : today) + 1;
  const average = elapsed ? Math.round(total / elapsed) : 0;

  const byCategory = new Map();
  expenses.forEach((e) => byCategory.set(e.categoryId, (byCategory.get(e.categoryId) || 0) + e.amount));
  const breakdown = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const buckets = rangeValid ? buildBuckets(expenses, range) : [];

  const rows = expenses.map((e) =>
    listRow({
      title: categoryNames.get(e.categoryId) || 'Uncategorized',
      sub: [period === 'day' ? null : formatDate(e.date), accountNames.get(e.accountId) || 'Deleted account', e.note].filter(Boolean).join(' · '),
      value: peso(e.amount),
      onClick: () => openExpense(e),
    }),
  );

  return h(
    'div',
    null,
    pageHeader({ title: 'Expenses', actions: [button({ label: 'Add', variant: 'primary', iconName: 'plus', size: 'sm', onClick: () => openExpense() })] }),
    h('div', { class: 'stack stack--4' }, periodControls(range, categories)),
    h(
      'section',
      { class: 'section' },
      card(
        h(
          'div',
          { class: 'stack stack--4' },
          h('div', { class: 'row row--between' }, stat(filtered ? `Spent on ${categoryNames.get(Number(categoryFilter)) || 'category'}` : 'Total spent', peso(total), { hero: true }), stat('Daily average', peso(average))),
          buckets.length ? chart(buckets) : null,
        ),
      ),
    ),
    breakdown.length && !filtered
      ? h(
          'section',
          { class: 'section' },
          h('h2', { class: 't-h3 section__title' }, 'By category'),
          card(
            breakdown.map(([categoryId, amount]) =>
              h(
                'div',
                { class: 'breakdown' },
                h('div', { class: 'row row--between' }, h('span', null, categoryNames.get(categoryId) || 'Uncategorized'), h('span', { class: 'num t-label' }, `${peso(amount)} · ${Math.round((amount / total) * 100)}%`)),
                progress(amount / total),
              ),
            ),
            { flush: true },
          ),
        )
      : null,
    h(
      'section',
      { class: 'section' },
      h('h2', { class: 't-h3 section__title' }, 'Expenses'),
      rows.length
        ? card(h('div', { class: 'list' }, rows), { flush: true })
        : card(
            emptyState({
              iconName: 'receipt',
              title: 'No expenses in this period',
              hint: 'Expenses you add are deducted from the account you pay with.',
              action: button({ label: 'Add expense', variant: 'primary', iconName: 'plus', onClick: () => openExpense() }),
            }),
          ),
    ),
  );
}
