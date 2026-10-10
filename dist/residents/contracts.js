// Shared contracts for the resident-stories branch (plan: "Shared integration contracts").
// Pure functions only: no DOM, no network. Every value that crosses a branch boundary is
// normalized here so a mismatch fails visibly instead of rendering a wrong number.

/**
 * @typedef {{ rentChangePct: number, incomeChangePct: number }} Scenario
 *   Percent changes; `10` means +10%, `0` means no change.
 * @typedef {{ cityId: string, year: number, scenario: Scenario }} Selection
 * @typedef {{ label: string, url: string }} SourceLink
 * @typedef {{
 *   monthlyRent: number|null, annualIncome: number|null, geography: string,
 *   period: string, sources: SourceLink[]
 * }} Housing  Shape returned by the data module's getHousing(cityId, year).
 * @typedef {{
 *   status: 'ok'|'income_unavailable'|'rent_unavailable'|'housing_unavailable'|'invalid',
 *   monthlyIncome: number|null, adjustedRent: number|null,
 *   remainingAfterRent: number|null, rentToIncomeRatio: number|null
 * }} Budget  Shape returned by the data module's calculateBudget(...).
 */

export const SCENARIO_LIMITS = Object.freeze({ min: -50, max: 100 });

export const SCENARIO_PRESETS = Object.freeze([
  Object.freeze({ id: 'none', label: 'No change', rentChangePct: 0, incomeChangePct: 0 }),
  Object.freeze({ id: 'rent10', label: 'Rent +10%', rentChangePct: 10, incomeChangePct: 0 }),
  Object.freeze({ id: 'income5', label: 'Income +5%', rentChangePct: 0, incomeChangePct: 5 }),
  Object.freeze({ id: 'both', label: 'Rent +10%, income +5%', rentChangePct: 10, incomeChangePct: 5 }),
]);

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

function clampPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(SCENARIO_LIMITS.max, Math.max(SCENARIO_LIMITS.min, n)));
}

/** @returns {Scenario} */
export function normalizeScenario(scenario = {}) {
  return Object.freeze({
    rentChangePct: clampPct(scenario.rentChangePct),
    incomeChangePct: clampPct(scenario.incomeChangePct),
  });
}

/** @returns {Selection} */
export function normalizeSelection(selection = {}) {
  const year = Number(selection.year);
  return Object.freeze({
    cityId: typeof selection.cityId === 'string' ? selection.cityId : '',
    year: Number.isInteger(year) ? year : NaN,
    scenario: normalizeScenario(selection.scenario),
  });
}

export function sameScenario(a, b) {
  return a.rentChangePct === b.rentChangePct && a.incomeChangePct === b.incomeChangePct;
}

export function isNoChange(scenario) {
  return scenario.rentChangePct === 0 && scenario.incomeChangePct === 0;
}

function safeUrl(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Normalize the data module's housing record. Unknown or unsafe fields are dropped;
 * sources must be https links.
 * @returns {Housing|null}
 */
export function normalizeHousing(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rent = finite(raw.monthlyRent) && raw.monthlyRent > 0 ? raw.monthlyRent : null;
  const income = finite(raw.annualIncome) && raw.annualIncome > 0 ? raw.annualIncome : null;
  const sources = (Array.isArray(raw.sources) ? raw.sources : [])
    .map((s) => ({ label: String(s?.label ?? 'Source'), url: safeUrl(s?.url) }))
    .filter((s) => s.url);
  return Object.freeze({
    monthlyRent: rent,
    annualIncome: income,
    geography: String(raw.geography ?? ''),
    period: String(raw.period ?? ''),
    sources: Object.freeze(sources),
  });
}

export const unavailableBudget = (status) => Object.freeze({
  status, monthlyIncome: null, adjustedRent: null, remainingAfterRent: null, rentToIncomeRatio: null,
});

/**
 * Normalize calculateBudget output. `ok` only when every field is present, finite and
 * internally consistent (remaining = income - rent; ratio = rent / income as a fraction,
 * which catches percent-vs-fraction mix-ups). Money is rounded to whole dollars once,
 * here, so before/after/delta shown on screen always add up.
 * @returns {Budget}
 */
export function normalizeBudget(raw) {
  if (!raw || typeof raw !== 'object') return unavailableBudget('invalid');
  if (raw.status === 'income_unavailable') return unavailableBudget('income_unavailable');
  const { monthlyIncome, adjustedRent, remainingAfterRent, rentToIncomeRatio } = raw;
  if (finite(monthlyIncome) && monthlyIncome <= 0) return unavailableBudget('income_unavailable');
  if (![monthlyIncome, adjustedRent, remainingAfterRent, rentToIncomeRatio].every(finite)) return unavailableBudget('invalid');
  if (adjustedRent < 0 || rentToIncomeRatio < 0 || rentToIncomeRatio > 5) return unavailableBudget('invalid');
  if (Math.abs(remainingAfterRent - (monthlyIncome - adjustedRent)) > 1
    || Math.abs(rentToIncomeRatio - adjustedRent / monthlyIncome) > 0.001) {
    return unavailableBudget('invalid');
  }
  const income = Math.round(monthlyIncome);
  const rent = Math.round(adjustedRent);
  return Object.freeze({
    status: 'ok',
    monthlyIncome: income,
    adjustedRent: rent,
    remainingAfterRent: income - rent,
    rentToIncomeRatio,
  });
}

/** Validate an injected data adapter early, with a message naming what is missing. */
export function assertDataAdapter(data) {
  const missing = ['getHousing', 'calculateBudget'].filter((k) => typeof data?.[k] !== 'function');
  if (missing.length) {
    throw new TypeError(`resident-stories: data adapter is missing ${missing.join(', ')}`);
  }
}
