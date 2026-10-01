import { h } from '../dom.js';
import { addAccount, listAccounts } from '../db.js';
import { todayISO } from '../format.js';
import { refresh } from '../router.js';
import { button, card, emptyState, iconButton, listRow, pageHeader, stat } from '../ui/components.js';
import { amountField, clearErrors, readAmount, showError, textField } from '../ui/form.js';
import { balanceText, hideToggle } from '../ui/money.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

export function openAddAccount() {
  openSheet('Add account', (close) => {
    const fields = {
      name: textField('Account name', { placeholder: 'e.g. GCash, Maya, Loan - Juan' }),
      balance: amountField('Starting balance', { helper: 'Optional. Leave empty to start at zero.' }),
    };
    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const name = fields.name.control.value.trim();
      if (!name) return fields.name.setError('Enter an account name.');
      const balance = readAmount(fields.balance, { optional: true, allowZero: true });
      if (balance === null) return;
      try {
        await addAccount({ name, balance, date: todayISO() });
        toast('Account added');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };
    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      fields.name.el,
      fields.balance.el,
      h('div', { class: 'sheet__actions' }, button({ label: 'Add account', variant: 'primary', type: 'submit' })),
    );
  });
}

export async function render() {
  const [accounts, archived] = await Promise.all([listAccounts(), listAccounts({ archived: true })]);
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  const rows = accounts.map((a) => listRow({ title: a.name, value: balanceText(a.balance), href: `#/savings/${a.id}` }));

  return h(
    'div',
    null,
    pageHeader({
      title: 'Savings',
      actions: [hideToggle(refresh), iconButton({ iconName: 'plus', label: 'Add account', onClick: openAddAccount })],
    }),
    card(stat('Total savings', balanceText(total), { hero: true })),
    h(
      'section',
      { class: 'section' },
      h('h2', { class: 't-h3 section__title' }, 'Accounts'),
      accounts.length
        ? card(h('div', { class: 'list' }, rows), { flush: true })
        : card(
            emptyState({
              iconName: 'wallet',
              title: 'No accounts yet',
              hint: 'Add your wallets, banks and loans owed to you.',
              action: button({ label: 'Add account', variant: 'primary', iconName: 'plus', onClick: openAddAccount }),
            }),
          ),
    ),
    archived.length
      ? h(
          'section',
          { class: 'section' },
          h('h2', { class: 't-h3 section__title' }, 'Archived'),
          card(
            h(
              'div',
              { class: 'list' },
              archived.map((a) => listRow({ title: a.name, value: balanceText(a.balance), href: `#/savings/${a.id}` })),
            ),
            { flush: true },
          ),
        )
      : null,
  );
}
