// Resident profile panel: profile, scenario controls, budget card, reaction + explanation.
// Built with DOM APIs and textContent only, so fixture or model text is never parsed as HTML.

import { SCENARIO_LIMITS, SCENARIO_PRESETS, sameScenario } from './contracts.js';
import { CITY_NAMES } from './fixtures.js';
import { money, pct, scenarioLabel } from './format.js';
import { UNAVAILABLE } from './reactions.js';

const BURDEN_LINE = 0.3;
let uid = 0;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) el.append(c);
  return el;
}

const chip = (kind, text, title) => h('span', { class: `rs-chip rs-chip--${kind}`, text, title });

function profileHeader(resident, ids, onClose) {
  return h('header', { class: 'rs-head' },
    h('div', { class: 'rs-kicker' },
      chip('illustrative', 'Illustrative resident', 'A fictional household written for this demo, not a real person.'),
      h('span', { text: CITY_NAMES[resident.cityId] ?? resident.cityId })),
    h('h2', { id: ids.title, class: 'rs-name', tabindex: '-1', text: resident.name }),
    h('p', { class: 'rs-sub', text: `${resident.occupation} · ${resident.ageBand}` }),
    h('p', { class: 'rs-sub', text: `${resident.household.description} · ${resident.building} · ${resident.yearsInHome} ${resident.yearsInHome === 1 ? 'year' : 'years'} here` }),
    h('button', { class: 'rs-close', type: 'button', 'aria-label': 'Close resident profile', text: '×', onclick: onClose }));
}

function scenarioControls(ids, onScenario) {
  const presets = h('div', { class: 'rs-presets', role: 'group', 'aria-label': 'Scenario presets' },
    SCENARIO_PRESETS.map((p) => h('button', {
      class: 'rs-preset', type: 'button', 'data-preset': p.id, 'aria-pressed': 'false', text: p.label,
      onclick: () => onScenario({ rentChangePct: p.rentChangePct, incomeChangePct: p.incomeChangePct }),
    })));
  const slider = (key, label) => {
    const id = `${ids.base}-${key}`;
    // The visible value sits outside the label and is hidden from assistive tech;
    // aria-valuetext on the input already announces it once.
    const out = h('span', { class: 'rs-out', 'aria-hidden': 'true' });
    const input = h('input', {
      id, type: 'range', min: SCENARIO_LIMITS.min, max: SCENARIO_LIMITS.max, step: 1, value: 0, 'data-key': key,
      oninput: (e) => onScenario({ [key]: Number(e.target.value) }),
    });
    return h('div', { class: 'rs-slider' },
      h('div', { class: 'rs-slider-head' }, h('label', { for: id, text: label }), out), input);
  };
  return h('section', { class: 'rs-section', 'aria-labelledby': ids.scenario },
    h('h3', { id: ids.scenario, text: 'Try a scenario' }),
    presets,
    slider('rentChangePct', 'Rent change'),
    slider('incomeChangePct', 'Income change'));
}

function syncControls(panel, scenario) {
  for (const btn of panel.querySelectorAll('.rs-preset')) {
    const p = SCENARIO_PRESETS.find((x) => x.id === btn.dataset.preset);
    btn.setAttribute('aria-pressed', String(sameScenario(p, scenario)));
  }
  for (const input of panel.querySelectorAll('.rs-slider input')) {
    const v = scenario[input.dataset.key];
    if (Number(input.value) !== v) input.value = String(v);
    const out = input.parentElement.querySelector('.rs-out');
    out.textContent = `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`;
    input.setAttribute('aria-valuetext', `${v > 0 ? 'plus' : v < 0 ? 'minus' : ''} ${Math.abs(v)} percent`.trim());
  }
}

function budgetRow(label, before, after, showBefore, className = '') {
  return h('div', { class: `rs-row ${className}` },
    h('dt', { text: label }),
    h('dd', {}, showBefore ? h('span', { class: 'rs-before', text: before }) : null,
      showBefore ? h('span', { class: 'rs-arrow', 'aria-hidden': 'true', text: '→' }) : null,
      h('strong', { text: after })));
}

