import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { buildPlaceScene, layoutBuildings, projection, sceneFeatures, WIDTH, HEIGHT } from '../../../dist/map/places.js';
import { pxPerMeter } from './SatelliteLayer.jsx';
import { walkingPosition } from '../../../dist/map/residents.js';
import atlas from '../../../dist/assets/world-atlas.json';
import artUrl from '../../../dist/assets/world-atlas.png';
import charsUrl from '../../../dist/assets/sprites.png';
import soccerUrl from '../../../dist/assets/places/soccer.png';
import basketballUrl from '../../../dist/assets/places/basketball.png';
import { drawCharacter } from './world.js';
import { backingScale, createCamera } from './camera.js';
import { HOUSEHOLDS, TASHA_INDEX, householdOfWalker, spriteOfWalker } from './households.js';

export const STREET = { w: WIDTH, h: HEIGHT };
const STAGE = { w: 1600, h: 900 };
const easeOut = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
// Chat layout on the stage (px): speech bubbles stay right of the text card and above
// the chat box at the bottom, and never cover each other.
const CHAT_STAGE = { l: 650, r: 1590, t: 24, b: 836 };
const CHAT_BOX = { l: 690, r: 1490, t: 640, b: 860 };
const HEAD = 22; // world px from a walker's feet to the top of its head
const bubbleBox = ([x, y], pad = 0) => ({ l: x - 122 - pad, r: x + 122 + pad, t: y - 192 - pad, b: y + 6 + pad });
const within = (a, o) => a.l >= o.l && a.r <= o.r && a.t >= o.t && a.b <= o.b;
const overlaps = (a, o) => a.l < o.r && o.l < a.r && a.t < o.b && o.t < a.b;

// Smoothstep ramp for the patch's feathered edges.
const RAMP = [[0, 0], [0.25, 0.16], [0.5, 0.5], [0.75, 0.84], [1, 1]];

