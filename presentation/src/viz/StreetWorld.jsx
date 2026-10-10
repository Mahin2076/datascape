import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { buildPlaceScene, layoutBuildings, sceneFeatures, WIDTH, HEIGHT } from '../../../dist/map/places.js';
import { walkingPosition } from '../../../dist/map/residents.js';
import atlas from '../../../dist/assets/world-atlas.json';
import artUrl from '../../../dist/assets/world-atlas.png';
import charsUrl from '../../../dist/assets/sprites.png';
import soccerUrl from '../../../dist/assets/places/soccer.png';
import basketballUrl from '../../../dist/assets/places/basketball.png';
import { drawCharacter } from './world.js';

export const STREET = { w: WIDTH, h: HEIGHT };
const STAGE = { w: 1600, h: 900 };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

const images = {};
function loadImage(src) {
  images[src] ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  return images[src];
}

/** The resident we follow: standing at the door nearest the middle of the mapped scene. */
export function homeOf(place) {
  const buildings = layoutBuildings(sceneFeatures(place.features, place.center), atlas);
  let best = null;
  for (const b of buildings) {
    const d = Math.hypot(b.doorX - WIDTH / 2, b.doorY - HEIGHT / 2);
    if (!best || d < best.d) best = { d, x: Math.round(b.doorX), y: Math.round(b.doorY) };
  }
  return best ? { x: best.x, y: best.y } : { x: WIDTH / 2, y: HEIGHT / 2 };
}

/** World -> stage position for a street camera. */
export function projectStreet(camera, wx, wy) {
  return { x: STAGE.w / 2 + (wx - camera.x) * camera.z, y: STAGE.h / 2 + (wy - camera.y) * camera.z, z: camera.z };
}

