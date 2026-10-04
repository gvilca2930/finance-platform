const currencySymbols: Record<string, string> = { PEN: 'S/', USD: 'US$', EUR: '€' };

export function formatMoney(value: string, currency = 'PEN'): string {
  const [integer = '0', decimal = '00'] = value.replace('-', '').split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value.startsWith('-') ? '-' : '';
  return `${sign}${currencySymbols[currency] ?? currency} ${grouped}.${decimal.padEnd(2, '0').slice(0, 2)}`;
}

export function normalizeMoneyInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const [integer = '', ...parts] = normalized.split('.');
  return parts.length ? `${integer}.${parts.join('').slice(0, 2)}` : integer;
}

export const signedMoney = (value: string, type: 'INCOME' | 'EXPENSE', currency = 'PEN') =>
  `${type === 'INCOME' ? '+' : '−'} ${formatMoney(value, currency)}`;
