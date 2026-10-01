import { getPref, setPref } from '../prefs.js';
import { peso } from '../format.js';
import { iconButton } from './components.js';

const MASK = '••••';

export const isHidden = () => getPref('hideBalance', false);

// Savings amounts go through here so the hide-balance toggle can mask them.
export const balanceText = (centavos) => (isHidden() ? MASK : peso(centavos));

export function hideToggle(onChange) {
  const hidden = isHidden();
  return iconButton({
    iconName: hidden ? 'eye-off' : 'eye',
    label: hidden ? 'Show balances' : 'Hide balances',
    onClick: () => {
      setPref('hideBalance', !hidden);
      onChange();
    },
  });
}
