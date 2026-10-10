# Map branch handoff

`feature/map-zoom` implements the first San Francisco map milestone. The city overview uses Leaflet 1.9.4 with Esri World Imagery satellite tiles; clicking the city map opens DataScape's illustrative scene. It is not a geospatial reconstruction of that block. Other cities keep the existing schematic comparison and street scenes.

## Controls

- Overview: click/tap the map or press Enter to enter directly. Drag to pan; scroll / pinch / + / − only zoom the overview.
- Street: click pavement to walk (WASD / arrow keys remain available without on-screen overlays); E or the nearby button to inspect buildings.
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

Manual flow: SF overview → zoom in → walk → inspect → choose 2024 → return → re-enter at the same position → click a resident → compare cities. Check both desktop and mobile. Unit tests cover shared state preservation, click entry, reduced motion, missing-library fallback, and viewport bounds at street-world edges.

## Map provider and attribution

Leaflet 1.9.4 is vendored in `vendor/` with its BSD license. The overview requests only visible tiles from `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, using normal browser caching and referrers, with visible attribution to Esri, Vantor, Earthstar Geographics, and the GIS User Community. No bulk downloads, offline tile packs, or background prefetching are implemented. Provider metadata and terms: https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9. For a high-traffic public deployment, select a suitable hosted provider and update the tile-layer URL/attribution.

The satellite imagery is independent of the historical ACS year and is not a live feed. SF entry loads the selected location’s OSM layout with illustrative artwork; it does not show address-level rent. The Simtra pixel overview has been removed. Existing pixel street artwork retains the credits in the main README.

## Simplified exploration update

The large story banner, movement keypad, instruction card, city summary card, and map pin are no longer displayed. The timeline, city selector, comparison view, inspection, and sources remain. The selected city now owns the full 1536 × 1152 illustrative world (previously a 432 × 456 clip). The camera stays inside the rendered world so users do not see blank space at its outer boundary. Walking between blocks never changes the selected city. Building rent and inspection statistics use that city throughout.

There are now 55 selectable sprite IDs per city. Existing IDs 1–11 retain their original city's sprites; the added blocks extend that city's IDs to 55. These are still decorative character identifiers, not real resident profiles.

## Cinematic entry

Clicking the satellite map triggers a 1.8-second continuous zoom toward the selected coordinate. During the final 0.8 seconds, the satellite layer blends into the moving street camera. There are no clouds, flashes, or intermediate cuts. The clicked coordinate sets both the satellite camera target and the local OSM scene center. Geometry is loaded before the camera handoff. Repeated inputs are blocked during handoff; Escape cancels the remaining animation. Reduced-motion users enter immediately. Tests cover timed handoff, repeat-click suppression, and cancellation.

Scrolling or pinching to satellite zoom 17 automatically blends into the illustrative streets over 0.8 seconds. Zooming out past the street threshold reverses the blend and returns to satellite zoom 15 at the same map center; the two-level gap prevents accidental re-entry. Click entry remains available. City/year and the saved walking position survive both directions.

## Location-matched SF streets

SF entry now resolves the selected coordinate through the OpenStreetMap map API, then projects the nearby geometry into a 768 × 576 meter walkable scene at two world pixels per meter. Longitude is adjusted for latitude. Roads, paths, building footprints, green areas, inland water and tagged pitches keep their mapped positions. Soccer and basketball use the project's licensed LimeZu sprites fitted to the field orientation; American-football, tennis and baseball markings are drawn over the ground texture. Unspecified sports remain generic pitches rather than guessing a sport. Tree placement and building appearances are illustrative, not measured reproductions.

`places.js` owns the bounded fetch, normalization, local projection, polygon collision, field orientation and scene generation. It resolves node references and joins complete multipolygon rings. Incomplete relation rings are omitted. A small in-memory cache reuses up to eight covered areas. The API is requested only when entering a place, with a 30-second timeout; no backend or new API key is needed. First entry may pause on the satellite view with a loading message. Entry animation starts only after geometry is ready. Errors leave the satellite view available, and Escape cancels pending handoff. Canceled request results cannot replace a newer scene.

Coverage depends on OSM tagging. This is not satellite-image recognition, a survey-grade reconstruction, or a complete model of every landmark. Coastal ocean polygons and unmapped features are not reconstructed. Map data is independent of the historical housing year. Housing values remain citywide ACS medians; mapped buildings do not have individual asking rents. Residents are illustrative sprites placed on mapped routes and retain the existing selection IDs. Other cities and comparison mode retain their previous illustrative layouts.

Map data © OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright. API reference: https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_/api/0.6/map. Attribution is visible in both views. The new court assets and provenance are in `assets/places/`.

Reproducible local examples (reload after changing the hash):
- `/#map=17/37.768/-122.509`: Beach Chalet soccer pitches.
- `/#map=17/37.7641/-122.4429`: Roosevelt Way / residential streets.

Run `node --test tests/*.test.mjs`. Tests cover coordinate round trips, field classification, missing geometry, collision, fetch caching/failure, asynchronous preparation/cancellation, and the original zoom/selection contracts. Browser verification covers both example locations, field sprite orientation, mapped building inspection, and scroll return.

### Illustrative house placement

Building geometry now supplies neighborhood placement hints only. Complete LimeZu house, townhouse and apartment sprites use a consistent 0.7 scale instead of clipped footprint skins. Dense footprints are thinned and placements shifted locally to leave breathing room. Buildings are drawn in depth order with residents; collision and inspection follow the displayed house base. Real roads, parks and sports-field geometry remain mapped.

### Walking residents

Mapped SF scenes now have up to 110 residents, distributed by walkable route length. `residents.js` builds continuous routes along mapped roads/paths, splits at collision boundaries, and excludes private routes and roads tagged against pedestrian access. Residents walk at varied speeds/phases, follow bends, and reverse continuously at the ends. Ambient pause/reduced-motion keeps their positions still. The first 55 selection IDs are preserved; SF adds `sf-resident-56` through `sf-resident-110`, exposed by `mapIntegration.getResidents()`. Other city/comparison populations are unchanged. No routes means no spawned walkers, rather than placing them in obstacles.
