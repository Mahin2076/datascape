// Resident reactions (plan task H5). Two providers share one shape:
//   scripted — deterministic rules over the calculated budget; the default.
//   remote   — optional adapter for a live-AI backend owned elsewhere; credentials stay
//              server-side and any failure falls back to scripted.
// The stance, the "why" and the numeric facts are always computed here from
// calculateBudget output; a model may only supply the quoted wording. So the
// explanation can't disagree with the scenario on screen.

import { isNoChange } from './contracts.js';
import { money, pct, scenarioLabel, signedMoney } from './format.js';

/**
 * @typedef {{ kind: 'scripted'|'ai', label: string, disclosure: string, model?: string, fallbackReason?: string }} Method
 * @typedef {{ stance: string, headline: string, text: string, facts: string[], why: string, scenario: string, method: Method }} Reaction
 * @typedef {{ resident: import('./fixtures.js').Resident, budgets: ReturnType<import('./budget.js').computeBudgets>, year: number }} ReactionInput
 */

export const STANCES = Object.freeze({
  relief: 'Breathing room',
  still_short: 'Helps, but still short',
  unchanged: 'No change',
  absorb: 'Can absorb it',
  cut_back: 'Tightening the budget',
  roommate: 'Would take a roommate',
  cut_essentials: 'Cutting essentials',
  stay_at_cost: 'Staying, at a cost',
  move: 'Likely to move',
  baseline: 'Baseline',
  unknown: 'Can’t tell',
});

/** Stances a scenario can produce (used to validate anything coming from outside). */
export const SCENARIO_STANCES = Object.freeze(Object.keys(STANCES).filter((s) => s !== 'baseline' && s !== 'unknown'));
const HARDSHIP = new Set(['cut_essentials', 'roommate', 'move', 'stay_at_cost', 'cut_back', 'absorb']);
export const isHardship = (stance) => HARDSHIP.has(stance);

export const SCRIPTED_METHOD = Object.freeze({
  kind: 'scripted',
  label: 'Scripted reaction',
  disclosure: 'Rule-based text written for this demo from the budget numbers shown. Not live AI, and not a real resident.',
});

export const UNAVAILABLE = Object.freeze({
  income_unavailable: 'No household income figure is available for this city and year, so no budget is calculated.',
  rent_unavailable: 'No rent figure is available for this city and year, so no budget is calculated.',
  housing_unavailable: 'Housing data could not be loaded, so no budget is calculated.',
  invalid: 'The budget calculator returned values that don’t add up, so no budget is shown.',
});

const okBudgets = ({ before, after }) => before.status === 'ok' && after.status === 'ok';
const unavailableReason = ({ before, after }) => UNAVAILABLE[after.status !== 'ok' ? after.status : before.status] ?? UNAVAILABLE.invalid;

/** Numeric lines shared by every provider. Built from rounded budget values only. */
export function budgetFacts(input) {
  const { resident, budgets } = input;
  if (!okBudgets(budgets)) return [unavailableReason(budgets)];
  const { before, after, delta, scenario } = budgets;
  const same = isNoChange(scenario);
  return [
    scenario.rentChangePct !== 0
      ? `Rent: ${money(before.adjustedRent)} → ${money(after.adjustedRent)} per month (${signedMoney(delta.rent)}).`
      : `Rent: ${money(after.adjustedRent)} per month.`,
    scenario.incomeChangePct !== 0
      ? `Income: ${money(before.monthlyIncome)} → ${money(after.monthlyIncome)} per month (${signedMoney(delta.income)}).`
      : `Income: ${money(after.monthlyIncome)} per month.`,
    same
      ? `Left after rent: ${money(after.remainingAfterRent)} per month.`
      : `Left after rent: ${money(before.remainingAfterRent)} → ${money(after.remainingAfterRent)} per month (${signedMoney(delta.remaining)}).`,
    same
      ? `Rent takes ${pct(after.rentToIncomeRatio)} of income.`
      : `Rent share of income: ${pct(before.rentToIncomeRatio)} → ${pct(after.rentToIncomeRatio)}.`,
    `Illustrative essentials besides rent: ${money(resident.essentialsMonthly)} per month.`,
  ];
}

