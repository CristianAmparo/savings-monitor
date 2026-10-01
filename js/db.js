// IndexedDB access layer. Money is stored as integer centavos; dates as yyyy-mm-dd.
import { peso } from './format.js';

const DB_NAME = 'savings-monitor';
const DB_VERSION = 1;
const STORES = ['accounts', 'transactions', 'expenses', 'categories', 'taxi_days', 'targets', 'meta'];
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Bills', 'Health', 'Shopping', 'Other'];

export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

let dbPromise;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
        const tx = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        tx.createIndex('accountId', 'accountId');
        tx.createIndex('expenseId', 'expenseId');
        const ex = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        ex.createIndex('date', 'date');
        ex.createIndex('categoryId', 'categoryId');
        const cats = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('taxi_days', { keyPath: 'date' });
        db.createObjectStore('targets', { keyPath: 'month' });
        db.createObjectStore('meta', { keyPath: 'key' });
        for (const name of DEFAULT_CATEGORIES) cats.add({ name });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

const rq = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// Runs fn inside one IndexedDB transaction. Any throw aborts and rolls back everything.
async function run(stores, mode, fn) {
  const db = await openDB();
  const tx = db.transaction(stores, mode);
  const done = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
  let result;
  let failure;
  try {
    result = await fn(tx);
  } catch (error) {
    failure = error;
    try {
      tx.abort();
    } catch {
      /* already finished */
    }
  }
  try {
    await done;
  } catch (error) {
    failure = failure || error;
  }
  if (failure) throw failure;
  return result;
}

const read = (stores, fn) => run(stores, 'readonly', fn);
const write = (stores, fn) => run(stores, 'readwrite', fn);

// ---------- Internal helpers ----------
async function applyDelta(tx, accountId, delta, overflowMessage) {
  const store = tx.objectStore('accounts');
  const account = await rq(store.get(accountId));
  if (!account) throw new ValidationError('Account not found.', 'accountId');
  const next = account.balance + delta;
  if (next < 0) {
    throw new ValidationError(
      overflowMessage || `Amount exceeds the balance of ${account.name} (${peso(account.balance)}).`,
      'amount',
    );
  }
  account.balance = next;
  await rq(store.put(account));
  return account;
}

async function refundIfExists(tx, accountId, amount) {
  const store = tx.objectStore('accounts');
  const account = await rq(store.get(accountId));
  if (!account) return;
  account.balance += amount;
  await rq(store.put(account));
}

const logEntry = (tx, entry) => rq(tx.objectStore('transactions').add({ ...entry, createdAt: Date.now() }));

async function deleteByIndex(tx, storeName, indexName, key) {
  const store = tx.objectStore(storeName);
  const keys = await rq(store.index(indexName).getAllKeys(IDBKeyRange.only(key)));
  for (const k of keys) await rq(store.delete(k));
}

function assertUniqueName(rows, name, exceptId, message, field = 'name') {
  const clash = rows.some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (clash) throw new ValidationError(message, field);
}

// ---------- Accounts ----------
export async function listAccounts({ archived = false } = {}) {
  const rows = await read(['accounts'], (tx) => rq(tx.objectStore('accounts').getAll()));
  return rows.filter((a) => Boolean(a.archived) === archived).sort((a, b) => a.id - b.id);
}

export async function getAccount(id) {
  return read(['accounts'], (tx) => rq(tx.objectStore('accounts').get(id)));
}

export function addAccount({ name, balance = 0, date }) {
  return write(['accounts', 'transactions'], async (tx) => {
    const store = tx.objectStore('accounts');
    assertUniqueName(await rq(store.getAll()), name, null, 'An account with this name already exists.');
    const id = await rq(store.add({ name, balance, archived: false, createdAt: Date.now() }));
    if (balance > 0) {
      await logEntry(tx, { accountId: id, amount: balance, type: 'opening', note: '', date });
    }
    return id;
  });
}

export function renameAccount(id, name) {
  return write(['accounts'], async (tx) => {
    const store = tx.objectStore('accounts');
    assertUniqueName(await rq(store.getAll()), name, id, 'An account with this name already exists.');
    const account = await rq(store.get(id));
    account.name = name;
    await rq(store.put(account));
  });
}

