# Can You Afford to Stay? — presentation

A 10-slide React deck that takes place inside DataScape's city. The pixel world (the real atlas, sprites and `data.json` from `dist/assets`) stays on screen for the whole talk, and each slide is a camera shot. Moving to the next slide flies the camera there while the shared pieces change state:

- the text card stretches between the title layout and the side card while its words swap
- Tasha's budget card pops out by her door, updates when rent rises, then grows into the full resident panel
- signboards on each city's block change from rent burden to rent-vs-income growth
- the light moves from morning to evening, and the street lamps come on at the end

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

The URL hash is the slide number (`#4` opens the rent increase). The stage is a fixed 1600×900 canvas scaled to the window. Motion respects `prefers-reduced-motion`.

## Slides

1. Title over the whole city
2. The camera lands on Tasha's door
3. Tasha's rent, with the budget card beside her
4. Rent goes up 10%: the numbers tick and Tasha reacts
5. Ten renters on the street, four tagged as cost-burdened
6. Fly out to the map: rent burden on each city's block
7. The budget card becomes the app's resident panel
8. Same signboards, now rent vs renters' income since 2021
9. The team, standing on Tasha's block
10. Evening; title again

Copy, camera shots and actor states live in `src/story.jsx`. The world renderer is `src/viz/PixelWorld.jsx`, and the persistent actors are in `src/actors.jsx`.

## Numbers

- `src/data/facts.json`: ACS **1-year** values (2021 and 2024) read from the U.S. Census Bureau table-based summary files. Every city lists its source file URLs. Tables:
  - B25070: renter households by gross rent as a percent of income
  - B25064: median gross rent
  - B25119: median renter household income
- Burden shares and margins of error use Census approximation formulas.
- Building rent signs and Tasha's budget use `dist/assets/data.json` (ACS 5-year), the same data the product shows.
- Tasha's rent is 1.1× and income 0.7× the SF median, matching the resident-stories fixture. The reaction text is the scripted rule output for "Rent +10%".

## Before presenting

- Slide 9 uses "Teammate 1" and "Teammate 2" (the plan's labels). Edit `TEAM` at the top of `src/story.jsx`.
