import { h } from '../dom.js';
import {
  adjustBalance,
  deleteAccount,
  deleteTransaction,
  getAccount,
  listAccounts,
  listCategories,
  listTransactions,
  renameAccount,
  setArchived,
  setBalance,
  transfer,
} from '../db.js';
import { formatDate, signedPeso, todayISO } from '../format.js';
import { navigate, refresh } from '../router.js';
import { alertBox, button, card, emptyState, iconButton, listRow, pageHeader, stat, tabs } from '../ui/components.js';
import { amountField, clearErrors, dateField, readAmount, readDate, selectField, showError, textField } from '../ui/form.js';
import { balanceText, hideToggle } from '../ui/money.js';
import { confirmDialog, openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const MODES = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'set', label: 'Set balance' },
];

function openAdjust(account) {
  openSheet('Adjust balance', (close) => {
    let mode = 'add';
    const fields = {
      amount: amountField('Amount'),
      date: dateField('Date', todayISO()),
      note: textField('Note (optional)', { maxlength: 80 }),
    };
    const label = fields.amount.el.querySelector('label');
    const tabsHost = h('div', null);
    const renderTabs = () =>
      tabsHost.replaceChildren(
        tabs(
          MODES,
          mode,
          (value) => {
            mode = value;
            label.textContent = value === 'set' ? 'New balance' : 'Amount';
            clearErrors(fields);
            renderTabs();
          },
          'Adjustment type',
        ),
      );
    renderTabs();

    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const amount = readAmount(fields.amount, { allowZero: mode === 'set' });
      const date = readDate(fields.date);
      if (amount === null || date === null) return;
      const note = fields.note.control.value.trim();
      try {
        if (mode === 'set') await setBalance({ accountId: account.id, newBalance: amount, note, date });
        else await adjustBalance({ accountId: account.id, delta: mode === 'add' ? amount : -amount, note, date });
        toast('Balance updated');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };

    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      tabsHost,
      fields.amount.el,
      fields.date.el,
      fields.note.el,
      h('div', { class: 'sheet__actions' }, button({ label: 'Save', variant: 'primary', type: 'submit' })),
    );
  });
}

async function openTransfer(account) {
  const others = (await listAccounts()).filter((a) => a.id !== account.id);
  openSheet('Transfer', (close) => {
    if (!others.length) return alertBox('info', 'Add another account to transfer money between accounts.');
    const fields = {
      toId: selectField(
        'To account',
        others.map((a) => ({ value: a.id, label: `${a.name} (${balanceText(a.balance)})` })),
      ),
      amount: amountField('Amount', { helper: `Available in ${account.name}: ${balanceText(account.balance)}` }),
      date: dateField('Date', todayISO()),
      note: textField('Note (optional)', { maxlength: 80 }),
    };
    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const amount = readAmount(fields.amount);
      const date = readDate(fields.date);
      if (amount === null || date === null) return;
      try {
        await transfer({
          fromId: account.id,
          toId: Number(fields.toId.control.value),
          amount,
          note: fields.note.control.value.trim(),
          date,
        });
        toast('Transfer saved');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };
    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      fields.toId.el,
      fields.amount.el,
      fields.date.el,
      fields.note.el,
      h('div', { class: 'sheet__actions' }, button({ label: 'Transfer', variant: 'primary', type: 'submit' })),
    );
  });
}

