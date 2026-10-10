# Can You Afford to Stay? — hackathon demo

## Live neighborhood story

Run `npm ci` and `npm start`, then open http://127.0.0.1:8124 and choose **Play neighborhood story**. Use **Next chapter** to reveal city-median house labels, a rent +10% shock with live speech bubbles, and income +5% with new replies. **Read all replies** shows every nearby household's line. The API key stays server-side in ignored `.env.local`; see [server/README.md](server/README.md) for the full flow and limits.

## Original three-minute walkthrough

1. Start `python3 -m http.server 8123 --directory dist`. Open `http://localhost:8123/#map=16/37.7641/-122.4429` and select **2024** in the compact year selector.
2. Zoom in once with **+** to enter the SF neighborhood. Let the geometry finish loading. Walk using the arrow keys or click pavement.
3. Click a walking resident, or use **Meet a resident → Inés** for a predictable presentation. Explain that the people are fictional household examples; the city medians are sourced Census observations.
4. Choose **Rent +10%**. Show the before/after rent and amount left after rent. Scroll the panel down to **Reaction / Why**. The response is explicitly **Scripted · not live AI** and its numeric explanation comes from the calculated budget.
5. Expand **How these numbers were built**. Show the stated household assumptions and Census links. Change the year to **2022**; the current scenario stays selected and Census-anchored amounts update. Fixed fictional amounts stay fixed.
6. Close the panel and choose **City map**. The city, year and scenario persist. **Compare cities** and **Ask the data → Fastest rent growth** show the five-city comparison. Use **Sources** to show exact estimates and 90% margins of error.

## Self-test evidence (2026-10-10)

- 57 Node tests pass, including all 20 source records, budget units, missing/nonpositive income, invalid inputs, city ranking regressions, 320 production household/year/scenario combinations, map transitions, geometry caching and resident reactions.
- Chromium walkthrough passed at 1440, 768 and 375 pixels wide: live OSM neighborhood entry, real sprite clicks, walking, rent +10%, arithmetic checked from rendered numbers, year changes, source links, keyboard isolation, return to map, and all five city profile flows.
- No JavaScript page errors in those walkthroughs.
- After loading the street, external HTTPS requests were blocked. Local household scenarios, year changes, comparisons and source-dialog rendering continued to work. This does **not** certify a cold offline map startup or external source-page availability.
- Browser output and screenshots are saved locally under `test-results/` (not committed).

Reproduce with Node 22+, Python 3 and Chromium:

```sh
npm ci
npm test
npx playwright install chromium
# In another terminal, start the static server above.
npm run test:browser
```

The browser test uses live map data at the specified SF location, so uncached street entry requires network access. `DEMO_URL` can override the local server URL.

## Delivery and limits

The integration branch includes open PR #4 (`ui-layout`), resolves its documentation conflict, merges `feature/resident-stories` (which had no PR), and adds the missing housing data and app wiring. The target repository uses **main**, not master. Previously reverted P1 work and closed PR #3 are not reinstated.

The map's many sprites reuse four fictional household examples per city; they are not hundreds of surveyed people. Detailed geometry is available for SF; other cities use illustrative layouts. Buildings do not have address-level rental data. ACS five-year periods overlap, amounts are nominal, and city median ratios are not measured household burdens. The visible year selector replaces the hidden timeline tray; automatic story playback is not part of this demo route.

Cala research is not configured. The original profile panel is scripted; the separate neighborhood chat has verified live OpenAI replies. A desktop story returned replies for all 26 nearby residents; mobile UI/error tests used controlled API replies. No API keys are included in browser code. First map entry and satellite tiles remain network-dependent; rehearse the demo location before presenting.