export function setArchived(id, archived) {
  return write(['accounts'], async (tx) => {
    const store = tx.objectStore('accounts');
    const account = await rq(store.get(id));
    if (archived && account.balance !== 0) {
      throw new ValidationError('Only accounts with a zero balance can be archived.');
    }
    account.archived = archived;
    await rq(store.put(account));
  });
}

export function deleteAccount(id) {
  return write(['accounts', 'transactions'], async (tx) => {
    await deleteByIndex(tx, 'transactions', 'accountId', id);
    await rq(tx.objectStore('accounts').delete(id));
  });
}

// ---------- Balance changes ----------
export function adjustBalance({ accountId, delta, note, date }) {
  return write(['accounts', 'transactions'], async (tx) => {
    await applyDelta(tx, accountId, delta);
    await logEntry(tx, { accountId, amount: delta, type: 'adjust', note, date });
  });
}

export function setBalance({ accountId, newBalance, note, date }) {
  return write(['accounts', 'transactions'], async (tx) => {
    const account = await rq(tx.objectStore('accounts').get(accountId));
    const diff = newBalance - account.balance;
    if (diff === 0) throw new ValidationError('The balance is already this amount.', 'amount');
    await applyDelta(tx, accountId, diff);
    await logEntry(tx, { accountId, amount: diff, type: 'set', note, date });
  });
}

export function transfer({ fromId, toId, amount, note, date }) {
  return write(['accounts', 'transactions'], async (tx) => {
    if (fromId === toId) throw new ValidationError('Choose a different account.', 'toId');
    await applyDelta(tx, fromId, -amount);
    await applyDelta(tx, toId, amount);
    await logEntry(tx, { accountId: fromId, amount: -amount, type: 'transfer_out', counterpartId: toId, note, date });
    await logEntry(tx, { accountId: toId, amount, type: 'transfer_in', counterpartId: fromId, note, date });
  });
}

export async function listTransactions(accountId) {
  const rows = await read(['transactions'], (tx) =>
    rq(tx.objectStore('transactions').index('accountId').getAll(IDBKeyRange.only(accountId))),
  );
  return rows.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
}

// Removes an adjust/set entry and reverses its effect on the balance.
export function deleteTransaction(id) {
  return write(['accounts', 'transactions'], async (tx) => {
    const store = tx.objectStore('transactions');
    const entry = await rq(store.get(id));
    if (!entry) return;
    await applyDelta(tx, entry.accountId, -entry.amount, 'Cannot remove this entry: the balance would go below zero.');
    await rq(store.delete(id));
  });
}

// ---------- Expenses ----------
export async function listExpenses(from, to) {
  const rows = await read(['expenses'], (tx) =>
    rq(tx.objectStore('expenses').index('date').getAll(IDBKeyRange.bound(from, to))),
  );
  return rows.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
}

export function addExpense({ amount, date, accountId, categoryId, note }) {
  return write(['accounts', 'transactions', 'expenses'], async (tx) => {
    await applyDelta(tx, accountId, -amount);
    const id = await rq(tx.objectStore('expenses').add({ amount, date, accountId, categoryId, note }));
    await logEntry(tx, { accountId, amount: -amount, type: 'expense', expenseId: id, categoryId, note, date });
    return id;
  });
}

export function updateExpense(id, { amount, date, accountId, categoryId, note }) {
  return write(['accounts', 'transactions', 'expenses'], async (tx) => {
    const store = tx.objectStore('expenses');
    const old = await rq(store.get(id));
    await refundIfExists(tx, old.accountId, old.amount);
    await deleteByIndex(tx, 'transactions', 'expenseId', id);
    await applyDelta(tx, accountId, -amount);
    await rq(store.put({ id, amount, date, accountId, categoryId, note }));
    await logEntry(tx, { accountId, amount: -amount, type: 'expense', expenseId: id, categoryId, note, date });
  });
}

export function deleteExpense(id) {
  return write(['accounts', 'transactions', 'expenses'], async (tx) => {
    const store = tx.objectStore('expenses');
    const old = await rq(store.get(id));
    if (!old) return;
    await refundIfExists(tx, old.accountId, old.amount);
    await deleteByIndex(tx, 'transactions', 'expenseId', id);
    await rq(store.delete(id));
  });
}

// ---------- Categories ----------
export async function listCategories() {
  const rows = await read(['categories'], (tx) => rq(tx.objectStore('categories').getAll()));
  return rows.sort((a, b) => a.id - b.id);
}

