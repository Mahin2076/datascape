// Unit tests for dist/residents (Teammate 1). Run: node --test tests/residents/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeScenario, normalizeHousing, normalizeBudget, normalizeSelection, assertDataAdapter, SCENARIO_PRESETS,
} from '../../dist/residents/contracts.js';
import { RESIDENTS, CITY_NAMES, getResident, listResidents } from '../../dist/residents/fixtures.js';
import { resolveHousehold, computeBudgets } from '../../dist/residents/budget.js';
import {
  scriptedReaction, classify, budgetFacts, createRemoteProvider, STANCES, SCRIPTED_METHOD,
  SCENARIO_STANCES, isHardship, voiceLine,
} from '../../dist/residents/reactions.js';
import { money, pct, signedMoney } from '../../dist/residents/format.js';
import { createContractStub } from '../../dist/residents/dev/contract-stub.js';

const db = JSON.parse(readFileSync(new URL('../../dist/assets/data.json', import.meta.url)));
const stub = createContractStub({ db });
const appJs = readFileSync(new URL('../../dist/app.js', import.meta.url), 'utf8');

async function scenarioFor(resident, year, scenario) {
  const housing = normalizeHousing(await stub.getHousing(resident.cityId, year));
  const household = resolveHousehold(resident, housing);
  const budgets = computeBudgets(household, scenario, stub.calculateBudget);
  return { housing, household, budgets };
}

test('scenario values are clamped, rounded, and default to no change', () => {
  assert.deepEqual({ ...normalizeScenario({ rentChangePct: 10.4, incomeChangePct: '5' }) }, { rentChangePct: 10, incomeChangePct: 5 });
  assert.deepEqual({ ...normalizeScenario({ rentChangePct: 999, incomeChangePct: -999 }) }, { rentChangePct: 100, incomeChangePct: -50 });
  assert.deepEqual({ ...normalizeScenario({ rentChangePct: 'abc' }) }, { rentChangePct: 0, incomeChangePct: 0 });
  assert.deepEqual({ ...normalizeScenario() }, { rentChangePct: 0, incomeChangePct: 0 });
  const sel = normalizeSelection({ cityId: 'sf', year: '2024', scenario: { rentChangePct: 10 } });
  assert.equal(sel.year, 2024);
  assert.ok(Object.isFrozen(sel));
});

test('housing normalization keeps only https sources and positive numbers', () => {
  const h = normalizeHousing({
    monthlyRent: 2000, annualIncome: -5, geography: 'X', period: '2020–2024',
    sources: [{ label: 'ok', url: 'https://www2.census.gov/a.dat' }, { label: 'bad', url: 'javascript:alert(1)' }, { label: 'http', url: 'http://x.test' }],
  });
  assert.equal(h.monthlyRent, 2000);
  assert.equal(h.annualIncome, null);
  assert.deepEqual(h.sources.map((s) => s.label), ['ok']);
  assert.equal(normalizeHousing(null), null);
});

test('budget normalization never reports a ratio without positive income', () => {
  const b = normalizeBudget({ status: 'ok', monthlyIncome: 0, adjustedRent: 1000, remainingAfterRent: -1000, rentToIncomeRatio: Infinity });
  assert.equal(b.status, 'income_unavailable');
  assert.equal(b.rentToIncomeRatio, null);
  assert.equal(b.remainingAfterRent, null);
  assert.equal(normalizeBudget({ status: 'ok', monthlyIncome: NaN }).status, 'invalid');
});

test('data adapter must provide both contract functions', () => {
  assert.throws(() => assertDataAdapter({ getHousing() {} }), /calculateBudget/);
  assert.doesNotThrow(() => assertDataAdapter(stub));
});