/**
 * Rule table, in priority order. Hardship stances are only reachable when the
 * scenario makes the household worse off; "no longer covers" is only said when the
 * household covered its essentials before the change. Returns [stance, why].
 */
export function classify(input) {
  const { resident, budgets, year } = input;
  if (!okBudgets(budgets)) return ['unknown', unavailableReason(budgets)];
  if (isNoChange(budgets.scenario)) return ['baseline', `No scenario applied; this is the household’s ${year} baseline.`];
  const { before, after, delta } = budgets;
  const left = after.remainingAfterRent;
  const need = resident.essentialsMonthly;
  const ratio = after.rentToIncomeRatio;
  const d = delta.remaining;
  const wasShort = before.remainingAfterRent < need;

  if (d === 0) return ['unchanged', 'The amount left after rent does not change.'];
  if (d > 0) {
    if (left < need) {
      return ['still_short', `${money(d)} more is left after rent each month, but ${money(left)} still doesn’t cover ${money(need)} of essentials.`];
    }
    if (wasShort) {
      return ['relief', `${money(d)} more each month brings what’s left after rent to ${money(left)}, enough to cover ${money(need)} of essentials.`];
    }
    return ['relief', `${money(d)} more is left after rent each month.`];
  }

  const loss = money(-d);
  if (left < need * 0.5 || ratio >= 0.6) {
    const why = `After rent, only ${money(left)} is left against ${money(need)} of essentials${ratio >= 0.6 ? `, and rent would take ${pct(ratio)} of income` : ''}${wasShort ? '; the household was already short before this change' : ''}.`;
    if (resident.yearsInHome >= 20) {
      return ['stay_at_cost', `${why} But ${resident.yearsInHome} years in this home weigh against leaving (${resident.traits.roots}).`];
    }
    return ['move', why];
  }
  if (left < need) {
    const gap = wasShort
      ? `${loss} less a month deepens an existing shortfall: ${money(left)} left after rent against ${money(need)} of essentials`
      : `${money(left)} left after rent no longer covers ${money(need)} of essentials`;
    return resident.traits.canAddRoommate
      ? ['roommate', `${gap}, and a roommate is an option.`]
      : ['cut_essentials', `${gap}, with no room to add a roommate.`];
  }
  if (ratio >= 0.3) {
    return ['cut_back', `Rent would take ${pct(ratio)} of income (30% is the common cost-burden line), and ${loss} less is left after rent each month.`];
  }
  return ['absorb', `${loss} less a month is noticeable, but rent stays at ${pct(ratio)} of income.`];
}

