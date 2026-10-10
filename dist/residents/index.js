// Public API of the resident-stories module (Teammate 1: plan tasks H2, H5).
//
//   const stories = createResidentStories({
//     root, data: { getHousing, calculateBudget }, initialSelection, onSelectionChange,
//   });
//   map.onResidentSelect = (residentId) => stories.onResidentSelect(residentId);
//   shell: stories.setSelection(selection) whenever city/year/scenario changes.
//
// The module never edits app.js, index.html or shared styles; it mounts its own panel
// into `root` and injects its own stylesheet.

import { assertDataAdapter, normalizeHousing, normalizeScenario, normalizeSelection, sameScenario } from './contracts.js';
import { computeBudgets, resolveHousehold } from './budget.js';
import { RESIDENTS } from './fixtures.js';
import { createPanel, renderReaction } from './panel.js';
import { createScriptedProvider } from './reactions.js';

export { RESIDENTS, CITY_NAMES, getResident, listResidents } from './fixtures.js';
export { createRemoteProvider, createScriptedProvider, scriptedReaction } from './reactions.js';
export { SCENARIO_PRESETS, normalizeScenario, normalizeSelection } from './contracts.js';

const STYLE_ID = 'rs-styles';

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const link = doc.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./residents.css', import.meta.url).href;
  doc.head.append(link);
}

/**
 * @param {{
 *   root?: HTMLElement,
 *   data: { getHousing: (cityId: string, year: number) => object|null|Promise<object|null>,
 *           calculateBudget: (input: object) => object },
 *   reactions?: { react: (input: object) => Promise<object> },
 *   residents?: ReadonlyArray<import('./fixtures.js').Resident>,
 *   initialSelection?: import('./contracts.js').Selection,
 *   onSelectionChange?: (selection: import('./contracts.js').Selection) => void,
 *   onClose?: (residentId: string) => void,
 * }} options
 */
export function createResidentStories({
  root = document.body,
  data,
  reactions = createScriptedProvider(),
  residents = RESIDENTS,
  initialSelection = { cityId: 'sf', year: 2024, scenario: {} },
  onSelectionChange = () => {},
  onClose = () => {},
} = {}) {
  assertDataAdapter(data);
  ensureStyles(root.ownerDocument);
  let selection = normalizeSelection(initialSelection);
  let open = null; // { resident, panel, returnFocus }
  let renderToken = 0;
  let inflight = null; // AbortController for the current render's reaction request

  function cancelInflight() {
    inflight?.abort();
    inflight = null;
  }

  async function render() {
    if (!open) return;
    const token = ++renderToken;
    cancelInflight();
    const { resident, panel } = open;
    let housing = null;
    let housingLoaded = true;
    try {
      housing = normalizeHousing(await data.getHousing(resident.cityId, selection.year));
    } catch {
      housingLoaded = false;
    }
    if (token !== renderToken || !open) return;
    const household = resolveHousehold(resident, housing);
    const budgets = computeBudgets(household, selection.scenario, data.calculateBudget, { housingLoaded });
    const reactionEl = panel.update({ resident, household, budgets, selection });
    const controller = new AbortController();
    inflight = controller;
    const reaction = await reactions.react({ resident, budgets, year: selection.year }, { signal: controller.signal });
    if (token !== renderToken || !open) return;
    inflight = null;
    renderReaction(reactionEl, reaction);
    root.dispatchEvent(new CustomEvent('residentstory:render', {
      detail: { residentId: resident.id, selection, budgets, reaction },
    }));
  }

  function setScenario(patch) {
    const scenario = normalizeScenario({ ...selection.scenario, ...patch });
    if (sameScenario(scenario, selection.scenario)) return;
    selection = normalizeSelection({ ...selection, scenario });
    onSelectionChange(selection);
    render();
  }

  function close() {
    if (!open) return;
    const { resident, panel, returnFocus } = open;
    const hadFocus = panel.element.contains(root.ownerDocument.activeElement);
    open = null;
    renderToken += 1;
    cancelInflight();
    panel.element.remove();
    // Only pull focus back if the user was in the panel; a shell-driven close must not
    // steal focus from whatever control they are using.
    if (hadFocus && returnFocus && returnFocus.isConnected) returnFocus.focus();
    onClose(resident.id);
  }

  return Object.freeze({
    /** Map contract: open the profile for a resident id. Returns false if unknown. */
    onResidentSelect(residentId) {
      const resident = residents.find((r) => r.id === residentId);
      if (!resident) return false;
      const returnFocus = root.ownerDocument.activeElement;
      if (open) {
        open.panel.element.remove();
        renderToken += 1;
        cancelInflight();
      }
      const panel = createPanel({ resident, onScenario: setScenario, onClose: close });
      open = { resident, panel, returnFocus };
      root.append(panel.element);
      panel.focus();
      render();
      return true;
    },
    /** Shell contract: city/year/scenario changed elsewhere. */
    setSelection(next) {
      const normalized = normalizeSelection(next);
      const changed = normalized.cityId !== selection.cityId || normalized.year !== selection.year
        || !sameScenario(normalized.scenario, selection.scenario);
      selection = normalized;
      if (open && open.resident.cityId !== selection.cityId) close();
      else if (changed) render();
    },
    getSelection: () => selection,
    openResidentId: () => open?.resident.id ?? null,
    close,
    destroy() {
      close();
    },
  });
}
