# P1 in DataScape

The source plan is `SIMTRA_HOUSING_MERGE_PLAN.md`, section 13. P1 is a
delivery phase, not a named person's assignment. Its implementation paths
refer to `Mahin2076/simtra`. The requested branch for this work is `P1` in
DataScape, so the table below records the scope that can be delivered here.

| Plan task | DataScape result |
| --- | --- |
| Story mode | Timeline transitions extracted into a pure module; play, pause, scrub, replay and final comparison covered by tests. Fastest-rent ranking includes all cities, including those whose income kept pace. Removed external font loading so startup uses local assets only. |
| CI workflow | Locked npm test dependencies; unit tests and Chromium smoke checks at 375, 768, 1024 and 1440 pixels on pushes and PRs. Browser tests exercise the static demo with the network disabled after loading. |
| Credits/licensing | In-app attribution identifies compiled atlases and retains the original asset license scope; existing character license remains linked. This is attribution cleanup, not verification of the owner's purchased redistribution rights. |
| Track B PUMS join, flagged resident housing, rent-burden filters, housing counterfactual, persona determinism | Unimplemented: requires Simtra's person records, Rust backend, PUMS verifier and Track A prerequisite. DataScape residents are decorative and city median rent/income is not a household burden measure. |
| Chunk mirror and geographic projection fixes, zones raster, PUMA overlay | Unimplemented: requires Simtra's real geographic tile database, projection, TIGER polygons and PUMA records. DataScape streets are fictional, so they cannot host a geographic PUMA overlay. |
| Fly backend app and frontend backend configuration | Inapplicable here: DataScape has no backend or backend configuration. Serve `dist/` using a static host. No new hosting account or deployment is created by this PR. |

This branch completes the applicable static-site subset. It does **not**
complete the entire Simtra P1 phase. The original architecture plan remains
unchanged so these dependencies are visible to the other contributors.

## Verification

Use Node.js 22 or newer, Python 3 and Chromium:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Runtime remains build-free: `python -m http.server 8123 --directory dist`.
Test dependencies are development-only. Browser checks start their own
server on port 18123; stop other servers on that port first.
