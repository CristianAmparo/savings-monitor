import { h } from '../dom.js';
import { icon } from '../icons.js';

export function toast(message, tone = 'success') {
  const root = document.getElementById('toast-root');
  const node = h(
    'div',
    { class: tone === 'error' ? 'toast toast--error' : 'toast' },
    icon(tone === 'error' ? 'alert-circle' : 'check', 20),
    message,
  );
  root.append(node);
  setTimeout(() => node.remove(), 3000);
}
