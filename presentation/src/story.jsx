import facts from './data/facts.json';
import { project } from './viz/PixelWorld.jsx';
import { TASHA_NUMBERS as N } from './actors.jsx';
import { money } from './ui/motion.jsx';

// Edit names here before presenting.
export const TEAM = [
  { name: 'Mahin', role: 'the city, map and zoom', char: 2 },
  { name: 'Teammate 1', role: 'residents, budgets and reactions', char: 6 },
  { name: 'Teammate 2', role: 'housing data and budget math', char: 8 },
];

const TASHA = { x: 368, y: 486, char: 3 };
const C = facts.cities;
// Same order as the five blocks in the city (dist/app.js ORIGINS).
export const STATS = ['sf', 'nyc', 'austin', 'chicago', 'seattle'].map((id) => ({
  name: C[id].name,
  burden30: C[id].burden30,
  rentGrowth: C[id].growth.rent,
  incomeGrowth: C[id].growth.renterIncome,
  verdict: C[id].growth.verdict,
}));
const pctInt = (r) => `${Math.round(r * 100)}%`;

// Camera shots, in world pixels. The map shots leave the left 440px for the text card.
const WIDE = { x: 700, y: 560, z: 0.8 };
const DOOR = { x: 315, y: 442, z: 3.4 };
const MAP = { x: 472, y: 566, z: 0.72 };
// The walkway in front of the top row of Tasha's block.
const PARK = { x: 330, y: 300, z: 3.2 };
const TEAM_SPOTS = [{ x: 290, y: 306 }, { x: 350, y: 310 }, { x: 410, y: 306 }];

const tashaOn = (camera) => project(camera, TASHA.x, TASHA.y);
const beside = (camera) => { const p = tashaOn(camera); return { x: p.x + 120, y: 110 }; };
const above = (camera) => { const p = tashaOn(camera); return { x: p.x, y: p.y - 18 * p.z - 18 }; };

