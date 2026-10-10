// DataScape's world layout, ported from dist/app.js so the deck shows the real product
// city: five neighborhood blocks, the same buildings, props, streets and residents.

export const W = 1536;
export const H = 1152;
export const ORIGINS = [[48, 64], [560, 64], [1072, 64], [48, 624], [560, 624]];
export const CITY_IDS = ['sf', 'nyc', 'austin', 'chicago', 'seattle'];
const FIRST = ['Pacific Court', 'Hudson House', 'Juniper Place', 'Lakeside Row', 'Cedar Court'];
const SECOND = ['Bay Window House', 'Orchard House', 'Sunflower House', 'Willow House', 'Evergreen House'];
const SETS = [
  ['apartmentSlate', 'houseMedium', 'houseSmall', 'townhouse'],
  ['brownstone', 'houseMedium', 'townhouse', 'apartmentGold'],
  ['apartmentGold', 'houseSmall', 'houseSmall', 'townhouse'],
  ['apartmentSlate', 'houseMedium', 'houseSmall', 'townhouse'],
  ['apartmentTeal', 'houseMedium', 'houseSmall', 'townhouse'],
];

/** Build the static world from the atlas regions (world-atlas.json). */
export function buildWorld(atlas) {
  const buildings = [];
  const props = [];
  const prop = (n, x, y) => props.push({ n, x, y, z: y + atlas[n][3] });
  const building = (n, x, foot, city, title) => {
    const a = atlas[n];
    buildings.push({ n, x, y: foot - a[3], w: a[2], h: a[3], foot, city, title, doorX: x + a[2] / 2 });
  };
  ORIGINS.forEach(([x, y], i) => {
    const s = SETS[i];
    building(s[0], x + 24, y + 210, i, FIRST[i]);
    building(s[1], x + 224, y + 210, i, SECOND[i]);
    building(s[2], x + 56, y + 400, i, 'Garden Apartments');
    building(s[3], x + 296, y + 400, i, 'The Corner Residence');
    for (let xx = x + 8; xx < x + 410; xx += 16) if (xx < x + 55 || xx > x + 150) prop('fence', xx, y + 415);
    for (let j = 0; j < 5; j++) prop(j % 2 ? 'tree' : 'tree2', x + 144 + (j % 2) * 30, y + 25 + j * 35);
    for (let j = 0; j < 3; j++) { prop('cypress', x + 353, y + 55 + j * 44); prop('flowersPink', x + 229 + j * 32, y + 215); }
    prop('benchWide', x + 170, y + 299); prop('benchVertical', x + 8, y + 296); prop('flowersWhite', x + 175, y + 337);
    prop('tree', x + 172, y + 348); prop('tree2', x + 344, y + 354); prop('lamp', x + 190, y + 213);
    prop('lampMirror', x + 400, y + 350); prop('hydrant', x + 403, y + 216); prop('trash', x + 216, y + 268);
  });
  building('hardware', 1090, 900, 2, 'Market Street Apartments');
  building('office', 1298, 954, 2, 'Civic Square Apartments');
  for (let i = 0; i < 21; i++) prop(i % 3 ? 'tree' : 'cypress', 1080 + (i % 7) * 27, 650 + Math.floor(i / 7) * 44);
  for (let i = 0; i < 16; i++) { prop('tree', 12 + i * 96, 24); prop('tree2', 12 + i * 96, 1093); }
  for (let y = 150; y < 1080; y += 96) { prop('tree', 16, y); prop('cypress', 1492, y); }
  for (const y of [480, 586]) for (let x = 100; x < 1450; x += 130) prop('streetLight', x, y - 50);
  for (const x of [1160, 1210]) { prop('bench', x, 785); prop('flowersRed', x, 819); }

  let seed = 135;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const npcs = Array.from({ length: 55 }, (_, i) => ({
    city: i % 5, offset: random() * 390, speed: 10 + random() * 8, row: i % 2, char: (i + 1) % 10,
  }));
  return { buildings, props, npcs };
}

/** Paint the ground (grass, pavement, roads, crosswalks) once into an offscreen canvas. */
export function paintGround(atlas, art) {
  const ground = document.createElement('canvas');
  ground.width = W;
  ground.height = H;
  const gc = ground.getContext('2d');
  gc.imageSmoothingEnabled = false;
  const pattern = (n) => {
    const a = atlas[n];
    const c = document.createElement('canvas');
    c.width = a[2];
    c.height = a[3];
    c.getContext('2d').drawImage(art, ...a, 0, 0, a[2], a[3]);
    return gc.createPattern(c, 'repeat');
  };
  const pat = Object.fromEntries(['grass', 'cobble', 'asphalt', 'pavement'].map((n) => [n, pattern(n)]));
  const fill = (n, x, y, w, h) => { gc.fillStyle = pat[n]; gc.fillRect(x, y, w, h); };
  fill('grass', 0, 0, W, H); fill('pavement', 32, 48, W - 64, H - 96);
  fill('asphalt', 480, 48, 64, H - 96); fill('asphalt', 992, 48, 64, H - 96); fill('asphalt', 32, 496, W - 64, 96);
  ORIGINS.forEach(([x, y]) => {
    fill('cobble', x, y, 416, 432); fill('grass', x + 150, y + 10, 56, 197); fill('grass', x + 349, y + 12, 52, 190);
    fill('grass', x + 170, y + 342, 64, 62); fill('asphalt', x, y + 252, 150, 48);
    gc.fillStyle = '#d4d5c6'; gc.fillRect(x, y + 249, 150, 3); gc.fillRect(x, y + 300, 150, 3);
    for (let xx = x + 8; xx < x + 145; xx += 22) { gc.fillStyle = '#d9d8c7'; gc.fillRect(xx, y + 275, 12, 2); }
  });
  fill('cobble', 1072, 624, 416, 432); fill('grass', 1072, 632, 202, 152); fill('pavement', 1096, 764, 170, 64);
  gc.fillStyle = '#d1d2c0';
  for (let y = 70; y < 1080; y += 28) { gc.fillRect(510, y, 3, 15); gc.fillRect(1022, y, 3, 15); }
  for (let x = 50; x < 1480; x += 32) gc.fillRect(x, 542, 18, 3);
  for (const x of [480, 992]) for (const y of [480, 592]) for (let j = 0; j < 6; j++) { gc.fillStyle = '#e1e0ce'; gc.fillRect(x + j * 10, y, 6, 16); }
  return ground;
}

/** Sprite sheet layout (assets/sprites.png): 5 characters per row, 3 frames x 4 directions. */
export function drawCharacter(ctx, chars, character, x, y, dir, walking, t, scale = 1) {
  const f = walking ? [1, 0, 1, 2][Math.floor(t * 8) % 4] : 1;
  ctx.drawImage(chars, (character % 5) * 48 + f * 16, Math.floor(character / 5) * 64 + dir * 16, 16, 16,
    Math.round(x - 8 * scale), Math.round(y - 16 * scale), 16 * scale, 16 * scale);
}

/** Where NPC `a` is at clock t (same walk cycle as the product). */
export function npcPosition(a, clock) {
  const [x, y] = ORIGINS[a.city];
  const walk = (a.offset + clock * a.speed) % 740;
  const forward = walk < 370;
  return { x: x + 12 + (forward ? walk : 740 - walk), y: y + (a.row ? 430 : 235), dir: forward ? 2 : 1 };
}