// Voice lines. A value is a string, or picks by household: { kids, nokids } and/or
// { solo, group }. Tokens: {gain} {loss} {left} {ratio}.
const VOICES = {
  direct: {
    relief: { solo: 'That extra {gain} a month goes straight to the bills I’ve been putting off.', group: 'That extra {gain} a month goes straight to the bills we’ve been putting off.' },
    still_short: { solo: 'It helps, but I’m still coming up short every month.', group: 'It helps, but we’re still coming up short every month.' },
    absorb: { solo: 'It stings, {loss} a month, but I can handle it.', group: 'It stings, {loss} a month, but we can handle it.' },
    cut_back: { solo: 'I’m cutting takeout and anything extra. {loss} a month adds up.', group: 'We’re cutting takeout and anything extra. {loss} a month adds up.' },
    roommate: 'I’d have to find a roommate. Can’t cover everything on {left} after rent.',
    cut_essentials: { solo: 'Something has to give. {left} after rent doesn’t cover the basics.', group: 'Something has to give. {left} after rent doesn’t cover our basics.' },
    stay_at_cost: { solo: 'I’m not leaving, but I don’t know how long I can keep this up.', group: 'We’re not leaving, but I don’t know how long we can keep this up.' },
    move: { solo: 'I’d start looking somewhere cheaper. The numbers don’t work anymore.', group: 'We’d start looking somewhere cheaper. The numbers don’t work anymore.' },
  },
  planner: {
    relief: { solo: 'I’d put the extra {gain} toward savings. It finally gives me some margin.', group: 'We’d put the extra {gain} toward savings. It finally gives us some margin.' },
    still_short: { solo: 'Better, but the budget still doesn’t balance.', group: 'Better, but our budget still doesn’t balance.' },
    absorb: { solo: 'I’ll re-run the budget. {loss} a month is absorbable.', group: 'We’ll re-run the budget. {loss} a month is absorbable.' },
    cut_back: { solo: 'I’d pause the savings plan and trim groceries. Rent at {ratio} is too high.', group: 'We’d pause the savings plan and trim groceries. Rent at {ratio} is too high.' },
    roommate: { solo: 'I’d have to rethink the whole setup, maybe share the place.', group: 'We’d have to rethink the whole setup, maybe share the place.' },
    cut_essentials: { kids: 'We’d be choosing between childcare and everything else.', nokids: { solo: 'I’d be choosing which bills to pay late.', group: 'We’d be choosing which bills to pay late.' } },
    stay_at_cost: { solo: 'I’d stay and dig into savings, but that can’t last.', group: 'We’d stay and dig into savings, but that can’t last.' },
    move: { solo: 'I’d start comparing neighborhoods farther out this month.', group: 'We’d start comparing neighborhoods farther out this month.' },
  },
  steady: {
    relief: 'A little more room each month. That’s welcome.',
    still_short: 'It helps a bit. It’s still not enough.',
    absorb: 'I’ve seen increases before. I’ll manage.',
    cut_back: 'I’ll be careful. Fewer trips, cheaper groceries.',
    roommate: 'I suppose I could rent out a room.',
    cut_essentials: 'I’d skip things I shouldn’t, like refilling prescriptions on time.',
    stay_at_cost: 'This is home. I’ll go without before I go.',
    move: 'I’d have to leave, and I don’t know where I’d go.',
  },
  warm: {
    relief: { kids: 'We could breathe a little. Maybe even a weekend trip with the kids.', nokids: { solo: 'I could breathe a little. Maybe even a weekend trip.', group: 'We could breathe a little. Maybe even a weekend trip.' } },
    still_short: { solo: 'It’s kind, but I’m still behind each month.', group: 'It’s kind, but we’re still behind each month.' },
    absorb: { solo: 'I’ll be fine. A few small changes.', group: 'We’ll be fine. A few small changes.' },
    cut_back: { kids: 'We’d make it work, but the kids would notice the cutbacks.', nokids: { solo: 'I’d make it work, with fewer treats.', group: 'We’d make it work, with fewer treats.' } },
    roommate: { solo: 'I’d take someone in. It’s what you do.', group: 'We’d take someone in. Family helps family.' },
    cut_essentials: { kids: 'I’d be choosing between rent and the things the kids need.', nokids: 'I’d be choosing between rent and the things I need.' },
    stay_at_cost: { solo: 'Everything I love is here. I’d hold on as long as I can.', group: 'Everything we love is here. We’d hold on as long as we can.' },
    move: { solo: 'It would break my heart, but I’d have to move.', group: 'It would break my heart, but we’d have to move.' },
  },
  wry: {
    relief: 'Look at me, {gain} richer every month. Practically a landlord.',
    still_short: 'Progress. Still broke, but progress.',
    absorb: '{loss} a month. Goodbye, fancy coffee.',
    cut_back: 'Rent at {ratio} of my income. Ramen era it is.',
    roommate: 'Time to post a “room for rent” listing.',
    cut_essentials: 'Pretty sure groceries are optional, right?',
    stay_at_cost: 'Leaving isn’t an option. Making it work is.',
    move: 'Guess I’m finding out what the suburbs are like.',
  },
};

