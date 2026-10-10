# Can You Afford to Stay? — presentation

A 12-slide React deck for the prompt "find a creative way to showcase data about a topic you're curious about". The topic is rent; the creative part is walking through it. The deck uses the app's own map stack (the `ui-layout` branch) and never cuts away from it:

- **Satellite:** Leaflet with the same Esri World Imagery source and attribution as the app's city overview.
- **Streets:** pixel scenes built by the app's `dist/map/places.js` from OpenStreetMap data for two real places (Corona Heights and Golden Gate Park's Beach Chalet fields). Walkers follow mapped routes, as in the app. The map data is snapshotted in `src/data/places/` so the deck doesn't call the OpenStreetMap API live; re-create it with `node presentation/scripts/snapshot-places.mjs`.
- **Compare cities:** the app's five-block comparison world, with signboards for rent burden and rent-vs-income growth.

Slides are camera moves across these layers:
- the satellite dives into the street at matching scale, the way the app does
- the street fades out, the satellite flies across the city and dives again
- on the layers slide, imagery, OpenStreetMap linework and pixel art stack on the same spot
- the text card and Tasha's budget card persist and change shape between slides

```sh
cd presentation
npm install
npm run dev        # http://localhost:5174
npm run build      # static build in presentation/dist
```

| Key | Action |
|---|---|
| `→` `Space` `Enter` / `←` | Next / previous |
| `N` | Speaker notes |
| `F` | Full screen |
| `R` | Replay the current slide's text |
| `Home` / `End` | First / last slide |

The URL hash is the slide number (`#6` opens the rent increase). The stage is a fixed 1600×900 canvas scaled to the window. Motion respects `prefers-reduced-motion`.

## Slides

1. The question, over satellite San Francisco
2. Rent as a number, flying into Corona Heights
3. Dive into the OpenStreetMap-built street
4. Tasha
5. Tasha's rent, with the budget card
6. Rent goes up 10%: numbers tick and Tasha reacts
7. The ten nearest walkers, four tagged as cost-burdened
8. Fly across the city to Golden Gate Park's fields
9. Three kinds of data, one place
10. Compare cities: rent burden
11. Compare cities: rent vs renters' income since 2021
12. Close at dusk

Copy, camera shots and actor states live in `src/story.jsx`. Layers: `src/viz/SatelliteLayer.jsx`, `src/viz/StreetWorld.jsx`, `src/viz/PixelWorld.jsx`. Persistent actors: `src/actors.jsx`.

The satellite imagery loads live, so the deck needs a network connection for that layer. Street and comparison scenes work offline.

## Numbers

- `src/data/facts.json`: ACS **1-year** values (2021 and 2024) read from the U.S. Census Bureau table-based summary files. Every city lists its source file URLs. Tables:
  - B25070: renter households by gross rent as a percent of income
  - B25064: median gross rent
  - B25119: median renter household income
- Burden shares and margins of error use Census approximation formulas.
- The SF median rent and Tasha's budget use `dist/assets/data.json` (ACS 5-year), the same data the app shows.
- Tasha's rent is 1.1× and income 0.7× the SF median, matching the resident-stories fixture. The reaction text is the scripted rule output for "Rent +10%".
