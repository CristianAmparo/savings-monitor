import { h } from '../dom.js';
import { deleteTarget, listAccounts, listTargets, putTarget } from '../db.js';
import { formatMonth, monthKey, peso, toInputAmount, todayISO } from '../format.js';
import { refresh } from '../router.js';
import { badge, button, card, emptyState, listRow, pageHeader, targetStatus } from '../ui/components.js';
import { amountField, clearErrors, field, readAmount, showError } from '../ui/form.js';
import { confirmDialog, openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

async function openTarget(existing, takenMonths) {
  const accounts = await listAccounts();
  const currentTotal = accounts.reduce((sum, a) => sum + a.balance, 0);

  openSheet(existing ? 'Edit target' : 'Add target', (close) => {
    const monthInput = h('input', { class: 'input', type: 'month', value: existing ? existing.month : monthKey(todayISO()), disabled: Boolean(existing) });
    const fields = {
      month: field('Month', monthInput),
      expected: amountField('Expected', { value: existing ? toInputAmount(existing.expected) : '', helper: 'The total money you aim to have.' }),
      actual: amountField('Actual', { value: existing && existing.actual != null ? toInputAmount(existing.actual) : '', helper: 'Optional. Your total money for that month.' }),
    };

    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const month = monthInput.value;
      if (!month) return fields.month.setError('Choose a month.');
      if (!existing && takenMonths.has(month)) return fields.month.setError('A target for this month already exists.');
      const expected = readAmount(fields.expected);
      if (expected === null) return;
      const actualText = fields.actual.control.value.trim();
      let actual = null;
      if (actualText) {
        actual = readAmount(fields.actual, { allowZero: true });
        if (actual === null) return;
      }
      try {
        await putTarget({ month, expected, actual });
        toast('Target saved');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };

    const remove = async () => {
      const ok = await confirmDialog({ title: 'Delete target?', message: `The target for ${formatMonth(existing.month)} will be removed.`, confirmLabel: 'Delete', destructive: true });
      if (!ok) return;
      await deleteTarget(existing.month);
      toast('Target deleted');
      close();
      refresh();
    };

    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      fields.month.el,
      fields.expected.el,
      fields.actual.el,
      button({
        label: 'Use current total',
        variant: 'ghost',
        onClick: () => {
          fields.actual.control.value = toInputAmount(currentTotal);
        },
      }),
      h(
        'div',
        { class: 'sheet__actions' },
        button({ label: 'Save', variant: 'primary', type: 'submit' }),
        existing ? button({ label: 'Delete target', variant: 'destructive', onClick: remove }) : null,
      ),
    );
  });
}

export async function render() {
  const targets = await listTargets();
  const taken = new Set(targets.map((t) => t.month));
  const thisMonth = monthKey(todayISO());

  const rows = targets.map((t) => {
    const hasActual = t.actual != null;
    const status = hasActual ? targetStatus(t.expected, t.actual) : null;
    return listRow({
      title: h('span', null, formatMonth(t.month), t.month === thisMonth ? ' ' : null, t.month === thisMonth ? badge('Current', 'info') : null),
      sub: `Expected ${peso(t.expected)} · Actual ${hasActual ? peso(t.actual) : 'not set'}`,
      value: status ? status.title : 'No actual yet',
      valueTone: status ? status.tone : undefined,
      valueSub: status && t.expected > 0 ? `${Math.round(status.ratio * 100)}% of expected` : undefined,
      onClick: () => openTarget(t, taken),
    });
  });

  return h(
    'div',
    null,
    pageHeader({
      title: 'Targets',
      back: '#/',
      actions: [button({ label: 'Add', variant: 'primary', iconName: 'plus', size: 'sm', onClick: () => openTarget(null, taken) })],
    }),
    rows.length
      ? card(h('div', { class: 'list' }, rows), { flush: true })
      : card(
          emptyState({
            iconName: 'target',
            title: 'No targets yet',
            hint: 'Set the amount you expect to have each month, then compare it with your actual total.',
            action: button({ label: 'Add target', variant: 'primary', iconName: 'plus', onClick: () => openTarget(null, taken) }),
          }),
        ),
  );
}