test('fixture: unique ids, 4 residents per city, valid sprites and building names', () => {
  const ids = new Set(RESIDENTS.map((r) => r.id));
  assert.equal(ids.size, RESIDENTS.length);
  const order = ['sf', 'nyc', 'austin', 'chicago', 'seattle'];
  assert.deepEqual(Object.keys(CITY_NAMES), order);
  assert.deepEqual(db.cities.map((c) => c.id), order, 'fixture city ids match data.json');
  const names = ['Pacific Court', 'Hudson House', 'Juniper Place', 'Lakeside Row', 'Cedar Court'];
  const second = ['Bay Window House', 'Orchard House', 'Sunflower House', 'Willow House', 'Evergreen House'];
  for (const name of [...names, ...second, 'Garden Apartments', 'The Corner Residence']) {
    assert.ok(appJs.includes(`'${name}'`), `${name} is a building title in app.js`);
  }
  order.forEach((cityId, i) => {
    const list = listResidents(cityId);
    assert.equal(list.length, 4, cityId);
    assert.deepEqual(list.map((r) => r.building).sort(),
      [names[i], second[i], 'Garden Apartments', 'The Corner Residence'].sort(), `${cityId} buildings`);
    for (const r of list) assert.ok(Number.isInteger(r.sprite) && r.sprite >= 0 && r.sprite <= 9);
  });
  for (const r of RESIDENTS) {
    for (const a of [r.rent, r.income]) {
      assert.ok(a.anchor === 'fixed' ? a.amount > 0 : a.multiplier > 0, `${r.id} anchor`);
    }
    assert.ok(r.essentialsMonthly > 0);
  }
  assert.equal(getResident('nope'), null);
});

test('household resolves median anchors with provenance and fixed amounts as illustrative', async () => {
  const ines = getResident('sf-ines');
  const { housing, household } = await scenarioFor(ines, 2021, {});
  assert.equal(household.monthlyRent, Math.round(2130 * 0.8));
  assert.equal(household.annualIncome, Math.round(126187 * 0.42));
  assert.equal(household.provenance.rent.kind, 'cityMedian');
  assert.equal(household.provenance.rent.median, housing.monthlyRent);
  assert.ok(household.provenance.rent.sources.every((s) => s.url.startsWith('https://www2.census.gov/')));
  const walt = await scenarioFor(getResident('sf-walt'), 2024, {});
  assert.equal(walt.household.monthlyRent, 1150);
  assert.equal(walt.household.provenance.rent.kind, 'fixed');
});

test('unavailable budgets say what is missing and never show numbers', () => {
  const ines = getResident('sf-ines');
  const none = resolveHousehold(ines, null);
  assert.equal(none.monthlyRent, null);
  const missing = computeBudgets(none, { rentChangePct: 10 }, stub.calculateBudget);
  assert.equal(missing.after.status, 'rent_unavailable');
  const failed = computeBudgets(none, { rentChangePct: 10 }, stub.calculateBudget, { housingLoaded: false });
  assert.equal(failed.after.status, 'housing_unavailable');
  const rentOnly = resolveHousehold(ines, normalizeHousing({ monthlyRent: 2000, annualIncome: null, sources: [] }));
  assert.equal(computeBudgets(rentOnly, {}, stub.calculateBudget).after.status, 'income_unavailable');
  const r = scriptedReaction({ resident: ines, budgets: failed, year: 2024 });
  assert.equal(r.stance, 'unknown');
  assert.match(r.why, /could not be loaded/);
  assert.equal(r.facts.length, 1);
  // Fixed-amount households don't need housing data at all.
  const walt = computeBudgets(resolveHousehold(getResident('sf-walt'), null), {}, stub.calculateBudget, { housingLoaded: false });
  assert.equal(walt.after.status, 'ok');
  const throwing = computeBudgets(resolveHousehold(getResident('sf-walt'), null), {}, () => { throw new Error('x'); });
  assert.equal(throwing.after.status, 'invalid');
});

