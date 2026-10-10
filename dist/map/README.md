# Map branch handoff

`feature/map-zoom` implements the first San Francisco map milestone. The city overview uses the existing Simtra SF tile image; entering the highlighted street opens DataScape's illustrative scene. It is not a geospatial reconstruction of that block. Other cities keep the existing schematic comparison and street scenes.

## Controls

- Overview: drag to pan, scroll / pinch / + / − to zoom, arrow keys to pan, Enter or the street button to enter.
- Street: WASD / arrow keys, touch arrows, or click pavement to walk; E or the nearby button to inspect buildings.
- Zoom out below street scale, press M/Escape, or use City overview to return. Position, year, and scenario persist within the session.
- Compare cities opens the original five-city comparison. The timeline and source dialog remain available.
- Click a resident to select and highlight their sprite. Pause ambient animation to hold residents still.

## Teammate integration

Mount teammate modules from the app shell after its module has initialized. A separate entry module may import:

```js
import { mapIntegration } from '../app.js';

const stopSelection = mapIntegration.selection.subscribe(selection => {
  // { cityId, year, scenario: { rentChangePct, incomeChangePct } }
  // Render data/profile changes. Percent values use 10 for +10%.
});
const stopResident = mapIntegration.onResidentSelect((residentId, detail) => {
  // Mount/open your resident panel using detail.selection.
});

mapIntegration.selection.set({ scenario: { rentChangePct: 10 } });
const sprites = mapIntegration.getResidents();
// [{ residentId: 'sf-resident-1', cityId: 'sf', spriteIndex: 1 }, ...]
```

Do not import a teammate entry module back into `app.js` if that module imports `app.js`; mount it as a separate module script to avoid a circular initialization dependency. Call `selection.get()` for the initial snapshot: subscriptions fire only on changes. Returned snapshots are copies. Subscriptions return cleanup functions.

A DOM event is also emitted on `window`: `datascape:resident-select`, with `{ residentId, selection }` in `event.detail`. These IDs identify decorative sprites, not Census people. Profiles, budgets, and reactions belong to the resident/data branches; the map does not invent them. New data must preserve the currently supported IDs (`sf`, plus the IDs in `assets/data.json`) or explicitly migrate them.

Selection state is in memory; reloading resets it. Scenario inputs are validated for finite percentages no lower than -100. No scenario calculation is implemented on this branch.

## Checks

Run from the repository root:

```sh
node --test tests/map.test.mjs
node --check dist/app.js
python3 -m http.server 8123 --bind 127.0.0.1 --directory dist
```

Manual flow: SF overview → zoom in → walk → inspect → choose 2024 → return → re-enter at the same position → click a resident → compare cities. Check both desktop and mobile. Unit tests cover shared state preservation, zoom thresholds, reduced motion, and map-image failure fallback.

## Map provenance

`assets/sf_tiles.png` is copied unchanged from `Mahin2076/simtra`, commit `7a4ed2637fc65a9bb917d3764e2636cf85072338`, `frontend/assets/sf_tiles.png` (2144 × 1920). Source: https://github.com/Mahin2076/simtra/blob/7a4ed2637fc65a9bb917d3764e2636cf85072338/frontend/assets/sf_tiles.png.

The Simtra pipeline uses OpenStreetMap geography, USGS elevation, and LimeZu artwork. Original third-party terms continue to apply; this copy does not grant a new asset license. DataScape's existing artwork credits remain in README and its sources dialog. The image is used locally without calls to Simtra's hosted API. No imagery or data is fetched from that server.