export const SLIDES = [
  {
    id: 'title',
    panel: 'hero',
    shot: { camera: WIDE, light: 0.05, signs: 'none', drift: 40 },
    headline: 'Can you afford to stay?',
    body: 'DataScape is a city you can walk through, built from Census housing data.',
    notes: 'Let the city run for a second before talking. Every building, street and person on screen is from the real app.',
  },
  {
    id: 'tasha',
    panel: 'card',
    shot: { camera: { x: 300, y: 470, z: 3 }, light: 0, signs: 'rent', highlight: TASHA },
    headline: 'This is Tasha.',
    body: 'Tasha runs the bakery on the corner and has rented the apartment above it for nine years, with a teenage kid at home.',
    foot: 'Tasha isn’t a real person. The rent and income are based on San Francisco’s Census medians.',
    notes: 'The camera lands on her door. The sign above the building is San Francisco’s actual median rent.',
  },
  {
    id: 'rent',
    panel: 'card',
    shot: { camera: DOOR, light: 0, signs: 'rent', highlight: TASHA },
    card: 'compact',
    cardAt: beside(DOOR),
    headline: `Rent is ${money(N.rent)} a month.`,
    body: `A little above the city median of ${money(N.median)}. The household brings in about ${money(Math.round(N.income / 100) * 100)} a month, so rent takes about a third of it.`,
    notes: 'Her budget card pops out of the building. Keep it simple: income, rent, what’s left.',
  },
  {
    id: 'raise',
    panel: 'card',
    shot: { camera: { ...DOOR }, light: 0, signs: 'rent', highlight: TASHA },
    card: 'raised',
    cardAt: beside(DOOR),
    bubble: { text: 'We’d make it work, but the kids would notice the cutbacks.', at: above(DOOR) },
    headline: 'Next year, rent goes up 10%.',
    body: `That’s ${money(N.raised - N.rent)} more every month, and it has to come from somewhere.`,
    foot: 'We wrote Tasha’s reaction ourselves. It isn’t AI and it isn’t a real quote.',
    notes: 'Pause while the numbers tick and Tasha talks.',
  },
  {
    id: 'street',
    panel: 'card',
    shot: { camera: { x: 120, y: 380, z: 2 }, light: 0.05, signs: 'none', highlight: TASHA, tags: { city: 0, count: 10, burdened: [1, 4, 6, 8] } },
    headline: 'Tasha isn’t unusual.',
    body: 'Picture ten renters on this street. About four of them spend 30% or more of their income on rent.',
    foot: `Census ACS 2024 (1-year), table B25070. San Francisco: ${(C.sf.burden30 * 100).toFixed(1)}% ± ${(C.sf.burden30Moe * 100).toFixed(1)}.`,
    notes: 'The camera pulls back; four of the ten walkers get the red marker. That’s the statistic, as people.',
  },
  {
    id: 'cities',
    panel: 'side',
    shot: { camera: MAP, light: 0.1, signs: 'burden', focusCity: 1 },
    headline: `In New York, it’s over half.`,
    body: `We asked the same question in five cities. New York comes in at ${pctInt(C.nyc.burden30)}, and San Francisco is actually the lowest.`,
    foot: 'Census ACS 2024 (1-year), table B25070, city boundaries.',
    notes: 'The camera flies out to the whole map and each block gets a signboard. Point at New York, then at San Francisco being lowest because incomes there are high.',
  },
  {
    id: 'built',
    panel: 'card',
    shot: { camera: { x: 330, y: 400, z: 2.2 }, light: 0.12, signs: 'rent', highlight: TASHA },
    card: 'panel',
    cardAt: { x: 1030, y: 70 },
    headline: 'So we built DataScape.',
    body: 'Pick a city. Walk into a neighborhood. Click on someone to see their budget, then change the rent or their income and see what happens.',
    foot: 'Census numbers link to their source. Residents and reactions are marked as made up.',
    notes: 'Tasha’s card grows into the real resident panel from the app. This is the product.',
  },
  {
    id: 'surprise',
    panel: 'side',
    shot: { camera: { ...MAP }, light: 0.3, signs: 'growth' },
    headline: 'The data surprised us.',
    body: 'We expected rent to be climbing faster than income. Compared with renters’ incomes, it mostly wasn’t clear, and in New York incomes grew faster. So we show where people are now instead of claiming a trend.',
    foot: 'Census ACS 1-year, 2021 to 2024. “Too close to call” means the gap is inside the margin of error.',
    notes: 'This is the credibility moment. Same signboards, new question: did rent outrun income? Mostly no clear answer.',
  },
  {
    id: 'team',
    panel: 'card',
    shot: { camera: PARK, light: 0.55, signs: 'none', extras: TEAM.map((t, i) => ({ ...TEAM_SPOTS[i], char: t.char })) },
    tags: TEAM.map((t, i) => ({ ...t, at: (() => { const p = project(PARK, TEAM_SPOTS[i].x, TEAM_SPOTS[i].y); return { x: p.x, y: p.y - 18 * p.z - 12 }; })() })),
    headline: 'Three of us built it in a day.',
    body: 'Each of us owned one piece, and we stitched them together at the end.',
    list: TEAM.map((t) => [t.name, t.role]),
    notes: 'Swap in real names in TEAM at the top of src/story.jsx.',
  },
  {
    id: 'close',
    panel: 'hero',
    shot: { camera: { x: 768, y: 600, z: 0.85 }, light: 0.85, signs: 'none', drift: 40 },
    headline: 'Can you afford to stay?',
    body: 'Thanks. Try it yourself: pick someone and change their rent.',
    foot: 'Data: U.S. Census Bureau, American Community Survey. City art: Modern Exteriors by LimeZu. Characters: route1rodent / javikolog, CC BY-SA 3.0.',
    notes: 'Evening falls on the city. End on the question.',
  },
];
