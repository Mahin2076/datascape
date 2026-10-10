// The app's neighborhood chat, computed with the app's own modules: the same fictional
// San Francisco households, the same Census medians, the same scenario presets and the
// same budget arithmetic, so every number on the "ask the block" slides matches the app.
import db from '../../../dist/assets/data.json';
import { createHousingData, calculateBudget } from '../../../dist/data/index.js';
import { RESIDENTS } from '../../../dist/residents/fixtures.js';
import { resolveHousehold, computeBudgets } from '../../../dist/residents/budget.js';
import { SCENARIO_PRESETS } from '../../../dist/residents/contracts.js';

// The app opens on San Francisco, 2024 (dist/app.js).
const CITY = 'sf';
const YEAR = 2024;
const housing = createHousingData(db).getHousing(CITY, YEAR);
if (!housing) throw new Error(`No sourced housing data for ${CITY} ${YEAR}`);

// The resident panel's presets: "Rent +10%" and "Rent +10%, income +5%".
const preset = (id) => {
  const p = SCENARIO_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Missing scenario preset ${id}`);
  return { rentChangePct: p.rentChangePct, incomeChangePct: p.incomeChangePct };
};
export const SCENARIOS = { shock: preset('rent10'), raise: preset('both') };
// What gets typed into the chat bubble on each slide.
export const QUESTIONS = {
  shock: 'If rent rose 10% here, what would you have to change to stay?',
  raise: 'With rent up 10% and pay up 5%, is there enough room to stay?',
};
export const HOUSING = { geography: housing.geography, period: housing.period, year: YEAR };

const share = (b) => b.adjustedRent / b.monthlyIncome;

/** The four San Francisco households, in the app's fixture order. */
export const HOUSEHOLDS = RESIDENTS.filter((r) => r.cityId === CITY).map((r) => {
  const household = resolveHousehold(r, housing);
  const shock = computeBudgets(household, SCENARIOS.shock, calculateBudget);
  const raise = computeBudgets(household, SCENARIOS.raise, calculateBudget);
  if ([shock.before, shock.after, raise.after].some((b) => b.status !== 'ok')) {
    throw new Error(`Budget unavailable for ${r.id}`);
  }
  return {
    id: r.id,
    name: r.name,
    occupation: r.occupation,
    before: { share: share(shock.before), left: shock.before.remainingAfterRent },
    shock: { share: share(shock.after), rentUp: shock.delta.rent, left: shock.after.remainingAfterRent },
    raise: { share: share(raise.after), payUp: raise.delta.income, left: raise.after.remainingAfterRent },
  };
});
export const TASHA_INDEX = HOUSEHOLDS.findIndex((h) => h.id === 'sf-tasha');

/**
 * Which household a walker in the mapped street stands for. Mirrors dist/app.js: the
 * first 55 walkers get ids `sf-resident-${floor(i/5) + 1 + (i % 5) * 11}`, the rest
 * `sf-resident-${i + 1}`, and dist/residents/map-profiles.js cycles the four households.
 */
export function householdOfWalker(i) {
  const ordinal = i < 55 ? Math.floor(i / 5) + 1 + (i % 5) * 11 : i + 1;
  return (ordinal - 1) % HOUSEHOLDS.length;
}

/** Sprite the app draws for walker i (dist/app.js: char = (i + 1) % 10, repeated after 55). */
export const spriteOfWalker = (i) => ((i % 55) + 1) % 10;