function provenanceLine(what, prov, value, cityName) {
  if (prov.kind === 'fixed') {
    return h('li', {}, chip('illustrative', 'Illustrative'), ` ${what}: ${value}, a fixed amount chosen for this household.`);
  }
  const median = what === 'Rent' ? money(prov.median) + '/month' : money(prov.median) + '/year';
  const base = prov.median === null
    ? `${what}: unavailable, because the ${cityName} median is missing for this year.`
    : ` ${what}: ${prov.multiplier} × ${cityName} median ${what === 'Rent' ? 'gross rent' : 'household income'} (${median}${prov.period ? `, ACS ${prov.period}` : ''}${prov.geography ? `, ${prov.geography}` : ''}).`;
  return h('li', {}, chip('census', 'Census median'), base,
    prov.sources.length ? h('span', { class: 'rs-links' }, prov.sources.map((s, i) =>
      h('a', { href: s.url, target: '_blank', rel: 'noreferrer', text: `${s.label} ↗`, 'data-focus-key': `${what}-link-${i}` }))) : null);
}

function budgetCard(view, ids) {
  const { resident, household, budgets, selection } = view;
  const { before, after, scenario } = budgets;
  const cityName = CITY_NAMES[resident.cityId] ?? resident.cityId;
  const changed = !sameScenario(scenario, { rentChangePct: 0, incomeChangePct: 0 });
  const baseline = `${selection.year} baseline`;
  const section = h('section', { class: 'rs-section rs-budget', 'aria-labelledby': ids.budget },
    h('h3', { id: ids.budget, tabindex: '-1' }, 'Monthly budget ',
      chip('illustrative', 'Illustrative household', 'Hypothetical household numbers, not a real person’s budget.')));
  const status = after.status !== 'ok' ? after.status : before.status;
  if (status !== 'ok') {
    section.append(h('p', { class: 'rs-empty', role: 'status', text: `${cityName}, ${selection.year}: ${UNAVAILABLE[status] ?? UNAVAILABLE.invalid}` }));
  } else {
    const d = budgets.delta.remaining;
    section.append(
      h('p', { class: 'rs-scenario-label', text: changed ? `${baseline} → ${scenarioLabel(scenario)}` : baseline }),
      h('dl', { class: 'rs-grid' },
        budgetRow('Income', money(before.monthlyIncome), money(after.monthlyIncome), changed),
        budgetRow('Rent', money(before.adjustedRent), money(after.adjustedRent), changed),
        budgetRow('Left after rent', money(before.remainingAfterRent), money(after.remainingAfterRent), changed,
          after.remainingAfterRent < resident.essentialsMonthly ? 'rs-row--short' : ''),
        budgetRow('Rent share of income', pct(before.rentToIncomeRatio), pct(after.rentToIncomeRatio), changed,
          after.rentToIncomeRatio >= BURDEN_LINE ? 'rs-row--burden' : '')),
      burdenBar(after.rentToIncomeRatio),
      changed ? h('p', { class: 'rs-delta', text: d === 0
        ? 'No change to what’s left after rent.'
        : `${money(Math.abs(d))} ${d < 0 ? 'less' : 'more'} left after rent each month than the ${baseline}.` }) : '',
      h('p', { class: 'rs-note', text: '“Left after rent” is income minus rent, not disposable income: taxes, food, transport and other costs still come out of it.' }));
  }
  section.append(h('details', { class: 'rs-provenance' },
    h('summary', { text: 'How these numbers were built', 'data-focus-key': 'prov-summary' }),
    h('ul', {},
      provenanceLine('Rent', household.provenance.rent, money(household.monthlyRent) + '/month', cityName),
      provenanceLine('Income', household.provenance.income, money(household.annualIncome) + '/year', cityName),
      h('li', {}, chip('illustrative', 'Illustrative'), ` Essentials besides rent: ${money(resident.essentialsMonthly)}/month, used only by the reaction rules.`)),
    h('p', { class: 'rs-note', text: 'A city median is not this household’s rent or income. The multiplier is a stated assumption that keeps the household comparable across years.' })));
  return section;
}

