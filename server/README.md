# Neighborhood chat

Run `npm ci` and `npm start`, then open http://127.0.0.1:8124. The key stays in the ignored `.env.local` file and is read only by Node. The static server exposes only `dist/`, never the repository root. The default server binds to loopback for a local hackathon demo; public hosting/authentication is outside this change.

## Demo

Type a housing question in the compact chat bubble at the bottom and click **Ask neighbors**. Asking from the map opens the current neighborhood automatically. Replies appear above nearby residents and take turns in spatially separated waves. **Read all replies** opens the complete transcript. Citizens continue walking while questions load and replies follow their positions.

Secondary map, year, resident and data controls are under **Explore**. The guided story and repeated house-price overlays have been removed. Insufficient-data questions should receive a limitation rather than invented facts.

## API contract and limits

`POST /api/neighborhood-chat` accepts `{cityId, year, scenario, residentIds, question, history?}`. Percentages use 10 for +10%. Only known city/year/resident IDs and whole percentages from −50 to +100 are accepted. The server resolves fictional profiles and recomputes all budgets from committed Census records. Client-supplied observations, budgets or personas are ignored. Recent question history is bounded to two questions.

One OpenAI Responses request produces validated structured dialogue for the whole group using the AI SDK. Every requested resident must occur exactly once. Numeric budget cards are appended by server code, not taken from the model. Model prose is still generated and may be imperfect; it is visibly labeled fictional AI dialogue. No model tool access, browsing or external data retrieval is enabled. Responses use `store: false`. The OpenAI request necessarily includes the user's question and the supplied fictional housing context.

The server caches identical successful requests in memory for 15 minutes (80 entries), limits concurrency to two and requests to ten per minute, caps input size at 20 KB, and uses a 45-second provider timeout. Changed scenarios cannot reuse a different scenario's reply. Missing keys, provider errors, and rate limits are explicit; no scripted answer is silently passed off as live AI. Browser cancellation invalidates stale replies when the city, year, scenario or neighborhood changes.

Provider setup uses the [OpenAI structured-output contract](https://developers.openai.com/api/docs/guides/structured-outputs) and the version-matched AI SDK docs. `OPENAI_MODEL` defaults to the API-verified `gpt-4.1-mini` model. There are no secrets in committed examples or frontend assets.

## Checks

- `npm test`: data, budgets, map, residents, speaker-wave layout, validated AI context and local HTTP boundaries.
- `npm run test:chat`: browser UX checks with explicitly mocked API replies, requiring the local server and network for the map.
- `npm run test:chat:live`: actual OpenAI replies for the desktop neighborhood chat, controlled replies on mobile, and explicit upstream-failure coverage. This uses API credits.
- `DEMO_URL=http://127.0.0.1:8124 npm run test:browser`: regression test for the earlier housing/profile flow.

Screenshots go to ignored `test-results/`. Unit tests do not use API credits. The original resident profile panel continues to use its separately labeled scripted reaction rules.

## Rincon Hill / Cala

`CALA_API_KEY` enables server-side `POST https://api.cala.ai/v1/knowledge/search` using `X-API-KEY`, per https://docs.cala.ai/ and its OpenAPI specification. Queries are scoped to Rincon Hill and 318 Spear Street. Research has a 25-second timeout and a bounded 15-minute cache; returned HTTPS citations are shown in the transcript. Missing or failed research does not prevent demo-property answers.

The client sends known nearby property IDs, never authoritative prices. The server accepts IDs from the saved map and reconstructs the same deterministic, explicitly simulated property records used by the holograms. Cala research is treated as untrusted evidence, separate from both demo prices and citywide Census observations.
