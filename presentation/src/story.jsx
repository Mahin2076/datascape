import facts from './data/facts.json';
import data from '../../dist/assets/data.json';
import { TASHA_NUMBERS as N } from './actors.jsx';
import { money } from './ui/motion.jsx';
import { pxPerMeter } from './viz/SatelliteLayer.jsx';
import { projectStreet, STREET } from './viz/StreetWorld.jsx';
import { projection } from '../../dist/map/places.js';
import { HOUSEHOLDS, HOUSING } from './viz/households.js';

const C = facts.cities;
// Same order as the five blocks in the app's "Compare cities" view.
export const STATS = ['sf', 'nyc', 'austin', 'chicago', 'seattle'].map((id, mapIndex) => ({
  mapIndex,
  name: C[id].name,
  burden30: C[id].burden30,
  burden50: C[id].burden50,
  moe30: C[id].burden30Moe,
  rentGrowth: C[id].growth.rent,
  rentMoe: C[id].growth.rentMoe,
  incomeGrowth: C[id].growth.renterIncome,
  incomeMoe: C[id].growth.renterIncomeMoe,
  verdict: C[id].growth.verdict,
}));
const SF_SERIES = data.cities.find((c) => c.id === 'sf').data.map((d) => ({ year: d.year, value: d.rent, period: d.period }));
export const CHARTS = {
  rentline: { points: SF_SERIES },
  people: { share: C.sf.burden30, moe: C.sf.burden30Moe, burdened: [1, 4, 6, 8] },
  citybars: { rows: [...STATS].sort((a, b) => b.burden30 - a.burden30).map((s) => ({ name: s.name, mapIndex: s.mapIndex, share30: s.burden30, share50: s.burden50, moe30: s.moe30 })) },
  dumbbell: { rows: STATS.map((s) => ({ name: s.name, mapIndex: s.mapIndex, rent: s.rentGrowth, rentMoe: s.rentMoe, income: s.incomeGrowth, incomeMoe: s.incomeMoe, verdict: s.verdict })) },
};
const SF_MEDIAN = data.cities.find((c) => c.id === 'sf').data.at(-1);

export const PLACES = {
  roosevelt: { center: [37.7641, -122.4429] },
  beachchalet: { center: [37.768, -122.509] },
};
const SF_WIDE = { center: [37.758, -122.44], zoom: 12.4 };
// Street world is 2 px per meter; this zoom lines it up with the satellite at `zoom`.
const match = (place, zoom) => pxPerMeter(zoom, PLACES[place].center[0]) / 2;
const middle = (place, zoom) => ({ x: STREET.w / 2, y: STREET.h / 2, z: match(place, zoom) });
/** Satellite center that keeps the imagery under a street camera looking at world (x, y). */
const satUnder = (place, cam) => {
  const [lat, lng] = PLACES[place].center;
  const p = projection({ lat, lng }).toLatLng([cam.x, cam.y]);
  return [p.lat, p.lng];
};
// Layers slide: the scene's middle sits at stage x ~1000, right of the text card.
const LAYERS_CAM = { x: STREET.w / 2 - 200 / match('beachchalet', 17), y: STREET.h / 2, z: match('beachchalet', 17) };

// Compare-cities camera that leaves the left ~700px for the chart card.
const MAP_WIDE = { x: 174, y: 576, z: 0.573 };
// The pixel street starts growing in once the dive is well underway.
const FADE_IN_AFTER_DIVE = { delay: 1.15, duration: 1.1 };

// What the 5% raise does, read off the computed budgets rather than assumed.
const RAISE = {
  allKeepMore: HOUSEHOLDS.every((h) => h.raise.left > h.before.left),
  allShareHigher: HOUSEHOLDS.every((h) => h.raise.share > h.before.share),
};
const RAISE_BODY = RAISE.allKeepMore && RAISE.allShareHigher
  ? 'In dollars, yes: all four keep a bit more each month than before rent went up. But rent still takes a bigger share of every paycheck.'
  : 'Not for everyone. Watch where each bar ends up against the tick where it started.';