function sceneFor(place, art, sports) {
  const scratch = document.createElement('canvas').getContext('2d');
  const pattern = (n) => {
    const a = atlas[n];
    const c = document.createElement('canvas');
    c.width = a[2];
    c.height = a[3];
    c.getContext('2d').drawImage(art, ...a, 0, 0, a[2], a[3]);
    return scratch.createPattern(c, 'repeat');
  };
  const patterns = Object.fromEntries(['grass', 'cobble', 'asphalt', 'pavement'].map((n) => [n, pattern(n)]));
  const sprite = (c, n, x, y, s = 1) => { const a = atlas[n]; c.drawImage(art, ...a, Math.round(x), Math.round(y), a[2] * s, a[3] * s); };
  const scene = buildPlaceScene(place.features, place.center, { patterns, sports, sprite, atlas });
  const home = homeOf(place);
  // The ten walkers whose routes pass closest to the home, for the "4 in 10" picture.
  const near = scene.residents
    .map((r, i) => ({ i, d: Math.min(...r.route.points.map((p) => Math.hypot(p[0] - home.x, p[1] - home.y))) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 10)
    .map((r) => r.i);
  return { ...scene, home, near };
}

/**
 * The app's street scene (dist/map/places.js) for a real San Francisco location, built
 * from snapshotted OpenStreetMap data. Walkers follow mapped routes like in the app.
 * shot: { place, camera: {x, y, z}, mode: 'pixel'|'layers', tags, highlight }
 */
export default function StreetWorld({ places, shot, active }) {
  const ref = useRef(null);
  const live = useRef({ shot, active });
  live.current = { shot, active };
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!places) return undefined;
    let raf = 0;
    let alive = true;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    Promise.all([loadImage(artUrl), loadImage(charsUrl), loadImage(soccerUrl), loadImage(basketballUrl)]).then(([art, chars, soccer, basketball]) => {
      if (!alive) return;
      const scenes = Object.fromEntries(Object.entries(places).map(([id, p]) => [id, sceneFor(p, art, { soccer, basketball })]));
      const cam = { x: WIDTH / 2, y: HEIGHT / 2, z: 1 };
      const flight = { from: { ...cam }, to: { ...cam }, t0: 0, dur: 0 };
      let lastShot = null;
      let lastPlace = null;
      let modeAt = 0;
      let last = performance.now();
      let clock = 0;

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reduced) clock += dt;
        const { shot: s, active: on } = live.current;
        const scene = scenes[s.place];
        if (s !== lastShot) {
          const to = { ...s.camera };
          const jump = s.place !== lastPlace || lastShot === null || reduced;
          flight.from = jump ? { ...to } : { ...cam };
          flight.to = to;
          flight.t0 = now;
          const dist = Math.hypot(to.x - cam.x, to.y - cam.y);
          flight.dur = jump ? 0 : Math.min(2400, Math.max(1100, 900 + dist * 0.8 + Math.abs(Math.log(to.z / cam.z)) * 520));
          if (s.mode !== lastShot?.mode || s.place !== lastPlace) modeAt = now + (s.modeDelay ?? 0);
          lastShot = s;
          lastPlace = s.place;
        }
        const p = flight.dur === 0 ? 1 : clamp01((now - flight.t0) / flight.dur);
        const e = easeInOut(p);
        cam.x = flight.from.x + (flight.to.x - flight.from.x) * e;
        cam.y = flight.from.y + (flight.to.y - flight.from.y) * e;
        cam.z = Math.exp(Math.log(flight.from.z) + (Math.log(flight.to.z) - Math.log(flight.from.z)) * e);

        if (on && scene) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, w, h);
          ctx.translate(w / 2 - cam.x * cam.z, h / 2 - cam.y * cam.z);
          ctx.scale(cam.z, cam.z);

          const t = (now - modeAt) / 1000;
          const layers = s.mode === 'layers';
          const wire = layers ? easeOut(clamp01((t - 0.6) / 1.6)) : 0;
          const pixel = layers ? easeOut(clamp01((t - 3.4) / 1.2)) : 1;

          if (pixel > 0) {
            ctx.globalAlpha = pixel;
            ctx.drawImage(scene.ground, 0, 0);
            const objs = scene.buildings.map((b) => ({ z: b.foot, draw: () => ctx.drawImage(art, ...atlas[b.n], b.x, b.y, b.w, b.h) }));
            scene.residents.forEach((r, i) => {
              const pos = walkingPosition(r.route, clock, r.speed, r.phase);
              objs.push({ z: pos.y, draw: () => drawCharacter(ctx, chars, i % 10, pos.x, pos.y, pos.dir, !reduced, clock + i * 0.37) });
            });
            if (s.highlight) {
              const hm = scene.home;
              objs.push({ z: hm.y + 0.5, draw: () => {
                const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 280);
                ctx.strokeStyle = `rgba(233,160,138,${0.55 + 0.4 * pulse})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.ellipse(hm.x, hm.y - 1, 9 + 3 * pulse, 4 + 1.4 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#25332640';
                ctx.beginPath(); ctx.ellipse(hm.x, hm.y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
                drawCharacter(ctx, chars, 3, hm.x, hm.y, 0, false, 0, 1.15);
              } });
            }
            objs.sort((a, b) => a.z - b.z);
            for (const o of objs) o.draw();

            if (s.tags) {
              const k = clamp01((t - 0.9) / 0.7);
              scene.near.forEach((idx, j) => {
                const kk = clamp01(k * 1.6 - j * 0.06);
                if (kk <= 0) return;
                const r = scene.residents[idx];
                const pos = walkingPosition(r.route, clock, r.speed, r.phase);
                const burdened = s.tags.burdened.includes(j);
                const y = pos.y - 24 + (reduced ? 0 : Math.sin(now / 240 + j) * 1.2);
                const size = burdened ? 12 : 6;
                ctx.globalAlpha = easeOut(kk) * pixel;
                ctx.fillStyle = '#1b2620';
                ctx.fillRect(pos.x - size / 2 - 1, y - size - 1, size + 2, size + 2);
                ctx.fillStyle = burdened ? '#d9583a' : '#5fae9c';
                ctx.fillRect(pos.x - size / 2, y - size, size, size);
                if (burdened) {
                  ctx.fillStyle = '#fff4e8';
                  ctx.fillRect(pos.x - 1, y - 10, 2, 4);
                  ctx.fillRect(pos.x - 1, y - 4, 2, 2);
                }
              });
            }
            ctx.globalAlpha = 1;
          }

          // OpenStreetMap linework drawn over the satellite, before the pixel art arrives.
          if (layers && wire > 0) {
            const fade = 1 - pixel * 0.85;
            const order = { road: 0, track: 0, park: 1, pitch: 2, water: 2, beach: 1, building: 3 };
            const feats = scene.features.slice().sort((a, b) => order[a.type] - order[b.type]);
            const n = Math.floor(feats.length * wire);
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            for (let i = 0; i < n; i++) {
              const f = feats[i];
              ctx.globalAlpha = fade;
              ctx.beginPath();
              f.points.forEach((pt, k) => (k ? ctx.lineTo(...pt) : ctx.moveTo(...pt)));
              if (f.type === 'road' || f.type === 'track') {
                ctx.strokeStyle = '#ffd36b';
                ctx.lineWidth = 3.2 / Math.max(0.6, cam.z);
                ctx.stroke();
              } else {
                ctx.closePath();
                ctx.fillStyle = f.type === 'building' ? '#ffffff22' : '#7be08b30';
                ctx.fill();
                ctx.strokeStyle = f.type === 'building' ? '#ffffffcc' : '#8ef0a0';
                ctx.lineWidth = 1.6 / Math.max(0.6, cam.z);
                ctx.stroke();
              }
            }
            ctx.globalAlpha = 1;
          }
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [places, reduced]);

  return <canvas ref={ref} className="pixel" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} aria-hidden="true" />;
}
