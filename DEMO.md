# Rincon Hill property explorer

Run `npm ci` and `npm start`, then open http://127.0.0.1:8124.

1. Select the highlighted **Rincon Hill** district or **Start near 318 Spear Street**.
2. Walk with arrow keys/WASD or tap pavement. A hologram automatically reveals the closest visible property: simulated asking price, bed/bath count, floor area, example rent and HOA. Move to another building to compare.
3. In the bottom bubble ask **Which nearby home costs less?** or **What is The Infinity at 318 Spear Street?**
4. Resident speech bubbles answer. **Read all replies** contains the complete conversation and the separately labeled Cala research with source links.
5. Use **Explore → City map** to return to the highlighted neighborhood.

## Data boundaries

- OpenStreetMap geometry is saved in `dist/assets/rincon-map.json` for reliable street entry. Artwork, unit assignments, prices, rent, HOA, sizes and amenities in property cards are illustrative demo data. They are not verified listings or valuations, and Census is not their source.
- The Rincon Hill highlight is a demo selection area, not an official administrative boundary. It centers approximately on the Spear Street/Infinity area.
- Census figures remain citywide ACS context, with original source links and estimate years.
- Cala retrieves separate, sourced neighborhood research from its documented knowledge-search API. A timeout, missing key or missing citations produces an explicit unavailable state. Research does not certify demo listing prices.
- The neighborhood is rendered with stylized house artwork; it is not a dimensionally accurate model of the Infinity towers.

## Verification

`npm test` runs unit and HTTP tests, including safe Cala citations and failure handling. `npm run test:browser` checks district entry, different property prices, walking-triggered holograms and property-aware chat at desktop/mobile widths. `npm run test:chat` checks chat responses, transcript, errors and cancellation using controlled API replies. `npm run test:chat:live` additionally uses OpenAI and Cala credits on desktop.

Keep the local server running. Satellite imagery and live research require internet; saved street geometry and property cards work without a new geometry download. Credentials belong in ignored `.env.local`, never in frontend files. The currently provisioned OpenAI key was created with a 24-hour lifetime.
