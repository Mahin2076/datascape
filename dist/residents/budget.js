// Resolve an illustrative household's rent and income, then ask the data module's
// calculateBudget for before/after-scenario budgets. Arithmetic on budgets lives in
// the data module (plan task H3); this file only builds inputs and records provenance.

import { normalizeBudget, normalizeScenario, unavailableBudget } from './contracts.js';

/**
 * @typedef {{
 *   kind: 'cityMedian'|'fixed', multiplier?: number, median?: number|null,
 *   period?: string, geography?: string, sources?: {label:string,url:string}[]
 * }} Provenance
 * @typedef {{
 *   monthlyRent: number|null, annualIncome: number|null,
 *   provenance: { rent: Provenance, income: Provenance }
 * }} Household
 */

function resolveAnchor(anchor, median, housing) {
  if (anchor.anchor === 'fixed') {
    return { value: anchor.amount, provenance: { kind: 'fixed' } };
  }
  const value = median === null ? null : Math.round(median * anchor.multiplier);
  return {
    value,
    provenance: {
      kind: 'cityMedian',
      multiplier: anchor.multiplier,
      median,
      period: housing?.period ?? '',
      geography: housing?.geography ?? '',
      sources: housing?.sources ?? [],
    },
  };
}

/**
 * @param {import('./fixtures.js').Resident} resident
 * @param {import('./contracts.js').Housing|null} housing
 * @returns {Household}
 */
export function resolveHousehold(resident, housing) {
  const rent = resolveAnchor(resident.rent, housing?.monthlyRent ?? null, housing);
  const income = resolveAnchor(resident.income, housing?.annualIncome ?? null, housing);
  return Object.freeze({
    monthlyRent: rent.value,
    annualIncome: income.value,
    provenance: Object.freeze({ rent: rent.provenance, income: income.provenance }),
  });
}

/**
 * Before (no change) and after (scenario) budgets for one household.
 * An unavailable budget says why: rent or income median missing, housing data failed
 * to load, or the calculator returned something that doesn't add up.
 * @param {Household} household
 * @param {import('./contracts.js').Scenario} scenario
 * @param {(input: object) => object} calculateBudget  data module contract
 * @param {{ housingLoaded?: boolean }} [options]
 */
export function computeBudgets(household, scenario, calculateBudget, { housingLoaded = true } = {}) {
  const s = normalizeScenario(scenario);
  const missing = household.monthlyRent === null || household.annualIncome === null;
  let reason = null;
  if (missing && !housingLoaded) reason = 'housing_unavailable';
  else if (household.monthlyRent === null) reason = 'rent_unavailable';
  else if (household.annualIncome === null) reason = 'income_unavailable';
  const call = (rentChangePct, incomeChangePct) => {
    if (reason) return unavailableBudget(reason);
    try {
      return normalizeBudget(calculateBudget({
        monthlyRent: household.monthlyRent,
        annualIncome: household.annualIncome,
        rentChangePct,
        incomeChangePct,
      }));
    } catch {
      return unavailableBudget('invalid');
    }
  };
  const before = call(0, 0);
  const after = call(s.rentChangePct, s.incomeChangePct);
  // Deltas from the already-rounded values, so displayed before -> after (delta) adds up.
  const diff = (a, b) => (a === null || b === null ? null : a - b);
  return Object.freeze({
    scenario: s,
    before,
    after,
    delta: Object.freeze({
      rent: diff(after.adjustedRent, before.adjustedRent),
      income: diff(after.monthlyIncome, before.monthlyIncome),
      remaining: diff(after.remainingAfterRent, before.remainingAfterRent),
      ratio: diff(after.rentToIncomeRatio, before.rentToIncomeRatio),
    }),
  });
}
