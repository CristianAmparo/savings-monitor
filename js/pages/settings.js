import { h } from '../dom.js';
import { addCategory, deleteCategory, exportAll, getMeta, importAll, importTaxi, listCategories, renameCategory, resetAll, setMeta } from '../db.js';
import { formatDate, todayISO } from '../format.js';
import { applyTheme, getPref, setPref } from '../prefs.js';
import { refresh } from '../router.js';
import { button, card, listRow, pageHeader, tabs } from '../ui/components.js';
import { clearErrors, showError, textField } from '../ui/form.js';
import { confirmDialog, openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function openCategory(category) {
  openSheet(category ? 'Edit category' : 'Add category', (close) => {
    const fields = { name: textField('Category name', { value: category ? category.name : '', maxlength: 30 }) };
    const submit = async (event) => {
      event.preventDefault();
      clearErrors(fields);
      const name = fields.name.control.value.trim();
      if (!name) return fields.name.setError('Enter a category name.');
      try {
        if (category) await renameCategory(category.id, name);
        else await addCategory(name);
        toast('Category saved');
        close();
        refresh();
      } catch (error) {
        showError(error, fields);
      }
    };
    const remove = async () => {
      const ok = await confirmDialog({ title: 'Delete category?', message: `${category.name} will be removed.`, confirmLabel: 'Delete', destructive: true });
      if (!ok) return;
      try {
        await deleteCategory(category.id);
        toast('Category deleted');
        close();
        refresh();
      } catch (error) {
        showError(error, {});
      }
    };
    return h(
      'form',
      { class: 'stack stack--4', onSubmit: submit, novalidate: true },
      fields.name.el,
      h(
        'div',
        { class: 'sheet__actions' },
        button({ label: 'Save', variant: 'primary', type: 'submit' }),
        category ? button({ label: 'Delete category', variant: 'destructive', onClick: remove }) : null,
      ),
    );
  });
}

async function exportData() {
  const backup = await exportAll();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: `savings-monitor-backup-${todayISO()}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  await setMeta('lastBackup', todayISO());
  toast('Backup downloaded');
  refresh();
}

async function importData(file) {
  if (!file) return;
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    return toast('This file could not be read as a backup.', 'error');
  }
  const ok = await confirmDialog({
    title: 'Restore backup?',
    message: 'All current data will be replaced with the contents of this backup.',
    confirmLabel: 'Restore',
    destructive: true,
  });
  if (!ok) return;
  try {
    await importAll(backup);
    toast('Backup restored');
    refresh();
  } catch (error) {
    showError(error, {});
  }
}

async function importTaxiData(file) {
  if (!file) return;
  let rows;
  try {
    const parsed = JSON.parse(await file.text());
    rows = Array.isArray(parsed) ? parsed : parsed.taxi_days;
  } catch {
    return toast('This file could not be read.', 'error');
  }
  const ok = await confirmDialog({
    title: 'Import taxi records?',
    message: `${Array.isArray(rows) ? rows.length : 0} days will be added. A day that already has an entry will be replaced. Savings and expenses are not affected.`,
    confirmLabel: 'Import',
  });
  if (!ok) return;
  try {
    const count = await importTaxi(rows);
    toast(`${count} taxi days imported`);
    refresh();
  } catch (error) {
    showError(error, {});
  }
}

async function reset() {
  const ok = await confirmDialog({
    title: 'Reset all data?',
    message: 'Every account, expense, taxi entry and target will be permanently deleted. Export a backup first if you may need it.',
    confirmLabel: 'Reset everything',
    destructive: true,
  });
  if (!ok) return;
  await resetAll();
  toast('All data was reset');
  refresh();
}

export async function render() {
  const [categories, lastBackup] = await Promise.all([listCategories(), getMeta('lastBackup')]);
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: '-1', onChange: (event) => { importData(event.target.files[0]); event.target.value = ''; } });

  const taxiFileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: '-1', onChange: (event) => { importTaxiData(event.target.files[0]); event.target.value = ''; } });

  return h(
    'div',
    null,
    pageHeader({ title: 'Settings' }),
    h(
      'section',
      null,
      h('h2', { class: 't-h3 section__title' }, 'Appearance'),
      card(
        tabs(THEMES, getPref('theme', 'system'), (value) => {
          setPref('theme', value);
          applyTheme();
          refresh();
        }, 'Theme'),
      ),
    ),
    h(
      'section',
      { class: 'section' },
      h('div', { class: 'section__head' }, h('h2', { class: 't-h3' }, 'Expense categories'), button({ label: 'Add', variant: 'ghost', size: 'sm', iconName: 'plus', onClick: () => openCategory(null) })),
      card(h('div', { class: 'list' }, categories.map((c) => listRow({ title: c.name, onClick: () => openCategory(c) }))), { flush: true }),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', { class: 't-h3 section__title' }, 'Backup'),
      card(
        h(
          'div',
          { class: 'stack stack--4' },
          h('p', { class: 't-label text-muted' }, lastBackup ? `Last backup: ${formatDate(lastBackup)}` : 'No backup yet. Data is stored only on this device.'),
          h(
            'div',
            { class: 'actions-row' },
            button({ label: 'Export', variant: 'primary', iconName: 'download', onClick: exportData }),
            button({ label: 'Import', variant: 'secondary', iconName: 'upload', onClick: () => fileInput.click() }),
          ),
          fileInput,
          button({ label: 'Import taxi records', variant: 'secondary', iconName: 'upload', block: true, onClick: () => taxiFileInput.click() }),
          taxiFileInput,
        ),
      ),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', { class: 't-h3 section__title' }, 'Danger zone'),
      card(button({ label: 'Reset all data', variant: 'destructive', block: true, onClick: reset })),
    ),
  );
}
