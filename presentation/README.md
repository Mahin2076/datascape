# Can You Afford to Stay? — presentation

A 10-slide React deck built with the DataScape UI: the same paper and ink palette, monospace chrome, coral and teal rent/income colors, and the real pixel city (`dist/assets` atlas, sprites and `data.json`). Motion follows the principles of Syro's UI: every animation is the data moving (a 100-household grid filling, bars growing to their margins of error, packets flowing between modules, the camera flying from the city to one resident), with mono eyebrows, tight display type and hairline grids.

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
| `R` | Replay the current slide's animations |
| `Home` / `End` | First / last slide |

The URL hash is the slide number (`#6` opens "Meet Tasha"). The stage is a fixed 1600×900 canvas scaled to the window. Motion respects `prefers-reduced-motion`.

## Slides

1. Cover: the product city with real median rents cycling 2021→2024
2. The squeeze: 39.1% of SF renter households spend 30%+ of income on rent
3. Five cities: cost burden with 90% margins of error
4. The honest trend: rent vs renter income 2021→2024, mostly too close to call
5. What we built: city → street → resident camera flight
6. Meet Tasha: the resident panel playing "Rent +10%"
7. Honest by design: Census / illustrative / scripted-or-AI labels
8. How it works: data flow and branch ownership
9. Next: planned work
10. Close

## Numbers

- `src/data/facts.json`: ACS **1-year** values (2021 and 2024) read from the U.S. Census Bureau table-based summary files. Every city lists its source file URLs. Tables:
  - B25070: renter households by gross rent as a percent of income
  - B25064: median gross rent
  - B25119: median renter household income
- Burden shares and margins of error use Census approximation formulas.
- Slide 1 and Tasha's budget use `dist/assets/data.json` (ACS 5-year), the same data the product shows.
- Tasha's rent is 1.1× and her income 0.7× the SF median, matching the resident-stories fixture. Her reaction text is the scripted rule output for "Rent +10%".

## Before presenting

- Slide 8 says "Teammate 1" and "Teammate 2" (the plan's labels). Replace them with names.
- Everything on slide 9 is planned work, not shipped.