function openEdit(account) {
  openSheet('Edit account', (close) => {
    const fields = { name: textField('Account name', { value: account.name }) };
    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const name = fields.name.control.value.trim();
      if (!name) return fields.name.setError('Enter an account name.');
      try {
        await renameAccount(account.id, name);
        toast('Account updated');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };
    const toggleArchive = async () => {
      try {
        await setArchived(account.id, !account.archived);
        toast(account.archived ? 'Account restored' : 'Account archived');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };
    const remove = async () => {
      const ok = await confirmDialog({
        title: 'Delete account?',
        message: `${account.name} and its history will be permanently deleted. Past expenses keep their records.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      await deleteAccount(account.id);
      toast('Account deleted');
      close();
      navigate('/savings');
    };
    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      fields.name.el,
      h(
        'div',
        { class: 'sheet__actions' },
        button({ label: 'Save', variant: 'primary', type: 'submit' }),
        button({
          label: account.archived ? 'Restore account' : 'Archive account',
          variant: 'secondary',
          disabled: !account.archived && account.balance !== 0,
          onClick: toggleArchive,
        }),
        !account.archived && account.balance !== 0
          ? h('p', { class: 't-helper text-muted' }, 'An account can be archived once its balance is zero.')
          : null,
        button({ label: 'Delete account', variant: 'destructive', onClick: remove }),
      ),
    );
  });
}

function entryTitle(entry, names, categories) {
  switch (entry.type) {
    case 'opening':
      return 'Opening balance';
    case 'adjust':
      return entry.amount > 0 ? 'Added' : 'Subtracted';
    case 'set':
      return 'Balance set';
    case 'transfer_out':
      return `Transfer to ${names.get(entry.counterpartId) || 'deleted account'}`;
    case 'transfer_in':
      return `Transfer from ${names.get(entry.counterpartId) || 'deleted account'}`;
    case 'expense':
      return `Expense · ${categories.get(entry.categoryId) || 'Uncategorized'}`;
    default:
      return 'Entry';
  }
}

export async function render({ id }) {
  const account = await getAccount(Number(id));
  if (!account) {
    return h(
      'div',
      null,
      pageHeader({ title: 'Account', back: '#/savings' }),
      card(emptyState({ title: 'Account not found', action: button({ label: 'Back to savings', variant: 'primary', onClick: () => navigate('/savings') }) })),
    );
  }

  const [entries, accounts, archivedAccounts, categories] = await Promise.all([
    listTransactions(account.id),
    listAccounts(),
    listAccounts({ archived: true }),
    listCategories(),
  ]);
  const names = new Map([...accounts, ...archivedAccounts].map((a) => [a.id, a.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  let running = account.balance;
  const rows = entries.map((entry) => {
    const after = running;
    running -= entry.amount;
    const editable = entry.type === 'adjust' || entry.type === 'set';
    const remove = async () => {
      const ok = await confirmDialog({
        title: 'Remove this entry?',
        message: 'The balance will be reversed by this amount.',
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteTransaction(entry.id);
        toast('Entry removed');
        refresh();
      } catch (error) {
        showError(error, {});
      }
    };
    return listRow({
      title: entryTitle(entry, names, categoryNames),
      sub: `${formatDate(entry.date)}${entry.note ? ` · ${entry.note}` : ''}`,
      value: signedPeso(entry.amount),
      valueTone: entry.amount > 0 ? 'success' : undefined,
      valueSub: `Balance ${balanceText(after)}`,
      onClick: editable ? remove : undefined,
    });
  });

  return h(
    'div',
    null,
    pageHeader({
      title: account.name,
      back: '#/savings',
      actions: [hideToggle(refresh), iconButton({ iconName: 'pencil', label: 'Edit account', onClick: () => openEdit(account) })],
    }),
    card(
      h(
        'div',
        { class: 'stack stack--4' },
        stat('Balance', balanceText(account.balance), { hero: true }),
        account.archived ? h('p', { class: 't-helper text-muted' }, 'This account is archived.') : null,
        h(
          'div',
          { class: 'actions-row' },
          button({ label: 'Adjust', variant: 'primary', onClick: () => openAdjust(account) }),
          button({ label: 'Transfer', variant: 'secondary', onClick: () => openTransfer(account) }),
        ),
      ),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', { class: 't-h3 section__title' }, 'History'),
      rows.length
        ? card(h('div', { class: 'list' }, rows), { flush: true })
        : card(emptyState({ title: 'No history yet', hint: 'Balance changes will appear here.' })),
    ),
  );
}