function burdenBar(ratio) {
  const share = Math.max(0, Math.min(1, ratio ?? 0));
  return h('div', {
    class: 'rs-bar', role: 'img',
    'aria-label': `Rent takes ${pct(ratio)} of income; the marker shows the 30% cost-burden line.`,
  },
  h('span', { class: `rs-bar-rent${share >= BURDEN_LINE ? ' rs-bar-rent--burden' : ''}`, style: `width:${(share * 100).toFixed(1)}%` }),
  h('span', { class: 'rs-bar-line', style: `left:${BURDEN_LINE * 100}%`, title: '30% of income' }));
}

function reactionSection(ids) {
  return h('section', { class: 'rs-section rs-reaction', 'aria-labelledby': ids.reaction, 'aria-live': 'polite', 'aria-busy': 'true' },
    h('h3', { id: ids.reaction, text: 'Reaction' }),
    h('p', { class: 'rs-pending', text: 'Working out the reaction…' }));
}

export function renderReaction(section, reaction) {
  const title = section.querySelector('h3');
  title.replaceChildren('Reaction ', reaction.method.kind === 'ai'
    ? chip('ai', reaction.method.label, reaction.method.disclosure)
    : chip('scripted', 'Scripted · not live AI', reaction.method.disclosure));
  section.replaceChildren(title,
    h('p', { class: `rs-stance rs-stance--${reaction.stance}`, text: reaction.headline }),
    h('blockquote', { class: 'rs-quote' }, h('p', { text: `“${reaction.text}”` })),
    h('h4', { text: 'Why' }),
    h('p', { class: 'rs-why', text: reaction.why }),
    h('ul', { class: 'rs-facts' }, reaction.facts.map((f) => h('li', { text: f }))),
    h('p', { class: 'rs-disclosure', text: [reaction.method.fallbackReason, reaction.method.disclosure].filter(Boolean).join(' ') }));
  section.setAttribute('aria-busy', 'false');
}

/**
 * Create the panel shell for one resident. Returns update hooks; the controller owns state.
 */
export function createPanel({ resident, onScenario, onClose }) {
  uid += 1;
  const base = `rs-${uid}`;
  const ids = { base, title: `${base}-title`, scenario: `${base}-scn`, budget: `${base}-budget`, reaction: `${base}-reaction` };
  const panel = h('aside', {
    class: 'rs-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': ids.title, 'data-resident-id': resident.id,
    onkeydown: (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } },
  });
  const controls = scenarioControls(ids, onScenario);
  let budget = h('section');
  let reaction = reactionSection(ids);
  panel.append(profileHeader(resident, ids, onClose), controls, budget, reaction);
  return {
    element: panel,
    focus: () => panel.querySelector('.rs-name').focus(),
    update(view) {
      syncControls(panel, view.budgets.scenario);
      // Keep the provenance disclosure's open state and keyboard focus across re-renders.
      const active = panel.ownerDocument.activeElement;
      const hadFocus = budget.contains(active);
      const focusKey = hadFocus ? active.dataset?.focusKey : null;
      const wasOpen = budget.querySelector('details')?.open ?? false;
      const nextBudget = budgetCard(view, ids);
      budget.replaceWith(nextBudget);
      budget = nextBudget;
      if (wasOpen) budget.querySelector('details').open = true;
      if (hadFocus) (budget.querySelector(`[data-focus-key="${focusKey}"]`) ?? budget.querySelector('h3')).focus();
      const nextReaction = reactionSection(ids);
      reaction.replaceWith(nextReaction);
      reaction = nextReaction;
      return reaction;
    },
  };
}
