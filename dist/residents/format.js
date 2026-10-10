// Display formatting shared by resident components.

export function money(n) {
  if (n === null || !Number.isFinite(n)) return '—';
  const sign = n < 0 ? '−' : '';
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
}

export function signedMoney(n) {
  if (n === null || !Number.isFinite(n)) return '—';
  if (Math.round(n) === 0) return '$0';
  return n > 0 ? `+${money(n)}` : money(n);
}

export function pct(ratio, digits = 1) {
  if (ratio === null || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function scenarioLabel(scenario) {
  const part = (v, what) => (v === 0 ? null : `${what} ${v > 0 ? '+' : '−'}${Math.abs(v)}%`);
  const parts = [part(scenario.rentChangePct, 'Rent'), part(scenario.incomeChangePct, 'Income')].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No change';
}
