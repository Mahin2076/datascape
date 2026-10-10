// One-off: snapshot OpenStreetMap features for the deck's two locations using the
// app's own normalizeOSM, so the presentation works without live map requests.
// Map data (c) OpenStreetMap contributors, ODbL.
import { writeFileSync } from 'node:fs';
import { normalizeOSM, projection, WIDTH, HEIGHT, SCALE } from '../../dist/map/places.js';

// Keep only what buildPlaceScene reads, only features near the scene, coords to ~10 cm.
const KEEP_TAGS = ['building', 'leisure', 'sport', 'highway', 'foot', 'access', 'name', 'addr:street', 'natural', 'landuse', 'water'];
const round = ([lng, lat]) => [Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6];
function slim(features, center) {
  const { toXY } = projection(center);
  const near = (f) => { const xy = f.points.map(toXY); const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]); return Math.max(...xs) >= -120 && Math.min(...xs) <= WIDTH + 120 && Math.max(...ys) >= -120 && Math.min(...ys) <= HEIGHT + 120; };
  return features.filter(near).map((f) => ({ id: f.id, type: f.type, tags: Object.fromEntries(Object.entries(f.tags || {}).filter(([k]) => KEEP_TAGS.includes(k))), points: f.points.map(round), ...(f.rings ? { rings: f.rings.map((r) => r.map(round)) } : {}) }));
}
const METERS = 111320;
// Run from the repository root: node presentation/scripts/snapshot-places.mjs
const PLACES = {
  roosevelt: { lat: 37.7641, lng: -122.4429, label: 'Roosevelt Way, Corona Heights' },
  beachchalet: { lat: 37.768, lng: -122.509, label: 'Beach Chalet fields, Golden Gate Park' },
};
for (const [id, c] of Object.entries(PLACES)) {
  const dx = WIDTH / (2 * SCALE * METERS * Math.cos(c.lat * Math.PI / 180)), dy = HEIGHT / (2 * SCALE * METERS);
  const bounds = [c.lng - dx * 1.35, c.lat - dy * 1.35, c.lng + dx * 1.35, c.lat + dy * 1.35];
  const url = 'https://api.openstreetmap.org/api/0.6/map.json?bbox=' + bounds.join(',');
  const res = await fetch(url, { headers: { 'User-Agent': 'datascape-presentation-snapshot/1.0' } });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const features = slim(normalizeOSM(await res.json()), c);
  writeFileSync(new URL(`../src/data/places/${id}.json`, import.meta.url), JSON.stringify({ center: { lat: c.lat, lng: c.lng }, label: c.label, source: url, retrieved: new Date().toISOString(), license: 'Map data (c) OpenStreetMap contributors, ODbL 1.0', features }));
  console.log(id, features.length, 'features', Object.entries(features.reduce((m, f) => (m[f.type] = (m[f.type] || 0) + 1, m), {})).map(([k, v]) => `${k}:${v}`).join(' '));
}