test('normalizeBudget rejects incomplete, inconsistent or percent-unit results', () => {
  const ok = { monthlyIncome: 5000.4, adjustedRent: 1500.6, remainingAfterRent: 3499.8, rentToIncomeRatio: 1500.6 / 5000.4 };
  const good = normalizeBudget(ok);
  assert.equal(good.status, 'ok');
  assert.equal(good.monthlyIncome - good.adjustedRent, good.remainingAfterRent, 'rounded values add up');
  assert.equal(normalizeBudget({ ...ok, remainingAfterRent: undefined, remaining: 3499.8 }).status, 'invalid');
  assert.equal(normalizeBudget({ ...ok, rentToIncomeRatio: 30.01 }).status, 'invalid', 'percent instead of fraction');
  assert.equal(normalizeBudget({ ...ok, remainingAfterRent: 100 }).status, 'invalid', 'inconsistent remaining');
  assert.equal(normalizeBudget(null).status, 'invalid');
});

test('computeBudgets asks the calculator for today and for the scenario', () => {
  const calls = [];
  const calc = (input) => { calls.push(input); return stub.calculateBudget(input); };
  computeBudgets({ monthlyRent: 1000, annualIncome: 60000, provenance: {} }, { rentChangePct: 10, incomeChangePct: 5 }, calc);
  assert.deepEqual(calls, [
    { monthlyRent: 1000, annualIncome: 60000, rentChangePct: 0, incomeChangePct: 0 },
    { monthlyRent: 1000, annualIncome: 60000, rentChangePct: 10, incomeChangePct: 5 },
  ]);
});

test('H5 acceptance: every explanation states the numbers calculated for the current scenario', async () => {
  let checked = 0;
  for (const resident of RESIDENTS) {
    for (const year of db.years) {
      for (const p of SCENARIO_PRESETS) {
        const { budgets } = await scenarioFor(resident, year, p);
        const r = scriptedReaction({ resident, budgets, year });
        assert.ok(Object.hasOwn(STANCES, r.stance));
        assert.equal(r.method.kind, 'scripted');
        const text = r.facts.join(' ');
        assert.ok(text.includes(money(budgets.after.adjustedRent)), `${resident.id} ${year} ${p.id} rent`);
        assert.ok(text.includes(money(budgets.after.remainingAfterRent)), `${resident.id} ${year} ${p.id} remaining`);
        assert.ok(text.includes(pct(budgets.after.rentToIncomeRatio)), `${resident.id} ${year} ${p.id} ratio`);
        if (p.rentChangePct) assert.ok(text.includes(signedMoney(budgets.delta.rent)));
        if (p.id === 'none') assert.equal(r.stance, 'baseline');
        assert.deepEqual(r, scriptedReaction({ resident, budgets, year }), 'deterministic');
        for (const k of ['rent', 'income', 'remaining']) {
          const field = { rent: 'adjustedRent', income: 'monthlyIncome', remaining: 'remainingAfterRent' }[k];
          assert.equal(budgets.after[field] - budgets.before[field], budgets.delta[k], `${resident.id} ${k} delta adds up`);
        }
        assert.ok(!/−\$[\d,]+ less/.test(r.why + r.text), `${resident.id} no double negative: ${r.why}`);
        if (p.id === 'none') assert.match(r.text, new RegExp(String(year)));
        checked += 1;
      }
    }
  }
  assert.equal(checked, RESIDENTS.length * 4 * SCENARIO_PRESETS.length);
});

test('changing the scenario changes the reaction explanation', async () => {
  const resident = getResident('sf-tasha');
  const a = scriptedReaction({ resident, year: 2024, budgets: (await scenarioFor(resident, 2024, { rentChangePct: 10 })).budgets });
  const b = scriptedReaction({ resident, year: 2024, budgets: (await scenarioFor(resident, 2024, { rentChangePct: 30 })).budgets });
  assert.notDeepEqual(a.facts, b.facts);
});