export function addCategory(name) {
  return write(['categories'], async (tx) => {
    const store = tx.objectStore('categories');
    assertUniqueName(await rq(store.getAll()), name, null, 'This category already exists.');
    return rq(store.add({ name }));
  });
}

export function renameCategory(id, name) {
  return write(['categories'], async (tx) => {
    const store = tx.objectStore('categories');
    assertUniqueName(await rq(store.getAll()), name, id, 'This category already exists.');
    await rq(store.put({ id, name }));
  });
}

export function deleteCategory(id) {
  return write(['categories', 'expenses'], async (tx) => {
    const all = await rq(tx.objectStore('categories').getAll());
    if (all.length <= 1) throw new ValidationError('At least one category is required.');
    const used = await rq(tx.objectStore('expenses').index('categoryId').count(IDBKeyRange.only(id)));
    if (used > 0) throw new ValidationError('This category is used by existing expenses and cannot be deleted.');
    await rq(tx.objectStore('categories').delete(id));
  });
}

// ---------- Taxi (records only, independent of savings) ----------
export function listTaxi(from, to) {
  return read(['taxi_days'], (tx) => rq(tx.objectStore('taxi_days').getAll(IDBKeyRange.bound(from, to))));
}

export function putTaxi({ date, income, expense }) {
  return write(['taxi_days'], (tx) => rq(tx.objectStore('taxi_days').put({ date, income, expense })));
}

// Merges many days at once; a day that already exists is replaced.
export function importTaxi(rows) {
  const valid =
    Array.isArray(rows) &&
    rows.length > 0 &&
    rows.every(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        Number.isInteger(r.income) &&
        Number.isInteger(r.expense) &&
        r.income >= 0 &&
        r.expense >= 0,
    );
  if (!valid) return Promise.reject(new ValidationError('This file does not contain valid taxi records.'));
  return write(['taxi_days'], async (tx) => {
    const store = tx.objectStore('taxi_days');
    for (const r of rows) await rq(store.put({ date: r.date, income: r.income, expense: r.expense }));
    return rows.length;
  });
}

export function deleteTaxi(date) {
  return write(['taxi_days'], (tx) => rq(tx.objectStore('taxi_days').delete(date)));
}

// ---------- Monthly targets ----------
export async function listTargets() {
  const rows = await read(['targets'], (tx) => rq(tx.objectStore('targets').getAll()));
  return rows.sort((a, b) => (a.month < b.month ? 1 : -1));
}

export function getTarget(month) {
  return read(['targets'], (tx) => rq(tx.objectStore('targets').get(month)));
}

export function putTarget({ month, expected, actual }) {
  return write(['targets'], (tx) => rq(tx.objectStore('targets').put({ month, expected, actual })));
}

export function deleteTarget(month) {
  return write(['targets'], (tx) => rq(tx.objectStore('targets').delete(month)));
}

// ---------- Meta ----------
export async function getMeta(key) {
  const row = await read(['meta'], (tx) => rq(tx.objectStore('meta').get(key)));
  return row ? row.value : undefined;
}

export function setMeta(key, value) {
  return write(['meta'], (tx) => rq(tx.objectStore('meta').put({ key, value })));
}

// ---------- Backup / restore ----------
export async function exportAll() {
  const data = await read(STORES, async (tx) => {
    const out = {};
    for (const name of STORES) out[name] = await rq(tx.objectStore(name).getAll());
    return out;
  });
  return { app: 'savings-monitor', version: DB_VERSION, exportedAt: new Date().toISOString(), data };
}

export function importAll(backup) {
  const valid =
    backup &&
    backup.app === 'savings-monitor' &&
    backup.data &&
    STORES.every((name) => Array.isArray(backup.data[name]));
  if (!valid) return Promise.reject(new ValidationError('This file is not a valid Savings Monitor backup.'));
  return write(STORES, async (tx) => {
    for (const name of STORES) {
      const store = tx.objectStore(name);
      await rq(store.clear());
      for (const row of backup.data[name]) await rq(store.put(row));
    }
  });
}

export function resetAll() {
  return write(STORES, async (tx) => {
    for (const name of STORES) await rq(tx.objectStore(name).clear());
    for (const name of DEFAULT_CATEGORIES) await rq(tx.objectStore('categories').add({ name }));
  });
}
