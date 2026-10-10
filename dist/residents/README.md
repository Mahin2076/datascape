# Resident stories (Teammate 1 · `feature/resident-stories`)

Resident profiles, scenario controls, the household budget card, and resident reactions with explanations, per `SIMTRA_HOUSING_MERGE_PLAN.md` → *Current hackathon scope*. Covers tasks **H2** and **H5**, this branch's part of **H0** (the shared resident fixture and contract assumptions), the hooks Mahin needs for **H4**, and fixtures for all five cities for **H7**.

Everything lives in `dist/residents/`. Nothing in `dist/app.js`, `dist/index.html` or `dist/style.css` is touched. The module injects its own stylesheet.

## Try it

```sh
python3 -m http.server 8123 --directory dist
open http://localhost:8123/residents/demo.html          # or ?city=nyc&year=2021&open=nyc-rosa
node --test tests/residents/                            # unit tests, no dependencies
```

`demo.html` is a harness. Its buttons stand in for map clicks, and its data comes from `dev/contract-stub.js`, a stand-in for Teammate 2's `dist/data/` module built over `assets/data.json`. The integrated app must use the real data module.

## Wiring (H4, for Mahin)

```js
import { createResidentStories, listResidents } from './residents/index.js';
import { getHousing, calculateBudget } from './data/index.js'; // Teammate 2

const stories = createResidentStories({
  root: document.querySelector('#game'),           // panel mounts here (position: relative parent)
  data: { getHousing, calculateBudget },
  initialSelection: selection,                      // { cityId, year, scenario }
  onSelectionChange: (next) => { selection = next; /* update map + other panels */ },
});

// Map: place residents and route clicks.
listResidents(selection.cityId);   // [{ id, name, building, sprite }] — building matches app.js titles
onResidentSelect = (residentId) => stories.onResidentSelect(residentId);

// Shell: whenever city, year or scenario changes elsewhere.
stories.setSelection(selection);
```

| API | Behavior |
|---|---|
| `onResidentSelect(id)` | Opens that resident's panel and focuses its name. Returns `false` for unknown ids. Replaces any open panel. |
| `setSelection(selection)` | Re-renders for a new year or scenario. Switching to another city closes a resident who lives elsewhere. |
| `getSelection()` / `openResidentId()` | Current state. |
| `close()` | Closes the panel and returns focus to whatever opened it. Escape inside the panel does the same. |
| `residentstory:render` event on `root` | `detail: { residentId, selection, budgets, reaction }` after each render, for analytics or tests. |

Scenario controls emit `onSelectionChange` with the full shared selection. Percentages use `10` for +10%; values are clamped to −50…+100 and rounded to whole percents.

## Contract assumptions to confirm in H0 (Teammate 2)

The plan names these functions but not every field, so this branch assumes the following:

- `getHousing(cityId, year)` (may be async) returns `{ monthlyRent, annualIncome, geography, period, sources: [{ label, url }] }`, or `null` when unavailable. Only `https` source URLs are shown.
- `calculateBudget({ monthlyRent, annualIncome, rentChangePct, incomeChangePct })` returns `{ status, monthlyIncome, adjustedRent, remainingAfterRent, rentToIncomeRatio }`. `status` is `'ok'` or `'income_unavailable'`, and `rentToIncomeRatio` is a fraction (0.3 = 30%).
- City ids are those in `assets/data.json`: `sf`, `nyc`, `austin`, `chicago`, `seattle`.

`contracts.js` normalizes all of it: a nonpositive or missing income never shows a ratio, and a thrown error shows "unavailable", never a made-up number. If Teammate 2 settles on different field names, only `contracts.js` changes.

## How numbers are labeled

| What | Label on screen | Where it comes from |
|---|---|---|
| City median rent / income | **Census median** chip, ACS period, geography, source links | `getHousing` |
| Household rent / income | **Illustrative household** chip; "How these numbers were built" spells out `multiplier × city median` or a fixed illustrative amount | `fixtures.js` |
| Budget results | Shown as Today → scenario | `calculateBudget` |
| "Left after rent" | Note: income minus rent, not disposable income | — |
| Reaction text | **Scripted · not live AI** (or **AI-generated (model)**) plus a disclosure line | `reactions.js` |

Each household's denominator is an explicitly chosen illustrative income, as the plan requires. A city median is never presented as a particular household's burden.

## Reactions (H5)

- **Scripted (default):** deterministic rules over the calculated budget (`classify` in `reactions.js`). The rules compare the amount left after rent with the household's illustrative essentials, the 30% cost-burden line, and traits such as being able to add a roommate or long tenure. There are 8 outcomes, from "Breathing room" to "Likely to move". The quote text depends on the resident's voice and is labeled scripted.
- **Live AI (optional):** `createRemoteProvider({ url })` posts `{ resident, scenario, before, after }` to a server endpoint that isn't part of this branch and expects `{ stance, text, why, model }`. Keys stay server-side. On error, timeout (8 s) or a malformed reply it falls back to the scripted reaction and says so.
- **Explanation always matches the scenario:** the numeric "facts" lines come from `calculateBudget` for the current selection under both providers; a model can't override them. Unit tests check this for every resident × year × preset (400 cases).

## Files

| File | Purpose |
|---|---|
| `index.js` | Public API: `createResidentStories`, plus re-exports |
| `contracts.js` | Selection/scenario/housing/budget normalization, presets |
| `fixtures.js` | 20 fictional residents (4 per city), `listResidents`, `getResident`, `CITY_NAMES` |
| `budget.js` | Household resolution with provenance; before/after budgets via `calculateBudget` |
| `reactions.js` | Scripted rules, remote AI adapter, disclosures |
| `panel.js` | Profile, scenario controls, budget card, reaction panel (DOM + `textContent` only) |
| `format.js` | Money/percent/scenario labels |
| `residents.css` | Component styles (`.rs-*`), mobile bottom sheet, reduced motion |
| `demo.html`, `dev/contract-stub.js` | Harness and stand-in data contract for development |
| `../../tests/residents/` | `node --test` unit tests |

## Honest limits

- Residents, households, essentials and reactions are fictional, written for the demo. Rent/income multipliers are stated assumptions, not estimates of any real household.
- City medians are place-level ACS 5-year values from `data.json`, with overlapping periods and nominal dollars. They are not neighborhood figures.
- The live-AI path is an adapter only. No reaction backend exists on this branch.
- Browser checks were run against the demo harness, not the integrated map, which doesn't exist yet (H1/H4).