test('rule table reaches every stance with synthetic budgets', () => {
  const base = getResident('sf-ines'); // essentials 1100, solo, can add a roommate
  const mk = (before, after, overrides = {}) => ({
    year: 2024,
    resident: { ...base, ...overrides, traits: { ...base.traits, ...(overrides.traits ?? {}) } },
    budgets: {
      scenario: { rentChangePct: 10, incomeChangePct: 0 },
      before: { status: 'ok', monthlyIncome: 5000, ...before }, after: { status: 'ok', monthlyIncome: 5000, ...after },
      delta: { remaining: after.remainingAfterRent - before.remainingAfterRent, rent: 0, income: 0 },
    },
  });
  const B = { adjustedRent: 1500, remainingAfterRent: 3500, rentToIncomeRatio: 0.2 };
  const st = (after, o, before = B) => classify(mk(before, after, o))[0];
  assert.equal(st({ adjustedRent: 1400, remainingAfterRent: 3600, rentToIncomeRatio: 0.28 }), 'relief');
  assert.equal(st({ ...B }), 'unchanged');
  assert.equal(st({ adjustedRent: 1550, remainingAfterRent: 3450, rentToIncomeRatio: 0.29 }), 'absorb');
  assert.equal(st({ adjustedRent: 1650, remainingAfterRent: 3350, rentToIncomeRatio: 0.33 }), 'cut_back');
  assert.equal(st({ adjustedRent: 4100, remainingAfterRent: 900, rentToIncomeRatio: 0.55 }), 'roommate');
  assert.equal(st({ adjustedRent: 4100, remainingAfterRent: 900, rentToIncomeRatio: 0.55 }, { traits: { canAddRoommate: false } }), 'cut_essentials');
  assert.equal(st({ adjustedRent: 4700, remainingAfterRent: 300, rentToIncomeRatio: 0.59 }), 'move');
  assert.equal(st({ adjustedRent: 4700, remainingAfterRent: 300, rentToIncomeRatio: 0.59 }, { yearsInHome: 25 }), 'stay_at_cost');
  // Already short, and the scenario helps: never a hardship stance, never "no longer".
  const short = { adjustedRent: 4100, remainingAfterRent: 900, rentToIncomeRatio: 0.82 };
  const [helped, why] = classify(mk(short, { adjustedRent: 4050, remainingAfterRent: 950, rentToIncomeRatio: 0.81 }));
  assert.equal(helped, 'still_short');
  assert.doesNotMatch(why, /no longer/);
  assert.equal(st({ adjustedRent: 3800, remainingAfterRent: 1200, rentToIncomeRatio: 0.76 }, {}, short), 'relief');
  // Already short, and the scenario hurts: says it deepens the shortfall.
  const [, deeper] = classify(mk({ adjustedRent: 4000, remainingAfterRent: 1000, rentToIncomeRatio: 0.8 }, { adjustedRent: 4300, remainingAfterRent: 700, rentToIncomeRatio: 0.86 }, { traits: { canAddRoommate: false } }));
  assert.match(deeper, /already short/);
});

test('improving scenarios never produce a hardship stance (all residents and years)', async () => {
  for (const resident of RESIDENTS) {
    for (const year of db.years) {
      for (const scenario of [{ incomeChangePct: 5 }, { rentChangePct: -10 }, { rentChangePct: 10, incomeChangePct: 15 }]) {
        const { budgets } = await scenarioFor(resident, year, scenario);
        if (budgets.delta.remaining <= 0) continue;
        const r = scriptedReaction({ resident, budgets, year });
        assert.ok(!isHardship(r.stance), `${resident.id} ${year} ${JSON.stringify(scenario)} -> ${r.stance}`);
        assert.doesNotMatch(r.why, /no longer/);
      }
    }
  }
});

test('voice lines match the household: no kids talk without kids, no "we" when living alone', () => {
  const budgets = {
    scenario: { rentChangePct: 10, incomeChangePct: 0 },
    before: { status: 'ok', monthlyIncome: 5000, adjustedRent: 1500, remainingAfterRent: 3500, rentToIncomeRatio: 0.3 },
    after: { status: 'ok', monthlyIncome: 5000, adjustedRent: 1650, remainingAfterRent: 3350, rentToIncomeRatio: 0.33 },
    delta: { remaining: -150, rent: 150, income: 0 },
  };
  for (const resident of RESIDENTS) {
    for (const stance of SCENARIO_STANCES.filter((x) => x !== 'unchanged')) {
      const line = voiceLine(resident, stance, budgets);
      if (!resident.traits.hasKids) assert.doesNotMatch(line, /\bkids?\b|childcare|daycare/i, `${resident.id} ${stance}: ${line}`);
      if (resident.household.size === 1) assert.doesNotMatch(line, /\b(we|we’[a-z]+|our|us)\b/i, `${resident.id} ${stance}: ${line}`);
    }
  }
});