function pick(value, resident) {
  if (typeof value === 'string') return value;
  if ('kids' in value || 'nokids' in value) return pick(resident.traits.hasKids ? value.kids : value.nokids, resident);
  return pick(resident.household.size > 1 ? value.group : value.solo, resident);
}

/** The quoted line for a resident and stance (exported for tests). */
export function voiceLine(resident, stance, budgets) {
  const voice = VOICES[resident.voice] ?? VOICES.direct;
  const { after, delta } = budgets;
  return pick(voice[stance], resident)
    .replaceAll('{gain}', money(Math.abs(delta.remaining ?? 0)))
    .replaceAll('{loss}', money(Math.abs(delta.remaining ?? 0)))
    .replaceAll('{left}', money(after.remainingAfterRent))
    .replaceAll('{ratio}', pct(after.rentToIncomeRatio, 0));
}

/** @param {ReactionInput} input  @returns {Reaction} */
export function scriptedReaction(input) {
  const { resident, budgets, year } = input;
  const [stance, why] = classify(input);
  let text;
  if (stance === 'baseline') {
    text = `In ${year}, rent takes ${pct(budgets.after.rentToIncomeRatio, 0)} of what ${resident.household.size > 1 ? 'we bring' : 'I bring'} in. Try a scenario to see what changes.`;
  } else if (stance === 'unknown') {
    text = 'Without these numbers, this household’s budget can’t be shown.';
  } else if (stance === 'unchanged') {
    text = `Nothing changes for ${resident.household.size > 1 ? 'us' : 'me'}.`;
  } else {
    text = voiceLine(resident, stance, budgets);
  }
  return Object.freeze({
    stance,
    headline: STANCES[stance],
    text,
    facts: budgetFacts(input),
    why,
    scenario: scenarioLabel(budgets.scenario),
    method: SCRIPTED_METHOD,
  });
}

export function createScriptedProvider() {
  return Object.freeze({ id: 'scripted', react: async (input) => scriptedReaction(input) });
}

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Adapter for a server-side live-AI reaction endpoint (not part of this branch).
 * Request: POST url {resident, scenario, before, after, stance}. Expected response:
 * {text, model}. Only `text` is used, as the resident's quoted words; stance, why and
 * facts stay deterministic. The response is treated as untrusted text.
 */
export function createRemoteProvider({ url, timeoutMs = 8000, fetchImpl = globalThis.fetch } = {}) {
  if (!url || typeof fetchImpl !== 'function') throw new TypeError('remote reaction provider needs url and fetch');
  return Object.freeze({
    id: 'remote',
    async react(input, { signal } = {}) {
      const scripted = scriptedReaction(input);
      if (!SCENARIO_STANCES.includes(scripted.stance)) return scripted;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
      const onAbort = () => controller.abort('superseded');
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        if (signal?.aborted) throw Object.assign(new Error('superseded'), { name: 'AbortError' });
        const { resident, budgets } = input;
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            resident: {
              id: resident.id, name: resident.name, ageBand: resident.ageBand, occupation: resident.occupation,
              household: resident.household, yearsInHome: resident.yearsInHome, traits: resident.traits,
            },
            scenario: budgets.scenario, before: budgets.before, after: budgets.after,
            stance: scripted.stance, why: scripted.why,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const text = clip(body?.text, 400);
        const model = clip(body?.model, 60);
        if (!text || !model) throw new Error('missing text or model');
        return Object.freeze({
          ...scripted,
          text,
          method: Object.freeze({
            kind: 'ai',
            model,
            label: `AI-generated (${model})`,
            disclosure: 'The quote was generated by a language model; the stance, why and numbers are calculated. Simulated, not testimony from a real resident.',
          }),
        });
      } catch (error) {
        const timedOut = controller.signal.reason === 'timeout';
        const reason = timedOut ? 'timed out' : 'unavailable';
        return Object.freeze({
          ...scripted,
          method: Object.freeze({ ...SCRIPTED_METHOD, fallbackReason: `Live AI ${reason}; showing the scripted reaction.` }),
        });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },
  });
}
