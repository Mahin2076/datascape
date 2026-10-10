// Illustrative residents (H0 fixture proposal). Every person here is fictional.
//
// Rent and income are anchored to the selected city's published medians through an
// explicit multiplier, so a household stays coherent across cities and years while the
// UI can say exactly how each number was built. `fixed` anchors are illustrative dollars.
// `building` matches the building titles drawn by dist/app.js for that city's block.

/**
 * @typedef {{ anchor: 'cityMedian', multiplier: number } | { anchor: 'fixed', amount: number }} Anchor
 * @typedef {{
 *   id: string, cityId: string, name: string, ageBand: string, occupation: string,
 *   household: { size: number, description: string }, building: string, sprite: number,
 *   yearsInHome: number,
 *   traits: { hasKids: boolean, remoteWork: boolean, canAddRoommate: boolean, roots: string },
 *   rent: Anchor, income: Anchor, essentialsMonthly: number, voice: string
 * }} Resident
 */

const r = (o) => Object.freeze({ ...o, household: Object.freeze(o.household), traits: Object.freeze(o.traits) });

export const RESIDENTS = Object.freeze([
  // San Francisco — Pacific Court, Bay Window House, Garden Apartments, The Corner Residence
  r({ id: 'sf-ines', cityId: 'sf', name: 'Inés', ageBand: '20s', occupation: 'Line cook',
    household: { size: 1, description: 'Lives alone in a studio' }, building: 'Pacific Court', sprite: 1,
    yearsInHome: 2, traits: { hasKids: false, remoteWork: false, canAddRoommate: true, roots: 'works two blocks away' },
    rent: { anchor: 'cityMedian', multiplier: 0.8 }, income: { anchor: 'cityMedian', multiplier: 0.42 },
    essentialsMonthly: 1100, voice: 'direct' }),
  r({ id: 'sf-dev', cityId: 'sf', name: 'Dev & Priya', ageBand: '30s', occupation: 'Nurse and software tester',
    household: { size: 3, description: 'Couple with a toddler' }, building: 'Bay Window House', sprite: 4,
    yearsInHome: 5, traits: { hasKids: true, remoteWork: true, canAddRoommate: false, roots: 'daycare is on the corner' },
    rent: { anchor: 'cityMedian', multiplier: 1.35 }, income: { anchor: 'cityMedian', multiplier: 1.25 },
    essentialsMonthly: 3400, voice: 'planner' }),
  r({ id: 'sf-walt', cityId: 'sf', name: 'Walt', ageBand: '70s', occupation: 'Retired bus driver',
    household: { size: 1, description: 'Retiree on a fixed income' }, building: 'Garden Apartments', sprite: 7,
    yearsInHome: 31, traits: { hasKids: false, remoteWork: false, canAddRoommate: false, roots: 'has lived here 31 years' },
    rent: { anchor: 'fixed', amount: 1150 }, income: { anchor: 'fixed', amount: 34000 },
    essentialsMonthly: 1300, voice: 'steady' }),
  r({ id: 'sf-tasha', cityId: 'sf', name: 'Tasha', ageBand: '40s', occupation: 'Small bakery owner',
    household: { size: 2, description: 'Parent and teenager' }, building: 'The Corner Residence', sprite: 3,
    yearsInHome: 9, traits: { hasKids: true, remoteWork: false, canAddRoommate: false, roots: 'runs the bakery downstairs' },
    rent: { anchor: 'cityMedian', multiplier: 1.1 }, income: { anchor: 'cityMedian', multiplier: 0.7 },
    essentialsMonthly: 2300, voice: 'warm' }),

  // New York — Hudson House, Orchard House, Garden Apartments, The Corner Residence
  r({ id: 'nyc-marcus', cityId: 'nyc', name: 'Marcus', ageBand: '30s', occupation: 'Subway electrician',
    household: { size: 2, description: 'Lives with a partner' }, building: 'Hudson House', sprite: 2,
    yearsInHome: 6, traits: { hasKids: false, remoteWork: false, canAddRoommate: false, roots: 'commute is one train' },
    rent: { anchor: 'cityMedian', multiplier: 1.2 }, income: { anchor: 'cityMedian', multiplier: 1.1 },
    essentialsMonthly: 2100, voice: 'direct' }),
  r({ id: 'nyc-rosa', cityId: 'nyc', name: 'Rosa', ageBand: '60s', occupation: 'Home health aide',
    household: { size: 3, description: 'Grandparent raising two grandkids' }, building: 'Orchard House', sprite: 5,
    yearsInHome: 22, traits: { hasKids: true, remoteWork: false, canAddRoommate: false, roots: 'the kids’ school is here' },
    rent: { anchor: 'fixed', amount: 1350 }, income: { anchor: 'cityMedian', multiplier: 0.5 },
    essentialsMonthly: 2000, voice: 'warm' }),
  r({ id: 'nyc-kenji', cityId: 'nyc', name: 'Kenji', ageBand: '20s', occupation: 'Graduate student',
    household: { size: 1, description: 'Shares an apartment with two roommates' }, building: 'Garden Apartments', sprite: 0,
    yearsInHome: 1, traits: { hasKids: false, remoteWork: true, canAddRoommate: true, roots: 'campus is a short walk' },
    rent: { anchor: 'cityMedian', multiplier: 0.6 }, income: { anchor: 'fixed', amount: 31000 },
    essentialsMonthly: 900, voice: 'wry' }),
  r({ id: 'nyc-abena', cityId: 'nyc', name: 'Abena', ageBand: '40s', occupation: 'Public school teacher',
    household: { size: 4, description: 'Two parents, two kids' }, building: 'The Corner Residence', sprite: 6,
    yearsInHome: 8, traits: { hasKids: true, remoteWork: false, canAddRoommate: false, roots: 'teaches at the neighborhood school' },
    rent: { anchor: 'cityMedian', multiplier: 1.45 }, income: { anchor: 'cityMedian', multiplier: 1.6 },
    essentialsMonthly: 4200, voice: 'planner' }),

  // Austin — Juniper Place, Sunflower House, Garden Apartments, The Corner Residence
  r({ id: 'austin-luis', cityId: 'austin', name: 'Luis', ageBand: '30s', occupation: 'Construction foreman',
    household: { size: 4, description: 'Couple with two kids' }, building: 'Juniper Place', sprite: 8,
    yearsInHome: 4, traits: { hasKids: true, remoteWork: false, canAddRoommate: false, roots: 'family lives nearby' },
    rent: { anchor: 'cityMedian', multiplier: 1.3 }, income: { anchor: 'cityMedian', multiplier: 1.0 },
    essentialsMonthly: 3600, voice: 'direct' }),
  r({ id: 'austin-sky', cityId: 'austin', name: 'Sky', ageBand: '20s', occupation: 'Freelance designer',
    household: { size: 1, description: 'Lives alone' }, building: 'Sunflower House', sprite: 9,
    yearsInHome: 1, traits: { hasKids: false, remoteWork: true, canAddRoommate: true, roots: 'moved here for the music scene' },
    rent: { anchor: 'cityMedian', multiplier: 0.95 }, income: { anchor: 'cityMedian', multiplier: 0.75 },
    essentialsMonthly: 1200, voice: 'wry' }),
  r({ id: 'austin-gloria', cityId: 'austin', name: 'Gloria', ageBand: '50s', occupation: 'Hospital receptionist',
    household: { size: 2, description: 'Parent and adult child' }, building: 'Garden Apartments', sprite: 5,
    yearsInHome: 12, traits: { hasKids: false, remoteWork: false, canAddRoommate: false, roots: 'church community is here' },
    rent: { anchor: 'cityMedian', multiplier: 0.9 }, income: { anchor: 'cityMedian', multiplier: 0.55 },
    essentialsMonthly: 1700, voice: 'steady' }),
  r({ id: 'austin-ray', cityId: 'austin', name: 'Ray', ageBand: '60s', occupation: 'Retired teacher',
    household: { size: 1, description: 'Widowed, lives alone' }, building: 'The Corner Residence', sprite: 7,
    yearsInHome: 18, traits: { hasKids: false, remoteWork: false, canAddRoommate: false, roots: 'knows every neighbor by name' },
    rent: { anchor: 'fixed', amount: 1050 }, income: { anchor: 'fixed', amount: 38000 },
    essentialsMonthly: 1200, voice: 'steady' }),

  // Chicago — Lakeside Row, Willow House, Garden Apartments, The Corner Residence
  r({ id: 'chicago-dana', cityId: 'chicago', name: 'Dana', ageBand: '30s', occupation: 'Warehouse supervisor',
    household: { size: 3, description: 'Single parent with two kids' }, building: 'Lakeside Row', sprite: 3,
    yearsInHome: 3, traits: { hasKids: true, remoteWork: false, canAddRoommate: false, roots: 'kids just changed schools once' },
    rent: { anchor: 'cityMedian', multiplier: 1.0 }, income: { anchor: 'cityMedian', multiplier: 0.65 },
    essentialsMonthly: 2400, voice: 'direct' }),
  r({ id: 'chicago-omar', cityId: 'chicago', name: 'Omar', ageBand: '20s', occupation: 'Rideshare driver and student',
    household: { size: 1, description: 'Lives alone' }, building: 'Willow House', sprite: 2,
    yearsInHome: 2, traits: { hasKids: false, remoteWork: false, canAddRoommate: true, roots: 'classes are downtown' },
    rent: { anchor: 'cityMedian', multiplier: 0.85 }, income: { anchor: 'cityMedian', multiplier: 0.5 },
    essentialsMonthly: 1100, voice: 'wry' }),
  r({ id: 'chicago-helen', cityId: 'chicago', name: 'Helen & Bo', ageBand: '50s', occupation: 'Accountant and electrician',
    household: { size: 2, description: 'Empty-nest couple' }, building: 'Garden Apartments', sprite: 6,
    yearsInHome: 14, traits: { hasKids: false, remoteWork: true, canAddRoommate: false, roots: 'garden plot out back' },
    rent: { anchor: 'cityMedian', multiplier: 1.05 }, income: { anchor: 'cityMedian', multiplier: 1.7 },
    essentialsMonthly: 2600, voice: 'planner' }),
  r({ id: 'chicago-mae', cityId: 'chicago', name: 'Mae', ageBand: '80s', occupation: 'Retired seamstress',
    household: { size: 1, description: 'Retiree on Social Security' }, building: 'The Corner Residence', sprite: 4,
    yearsInHome: 40, traits: { hasKids: false, remoteWork: false, canAddRoommate: false, roots: 'raised a family in this building' },
    rent: { anchor: 'fixed', amount: 900 }, income: { anchor: 'fixed', amount: 22000 },
    essentialsMonthly: 950, voice: 'warm' }),

  // Seattle — Cedar Court, Evergreen House, Garden Apartments, The Corner Residence
  r({ id: 'seattle-jun', cityId: 'seattle', name: 'Jun', ageBand: '30s', occupation: 'Cloud engineer',
    household: { size: 1, description: 'Lives alone' }, building: 'Cedar Court', sprite: 0,
    yearsInHome: 2, traits: { hasKids: false, remoteWork: true, canAddRoommate: true, roots: 'climbing gym is close' },
    rent: { anchor: 'cityMedian', multiplier: 1.25 }, income: { anchor: 'cityMedian', multiplier: 1.9 },
    essentialsMonthly: 1800, voice: 'planner' }),
  r({ id: 'seattle-ana', cityId: 'seattle', name: 'Ana', ageBand: '40s', occupation: 'Ferry deckhand',
    household: { size: 3, description: 'Parent with two kids' }, building: 'Evergreen House', sprite: 1,
    yearsInHome: 7, traits: { hasKids: true, remoteWork: false, canAddRoommate: false, roots: 'shifts start at the terminal' },
    rent: { anchor: 'cityMedian', multiplier: 1.1 }, income: { anchor: 'cityMedian', multiplier: 0.8 },
    essentialsMonthly: 2800, voice: 'warm' }),
  r({ id: 'seattle-theo', cityId: 'seattle', name: 'Theo', ageBand: '20s', occupation: 'Barista',
    household: { size: 1, description: 'Rents a room in a shared house' }, building: 'Garden Apartments', sprite: 9,
    yearsInHome: 1, traits: { hasKids: false, remoteWork: false, canAddRoommate: true, roots: 'band practices in the basement' },
    rent: { anchor: 'cityMedian', multiplier: 0.55 }, income: { anchor: 'fixed', amount: 36000 },
    essentialsMonthly: 1000, voice: 'wry' }),
  r({ id: 'seattle-lena', cityId: 'seattle', name: 'Lena', ageBand: '60s', occupation: 'Librarian, near retirement',
    household: { size: 2, description: 'Lives with a sibling' }, building: 'The Corner Residence', sprite: 8,
    yearsInHome: 16, traits: { hasKids: false, remoteWork: false, canAddRoommate: false, roots: 'branch library is down the street' },
    rent: { anchor: 'cityMedian', multiplier: 1.0 }, income: { anchor: 'cityMedian', multiplier: 0.9 },
    essentialsMonthly: 2000, voice: 'steady' }),
]);

export const CITY_NAMES = Object.freeze({
  sf: 'San Francisco', nyc: 'New York', austin: 'Austin', chicago: 'Chicago', seattle: 'Seattle',
});

export function getResident(residentId) {
  return RESIDENTS.find((x) => x.id === residentId) ?? null;
}

/** Residents to place on the map for a city: what the map module needs, nothing more. */
export function listResidents(cityId) {
  return RESIDENTS.filter((x) => x.cityId === cityId).map((x) =>
    Object.freeze({ id: x.id, name: x.name, building: x.building, sprite: x.sprite }));
}