function fakeFetch(handler) {
  return async (url, init) => handler(url, init);
}

test('remote provider uses only the model quote; stance, why and facts stay calculated', async () => {
  const resident = getResident('sf-ines');
  const { budgets } = await scenarioFor(resident, 2024, { rentChangePct: 10 });
  const input = { resident, budgets, year: 2024 };
  const scripted = scriptedReaction(input);
  let sent;
  const provider = createRemoteProvider({
    url: 'https://reactions.example/api',
    fetchImpl: fakeFetch(async (_url, init) => {
      sent = JSON.parse(init.body);
      return { ok: true, json: async () => ({ stance: 'relief', text: '<img src=x onerror=alert(1)> I would look elsewhere.', why: 'Model says so.', model: 'demo-model', facts: ['Rent: $1'] }) };
    }),
  });
  const r = await provider.react(input);
  assert.equal(r.method.kind, 'ai');
  assert.equal(r.method.label, 'AI-generated (demo-model)');
  assert.match(r.method.disclosure, /not testimony from a real resident/);
  assert.equal(r.stance, scripted.stance, 'model cannot change the stance');
  assert.equal(r.why, scripted.why, 'model cannot change the why');
  assert.deepEqual(r.facts, budgetFacts(input), 'model cannot replace calculated facts');
  assert.ok(r.text.includes('<img'), 'text kept verbatim; the panel renders it with textContent');
  assert.equal(sent.resident.id, 'sf-ines');
  assert.equal(sent.stance, scripted.stance);
  // Baseline/unknown never call the model.
  let called = false;
  const spy = createRemoteProvider({ url: 'https://x.example', fetchImpl: async () => { called = true; return { ok: false }; } });
  const base = await spy.react({ resident, year: 2024, budgets: (await scenarioFor(resident, 2024, {})).budgets });
  assert.equal(base.stance, 'baseline');
  assert.equal(called, false);
});

test('remote provider falls back to scripted on error, bad payload, timeout, or supersede', async () => {
  const resident = getResident('sf-ines');
  const { budgets } = await scenarioFor(resident, 2024, { rentChangePct: 10 });
  const input = { resident, budgets, year: 2024 };
  const hang = (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const cases = [
    [fakeFetch(async () => ({ ok: false, status: 500, json: async () => ({}) })), /unavailable/, {}],
    [fakeFetch(async () => ({ ok: true, json: async () => ({ stance: 'nonsense' }) })), /unavailable/, {}],
    [hang, /timed out/, {}],
  ];
  for (const [i, [fetchImpl, reason, opts]] of cases.entries()) {
    const r = await createRemoteProvider({ url: 'https://x.example', fetchImpl, timeoutMs: 20 }).react(input, opts);
    assert.equal(r.method.kind, 'scripted', `case ${i}`);
    assert.match(r.method.fallbackReason, reason);
    assert.equal(r.text, scriptedReaction(input).text);
  }
  const controller = new AbortController();
  const pending = createRemoteProvider({ url: 'https://x.example', fetchImpl: hang, timeoutMs: 10_000 }).react(input, { signal: controller.signal });
  controller.abort();
  const superseded = await pending;
  assert.equal(superseded.method.kind, 'scripted', 'abort ends the request promptly');
  assert.throws(() => createRemoteProvider({}), /needs url/);
});

test('scripted method disclosure says it is not live AI and not a real resident', () => {
  assert.match(SCRIPTED_METHOD.disclosure, /Not live AI/);
  assert.match(SCRIPTED_METHOD.disclosure, /not a real resident/);
});