/** Slides need the resident's home position, which comes from the mapped scene. */
export function buildSlides(home) {
  const near = { x: home.x - 180 / 3.2, y: home.y - 150 / 3.2, z: 3.2 };
  const street = { x: home.x - 250 / 1.7, y: home.y - 70 / 1.7, z: 1.7 };
  // Asking the whole block pulls back a little so more of the neighbors are in view.
  const block = { x: home.x - 250 / 1.4, y: home.y - 40 / 1.4, z: 1.4 };
  const tasha = projectStreet(near, home.x, home.y);
  const cardAt = { x: tasha.x + 120, y: 110 };
  const bubbleAt = { x: tasha.x, y: tasha.y - 18 * near.z - 18 };

  return [
    {
      id: 'title',
      panel: 'hero',
      sat: { ...SF_WIDE, duration: 0 },
      headline: 'DataScape',
      body: 'We were curious what a rent number actually means for the people who pay it, so we built a way to go looking.',
      notes: 'Open on the name. The topic we were curious about is rent, and the creative part is that you walk through it. The question “Can you afford to stay?” is saved for the last slide.',
    },
    {
      id: 'chart',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 15.4, duration: 2.4 },
      headline: 'Rent is usually a number on a chart.',
      viz: 'rentline',
      body: `San Francisco’s median rent has climbed to ${money(SF_MEDIAN.rent)} a month. It’s a real number, but it’s hard to picture anyone behind it.`,
      foot: `Census ACS ${SF_MEDIAN.period} (5-year), table B25064, median gross rent.`,
      notes: 'The satellite flies into Corona Heights while you say it.',
    },
    {
      id: 'street',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 18, duration: 2.2 },
      street: { place: 'roosevelt', camera: middle('roosevelt', 18), fade: FADE_IN_AFTER_DIVE, follow: true },
      headline: 'So we put it on a street.',
      body: 'Click anywhere in San Francisco and DataScape builds that block from OpenStreetMap: the real roads, parks and courts, drawn as a pixel neighborhood people walk around in.',
      foot: 'Imagery: Esri, Vantor, Earthstar Geographics. Map data © OpenStreetMap contributors.',
      notes: 'This is the app’s own zoom: the satellite blends into the street at the same scale, so the roads line up.',
    },
    {
      id: 'tasha',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 18, duration: 0 },
      street: { place: 'roosevelt', camera: near, highlight: true },
      headline: 'This is Tasha.',
      body: 'Tasha runs a bakery around the corner and has rented an apartment on this street for nine years, with a teenage kid at home.',
      foot: 'Tasha isn’t a real person. The rent and income are based on San Francisco’s Census medians.',
      notes: 'The camera finds one person on the real street.',
    },
    {
      id: 'rent',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 18, duration: 0 },
      street: { place: 'roosevelt', camera: { ...near }, highlight: true },
      card: 'compact',
      cardAt,
      headline: `Rent is ${money(N.rent)} a month.`,
      body: `A little above the city median. The household brings in about ${money(Math.round(N.income / 100) * 100)} a month, so rent takes about a third of it.`,
      notes: 'The budget card pops out next to Tasha. Income, rent, what’s left.',
    },
    {
      id: 'raise',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 18, duration: 0 },
      street: { place: 'roosevelt', camera: { ...near }, highlight: true },
      card: 'raised',
      cardAt,
      bubble: { text: 'We’d make it work, but the kids would notice the cutbacks.', at: bubbleAt },
      headline: 'Next year, rent goes up 10%.',
      body: `That’s ${money(N.raised - N.rent)} more every month, and it has to come from somewhere.`,
      notes: 'Pause while the numbers tick and Tasha talks.',
    },
    {
      id: 'neighbors',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 18, duration: 0 },
      street: { place: 'roosevelt', camera: street, highlight: true, tags: { burdened: [1, 4, 6, 8] } },
      headline: 'Tasha isn’t unusual.',
      body: 'Take the ten people walking closest to Tasha. If they’re typical San Francisco renters, about four of them spend 30% or more of their income on rent.',
      viz: 'people',
      foot: `Census ACS 2024 (1-year), table B25070. San Francisco: ${(C.sf.burden30 * 100).toFixed(1)}% ± ${(C.sf.burden30Moe * 100).toFixed(1)}.`,
      notes: 'The walkers are decorative; the share is the Census number. Say “if they’re typical”.',
    },
    {
      id: 'ask',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 18, duration: 0 },
      street: { place: 'roosevelt', camera: block, highlight: true, chat: 'shock' },
      headline: 'So you can ask the whole block.',
      body: 'Type a housing question and the people nearby answer from their own budgets. Here, everyone’s rent goes up 10%.',
      foot: `Fictional households built on San Francisco’s Census medians (ACS ${HOUSING.period}). In the app they answer in their own words, written live by AI. The numbers are calculated, not generated.`,
      notes: 'This is the app’s neighborhood chat: type a question in the bubble at the bottom and the people nearby answer. The bars are each household’s rent as a share of income; the tick is where they started. If there’s time, switch to the live app and ask it something.',
    },
    {
      id: 'payrise',
      panel: 'card',
      sat: { center: PLACES.roosevelt.center, zoom: 18, duration: 0 },
      street: { place: 'roosevelt', camera: { ...block }, highlight: true, chat: 'raise' },
      headline: 'Does a 5% raise close the gap?',
      body: RAISE_BODY,
      foot: `Rent +10% and income +5% on ACS ${HOUSING.period} medians. A what-if, not a forecast.`,
      notes: 'Same households, same question with a raise added. Point at the ticks: the bars come back, but not all the way.',
    },
    {
      id: 'park',
      panel: 'card',
      sat: { center: PLACES.beachchalet.center, zoom: 18, duration: 3.2 },
      street: { place: 'beachchalet', camera: middle('beachchalet', 18), fade: { delay: 2.7, duration: 1.1 }, fadeOut: 0.6, follow: true },
      headline: 'It works anywhere in the city.',
      body: 'Here’s the west end of Golden Gate Park. The soccer fields, paths and trees are where the map says they are.',
      foot: 'Map data © OpenStreetMap contributors. Trees and building art are illustrative.',
      notes: 'The street fades out, the satellite flies across the city, and dives again.',
    },
    {
      id: 'layers',
      panel: 'card',
      sat: { center: satUnder('beachchalet', LAYERS_CAM), zoom: 17, duration: 1.4 },
      street: { place: 'beachchalet', camera: LAYERS_CAM, mode: 'layers', modeDelay: 1300, follow: true },
      headline: 'Three kinds of data, one place.',
      steps: [
        ['Satellite imagery', 'for the overview', 0.4],
        ['OpenStreetMap', 'for the roads, buildings and fields', 2],
        ['Census numbers', 'for rent and income', 4.8],
      ],
      body: 'Each layer is tied to the same real spot on the map.',
      foot: 'Imagery: Esri, Vantor, Earthstar Geographics. Map data © OpenStreetMap contributors. U.S. Census Bureau ACS.',
      notes: 'Watch the layers stack: imagery, then the map’s linework draws on, then the pixel city. The rent numbers ride on top of all of it.',
    },
    {
      id: 'cities',
      panel: 'wide',
      sat: { center: satUnder('beachchalet', LAYERS_CAM), zoom: 17, duration: 0 },
      compare: { camera: MAP_WIDE, light: 0.05, signs: 'tags-burden' },
      headline: 'In New York, it’s over half.',
      viz: 'citybars',
      body: 'Same question, five cities. San Francisco, where incomes are high, comes in lowest.',
      foot: 'Census ACS 2024 (1-year), table B25070, city boundaries.',
      notes: 'This is the app’s Compare cities view. San Francisco is lowest because incomes there are high.',
    },
    {
      id: 'surprise',
      panel: 'wide',
      sat: { center: satUnder('beachchalet', LAYERS_CAM), zoom: 17, duration: 0 },
      compare: { camera: { ...MAP_WIDE }, light: 0.2, signs: 'tags-growth' },
      headline: 'The data surprised us.',
      viz: 'dumbbell',
      body: 'We expected rent to be outrunning income. Next to renters’ incomes, most gaps are too small to call, and in New York incomes grew faster. So we show where people are now, not a trend.',
      foot: 'Census ACS 1-year, 2021 to 2024. “Too close to call” means the gap is inside the margin of error.',
      notes: 'Same map, new question. Mostly no clear answer, and that’s the honest result.',
    },
    {
      id: 'close',
      panel: 'hero',
      sat: { ...SF_WIDE, duration: 2.6 },
      dusk: true,
      headline: 'Can you afford to stay?',
      body: 'Click anywhere in San Francisco, meet who lives there, and ask them.',
      foot: 'Imagery: Esri, Vantor, Earthstar Geographics, GIS User Community. Map data © OpenStreetMap contributors (ODbL). Data: U.S. Census Bureau, American Community Survey. Art: Modern Exteriors by LimeZu; characters by route1rodent / javikolog (CC BY-SA 3.0).',
      notes: 'End on the question, over the whole city.',
    },
  ];
}