/** Fades the patch (screen rect x, y, pw, ph) to transparent toward each edge that is on screen. */
function featherPatch(ctx, x, y, pw, ph, w, h, dpr) {
  const f = Math.max(60, Math.min(260, 0.28 * Math.min(pw, ph)));
  const edges = [[x, 0, x + f, 0, x + f > 0], [x + pw, 0, x + pw - f, 0, x + pw - f < w], [0, y, 0, y + f, y + f > 0], [0, y + ph, 0, y + ph - f, y + ph - f < h]];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  for (const [ax, ay, bx, by, onScreen] of edges) {
    if (!onScreen) continue;
    const g = ctx.createLinearGradient(ax, ay, bx, by);
    for (const [at, a] of RAMP) g.addColorStop(at, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
}

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
 * Picks one walker per household (Tasha stands at home), nearest the home first, laid
 * out so no bubble covers another or the chat box. Walkers hidden behind a roof are
 * skipped; spacing relaxes before anyone goes missing.
 * toStage projects world (feet) positions with the camera the slide is heading to.
 */
function pickChat(scene, clock, toStage) {
  const home = toStage(scene.home.x, scene.home.y);
  const taken = [CHAT_BOX, bubbleBox(home)];
  const free = (box) => within(box, CHAT_STAGE) && taken.every((o) => !overlaps(box, o));
  const behindRoof = (p) => scene.buildings.some((b) => p.x > b.x - 4 && p.x < b.x + b.w + 4 && p.y > b.y && p.y < b.foot);
  const walkers = scene.residents
    .map((r, i) => {
      const p = walkingPosition(r.route, clock, r.speed, r.phase);
      const at = toStage(p.x, p.y);
      return { i, at, kind: householdOfWalker(i), d: Math.hypot(at[0] - home[0], at[1] - home[1]), hidden: behindRoof(p) };
    })
    .sort((a, b) => a.d - b.d);
  const speakers = HOUSEHOLDS.map(() => null);
  const kinds = HOUSEHOLDS.map((_, k) => k).filter((k) => k !== TASHA_INDEX);
  // Scarcest household first, so a rare one isn't crowded out.
  const count = (k) => walkers.filter((w) => w.kind === k && !w.hidden && free(bubbleBox(w.at))).length;
  const attempts = [[16, false], [0, false], [0, true], [-24, true], [-70, true]];
  for (const k of kinds.sort((a, b) => count(a) - count(b))) {
    for (const [pad, allowHidden] of attempts) {
      const w = walkers.find((c) => c.kind === k && (allowHidden || !c.hidden) && free(bubbleBox(c.at, pad)));
      if (w) { speakers[k] = w.i; taken.push(bubbleBox(w.at)); break; }
    }
    // Last resort: every household speaks, even if its bubble has to overlap a little.
    if (speakers[k] === null) {
      const w = walkers.find((c) => c.kind === k && within(bubbleBox(c.at), CHAT_STAGE) && !overlaps(bubbleBox(c.at), CHAT_BOX));
      if (w) { speakers[k] = w.i; taken.push(bubbleBox(w.at)); }
    }
  }
  return speakers;
}

/**
 * The app's street scene (dist/map/places.js) for a real San Francisco location, built
 * from snapshotted OpenStreetMap data. Walkers follow mapped routes like in the app.
 * shot: { place, camera: {x, y, z}, mode: 'pixel'|'layers', tags, highlight, follow,
 *         fade: {delay, duration}, fadeOut, chat }
 * chat: ref to a callback that receives, every frame while shot.chat is set, where the
 * four households' speakers are on the stage (null when off).
 * Walkers ease to a stop while the chat is up, as in the app.
 * visible: whether the street should be showing. It cross-fades over the satellite with
 * feathered edges, riding the satellite's camera so the roads stay on the real roads.
 */
export default function StreetWorld({ places, shot, visible, satellite, chat }) {
  const ref = useRef(null);
  const live = useRef({ shot, visible });
  live.current = { shot, visible };
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
      const cam = createCamera({ x: WIDTH / 2, y: HEIGHT / 2, z: 1 });
      let lastShot = null;
      let shown = null; // the place actually drawn; lags the shot while the old one shrinks
      let modeAt = 0;
      let last = performance.now();
      let clock = 0;
      let pace = 1; // walking speed, eased to 0 while the chat is up
      let picks = null;
      // Reveal amount 0..1, driven by a small queue of timed eases.
      let amount = live.current.visible ? 1 : 0;
      let queue = [];
      let wasVisible = live.current.visible;
      const plan = (now, steps) => { queue = steps.map(([delay, to, dur]) => ({ at: now + delay * 1000, to, dur: dur * 1000, from: null })); };

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const { shot: s, visible } = live.current;
        pace = reduced ? (s.chat ? 0 : 1) : pace + ((s.chat ? 0 : 1) - pace) * Math.min(1, dt * 3);
        if (!reduced) clock += dt * pace;
        if (s !== lastShot || visible !== wasVisible) {
          const fade = s.fade ?? { delay: 0, duration: 0.6 };
          if (reduced) { queue = []; amount = visible ? 1 : 0; }
          else if (!visible) plan(now, [[0, 0, 0.75]]);
          else if (shown !== null && s.place !== shown && amount > 0) {
            // Fade the old place out, then fade the new one in at the end of the flight.
            plan(now, [[0, 0, s.fadeOut ?? 0.6], [Math.max(fade.delay, (s.fadeOut ?? 0.6) + 0.1), 1, fade.duration]]);
          } else if (!wasVisible || amount < 1) plan(now, [[fade.delay, 1, fade.duration]]);
          if (s.mode !== lastShot?.mode || s.place !== lastShot?.place) modeAt = now + (s.modeDelay ?? 0);
          if (lastShot === null) { shown = s.place; cam.jump(s.camera); }
          lastShot = s;
          wasVisible = visible;
        }
        while (queue.length && now >= queue[0].at) {
          const q = queue[0];
          if (q.from === null) q.from = amount;
          const p = q.dur ? clamp01((now - q.at) / q.dur) : 1;
          amount = q.from + (q.to - q.from) * easeInOut(p);
          if (p < 1) break;
          queue.shift();
        }
        // Swap scenes only once the old one has fully faded out.
        if (shown !== s.place && amount <= 0.001) { shown = s.place; cam.jump(s.camera); }
        const scene = scenes[shown];
        // While the satellite is in a flight, ride its exact camera so every pixel road
        // sits on the real road underneath; otherwise ease toward the shot.
        const sat = satellite?.current;
        const centerLL = places[shown]?.center;
        if ((s.follow || shown !== s.place) && sat?.map && centerLL) {
          const c = sat.map.getCenter();
          const [fx, fy] = projection(centerLL).toXY([c.lng, c.lat]);
          const target = { x: fx, y: fy, z: pxPerMeter(sat.map.getZoom(), c.lat) / 2 };
          if (sat.moving || reduced) cam.jump(target);
          else cam.step(dt, target);
        } else if (reduced) cam.jump(s.camera);
        else cam.step(dt, s.camera);

        if (amount <= 0.001) {
          if (canvas.dataset.clear !== '1') { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.dataset.clear = '1'; canvas.style.opacity = '0'; }
        } else if (scene) {
          canvas.dataset.clear = '0';
          const dpr = backingScale(canvas);
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
              objs.push({ z: pos.y, draw: () => drawCharacter(ctx, chars, spriteOfWalker(i), pos.x, pos.y, pos.dir, !reduced && pace > 0.05, clock + i * 0.37) });
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

          // The mapped patch dissolves into the satellite toward its edges, so it never
          // reads as a block; the whole layer cross-fades in and out by opacity.
          featherPatch(ctx, w / 2 - cam.x * cam.z, h / 2 - cam.y * cam.z, WIDTH * cam.z, HEIGHT * cam.z, w, h, dpr);
        }
        // Chat overlay feed: speaker heads in stage coordinates.
        const feed = chat?.current;
        if (s.chat && scene && feed) {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const toStage = (x, y) => [w / 2 + (x - cam.x) * cam.z, h / 2 + (y - cam.y) * cam.z];
          // Pick against where the camera is heading, not where it is mid-move.
          picks ??= pickChat(scene, clock, (x, y) => [w / 2 + (x - s.camera.x) * s.camera.z, h / 2 + (y - s.camera.y) * s.camera.z]);
          const head = (i) => {
            const p = walkingPosition(scene.residents[i].route, clock, scene.residents[i].speed, scene.residents[i].phase);
            return toStage(p.x, p.y - HEAD);
          };
          feed({
            amount,
            speakers: picks.map((i, k) => (k === TASHA_INDEX ? toStage(scene.home.x, scene.home.y - HEAD * 1.15) : i === null ? null : head(i))),
          });
        } else if (picks) {
          picks = null;
          feed?.(null);
        }
        const opacity = (amount * (s.mode === 'layers' ? 0.9 : 1)).toFixed(3);
        if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;
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
