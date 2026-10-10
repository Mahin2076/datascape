# Can You Afford to Stay? — hackathon demo

## Live neighborhood story

Run `npm ci` and `npm start`, then open http://127.0.0.1:8124. Type a housing question in the bottom chat bubble and click **Ask neighbors**. The app opens the current neighborhood and displays live speech bubbles. **Read all replies** shows every nearby household’s line. There is no guided story or repeated house-price overlay. The API key stays server-side in ignored `.env.local`; see [server/README.md](server/README.md) for the API flow and limits.

## Original three-minute walkthrough

1. Start `npm start`. Open `http://127.0.0.1:8124/#map=16/37.7641/-122.4429`, open **Explore**, and select **2024**.
2. Under **Explore**, zoom in once with **+** to enter the SF neighborhood. Let the geometry finish loading. Walk using the arrow keys or click pavement.
3. Click a walking resident, or use **Explore → Meet a resident → Inés** for a predictable presentation. Explain that the people are fictional household examples; the city medians are sourced Census observations.
4. Choose **Rent +10%**. Show the before/after rent and amount left after rent. Scroll the panel down to **Reaction / Why**. The response is explicitly **Scripted · not live AI** and its numeric explanation comes from the calculated budget.
5. Expand **How these numbers were built**. Show the stated household assumptions and Census links. Change the year to **2022**; the current scenario stays selected and Census-anchored amounts update. Fixed fictional amounts stay fixed.
6. Close the panel and choose **Explore → City map**. The city, year and scenario persist. **Explore → Compare cities** and **Explore → Compare housing data → Fastest rent growth** show the five-city comparison. Use **Sources** to show exact estimates and 90% margins of error.

## Post-merge rehearsal (2026-10-10)

Verified merged `main` at `b548aa3`: all 57 unit/HTTP tests passed; the housing walkthrough passed at 1440, 768 and 375 pixels; direct asking from the map and the four-chapter story passed with actual OpenAI replies on desktop (19 residents), plus controlled mobile replies (8 residents). The checks include provider failure handling and cancellation after changing the year. No application fixes were required; the legacy browser script and these instructions were updated for Explore.

For presenting: keep `npm start` running, open the demo once to warm the map, type a housing question in the bottom bubble, and open the replies. Live replies and first-time map loading require internet access. The locally configured API key was created with a 24-hour lifetime; replace it before presenting after it expires. The key is local to this machine and is not part of the repository.

## Self-test coverage

- 57 Node tests pass, including all 20 source records, budget units, missing/nonpositive income, invalid inputs, city ranking regressions, 320 production household/year/scenario combinations, map transitions, geometry caching and resident reactions.
- Chromium walkthrough passed at 1440, 768 and 375 pixels wide: live OSM neighborhood entry, real sprite clicks, walking, rent +10%, arithmetic checked from rendered numbers, year changes, source links, keyboard isolation, return to map, and all five city profile flows.
- No JavaScript page errors in those walkthroughs.
- After loading the street, external HTTPS requests were blocked. Local household scenarios, year changes, comparisons and source-dialog rendering continued to work. This does **not** certify a cold offline map startup or external source-page availability.
- Browser output and screenshots are saved locally under `test-results/` (not committed).

Reproduce with Node 22+ and Chromium:

```sh
npm ci
npm test
npx playwright install chromium
# In another terminal, run npm start with .env.local configured.
npm run test:browser
npm run test:chat
# Uses API credits:
npm run test:chat:live
```

The browser test uses live map data at the specified SF location, so uncached street entry requires network access. `DEMO_URL` can override the local server URL.

## Delivery and limits

Merged PR #5 includes PR #4 (`ui-layout`), resolves its documentation conflict, merges `feature/resident-stories` (which had no PR), and adds the missing housing data and app wiring. The target repository uses **main**, not master. Previously reverted P1 work and closed PR #3 are not reinstated.

The map's many sprites reuse four fictional household examples per city; they are not hundreds of surveyed people. Detailed geometry is available for SF; other cities use illustrative layouts. Buildings do not have address-level rental data. ACS five-year periods overlap, amounts are nominal, and city median ratios are not measured household burdens. The year selector is under Explore; automatic story playback is not part of this demo route.

Cala research is not configured. The original profile panel is scripted; the separate neighborhood chat has verified live OpenAI replies. A desktop story returned replies for all 26 nearby residents; mobile UI/error tests used controlled API replies. No API keys are included in browser code. First map entry and satellite tiles remain network-dependent; rehearse the demo location before presenting.
