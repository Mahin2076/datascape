import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import atlas from '../../../dist/assets/world-atlas.json';
import artUrl from '../../../dist/assets/world-atlas.png';
import charsUrl from '../../../dist/assets/sprites.png';
import data from '../../../dist/assets/data.json';
import { H, ORIGINS, W, buildWorld, drawCharacter, npcPosition, paintGround } from './world.js';

export const STAGE = { w: 1600, h: 900 };
const LAMPS = new Set(['lamp', 'lampMirror', 'streetLight']);
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

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

const fitZoom = () => Math.min(STAGE.w / (W + 40), STAGE.h / (H + 40));
const resolveZ = (z) => (z === 'fit' ? fitZoom() : z);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

/** World -> stage pixel position for a given camera (used to pin DOM actors to the city). */
export function project(camera, wx, wy) {
  const z = resolveZ(camera.z);
  return { x: STAGE.w / 2 + (wx - camera.x) * z, y: STAGE.h / 2 + (wy - camera.y) * z, z };
}

function board(ctx, x, y, w, h) {
  ctx.fillStyle = '#1e2c25f2';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#edede3';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

/**
 * The DataScape city, persistent across the whole deck. Each slide hands it a `shot`;
 * the camera flies there on a timed ease, light and signs cross-fade, and the same
 * residents keep walking the whole time.
 */
export default function PixelWorld({ shot, stats, active = true }) {
  const ref = useRef(null);
  const live = useRef({ shot, stats, active });
  live.current = { shot, stats, active };
  const reduced = useReducedMotion();

  useEffect(() => {
    let raf = 0;
    let alive = true;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    Promise.all([loadImage(artUrl), loadImage(charsUrl)]).then(([art, chars]) => {
      if (!alive) return;
      const world = buildWorld(atlas);
      const ground = paintGround(atlas, art);
      const lamps = world.props.filter((p) => LAMPS.has(p.n));
      const cam = { x: W / 2, y: H / 2, z: fitZoom() };
      const flight = { from: null, to: null, t0: 0, dur: 1 };
      const fade = { signs: 'none', signsAt: 0, tagsKey: '', tagsAt: 0, light: 0 };
      let lastShot = null;
      let last = performance.now();
      let clock = 0;

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reduced) clock += dt;
        const { shot: s, stats } = live.current;

        // Camera flight: timed ease, zoom interpolated in log space.
        if (s !== lastShot) {
          const to = { x: s.camera.x, y: s.camera.y, z: resolveZ(s.camera.z) };
          const dist = Math.hypot(to.x - cam.x, to.y - cam.y);
          const zoomTravel = Math.abs(Math.log(to.z / cam.z));
          flight.from = { ...cam };
          flight.to = to;
          flight.t0 = now;
          flight.dur = lastShot === null || reduced ? 0 : Math.min(2600, Math.max(1100, 900 + dist * 0.9 + zoomTravel * 520));
          if (s.signs !== fade.signs) { fade.signs = s.signs; fade.signsAt = now + flight.dur * 0.6; }
          const tagsKey = JSON.stringify(s.tags ?? null);
          if (tagsKey !== fade.tagsKey) { fade.tagsKey = tagsKey; fade.tagsAt = now + flight.dur * 0.8; }
          lastShot = s;
        }
        const p = flight.dur === 0 ? 1 : clamp01((now - flight.t0) / flight.dur);
        const e = easeInOut(p);
        cam.x = flight.from.x + (flight.to.x - flight.from.x) * e;
        cam.y = flight.from.y + (flight.to.y - flight.from.y) * e;
        cam.z = Math.exp(Math.log(flight.from.z) + (Math.log(flight.to.z) - Math.log(flight.from.z)) * e);
        // Slow drift on wide shots once the camera has arrived, so the city never sits still.
        const settle = clamp01((now - flight.t0 - flight.dur) / 1500);
        const drift = reduced ? 0 : (s.drift ?? 0) * settle;
        const viewX = cam.x + Math.sin((now - flight.t0) / 5200) * drift;
        const viewY = cam.y + Math.cos((now - flight.t0) / 7100) * drift * 0.4;
        fade.light += ((s.light ?? 0) - fade.light) * (reduced ? 1 : Math.min(1, dt * 1.6));
        if (!live.current.active) { raf = requestAnimationFrame(frame); return; }

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#5d775f';
        ctx.fillRect(0, 0, w, h);
        ctx.translate(w / 2 - viewX * cam.z, h / 2 - viewY * cam.z);
        ctx.scale(cam.z, cam.z);
        ctx.drawImage(ground, 0, 0);

        // Depth-sorted city: props, buildings, residents, standing characters.
        const objs = world.props.map((pr) => ({ z: pr.z, draw: () => { const r = atlas[pr.n]; ctx.drawImage(art, ...r, pr.x, pr.y, r[2], r[3]); } }));
        const showRent = s.signs === 'rent';
        for (const b of world.buildings) {
          objs.push({ z: b.foot, draw: () => {
            const r = atlas[b.n];
            ctx.fillStyle = '#26332a20';
            ctx.fillRect(b.x + 8, b.y + 12, b.w, b.h);
            ctx.drawImage(art, ...r, b.x, b.y, r[2], r[3]);
            if (showRent) {
              const rent = data.cities[b.city].data[s.year ?? 3].rent;
              ctx.fillStyle = '#202e2aee';
              ctx.fillRect(b.doorX - 37, b.foot - 22, 74, 16);
              ctx.fillStyle = '#e9a08a';
              ctx.font = `10px ${MONO}`;
              ctx.textAlign = 'center';
              ctx.fillText(`${money(rent)}/mo`, b.doorX, b.foot - 10);
            }
          } });
        }
        const walkers = world.npcs.map((n) => ({ n, pos: npcPosition(n, clock) }));
        for (const { n, pos } of walkers) {
          objs.push({ z: pos.y, draw: () => drawCharacter(ctx, chars, n.char, pos.x, pos.y, pos.dir, !reduced, clock + n.offset) });
        }
        for (const c of s.extras ?? []) {
          const bob = reduced ? 0 : Math.round(Math.sin(now / 320 + c.x) * 0.6);
          objs.push({ z: c.y, draw: () => {
            ctx.fillStyle = '#25332633';
            ctx.beginPath(); ctx.ellipse(c.x, c.y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
            drawCharacter(ctx, chars, c.char, c.x, c.y + bob, c.dir ?? 0, false, 0, 1);
          } });
        }
        const hl = s.highlight;
        if (hl) {
          objs.push({ z: hl.y + 1, draw: () => {
            const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 280);
            ctx.strokeStyle = `rgba(233,160,138,${0.5 + 0.45 * pulse})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(hl.x, hl.y - 1, 9 + 3 * pulse, 4 + 1.4 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#25332640';
            ctx.beginPath(); ctx.ellipse(hl.x, hl.y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
            drawCharacter(ctx, chars, hl.char, hl.x, hl.y, 0, false, 0, 1.15);
          } });
        }
        objs.sort((a, b) => a.z - b.z);
        for (const o of objs) o.draw();

        for (let i = 0; i < 6; i++) {
          const vx = i % 2 ? 23 : -19;
          const x = Math.round((i * 231 + clock * vx + 100000) % 1450 + 40);
          const y = i % 2 ? 557 : 514;
          ctx.fillStyle = ['#c9705a', '#4f7d8c', '#d3af65'][i % 3];
          ctx.fillRect(x, y, 26, 12);
          ctx.fillStyle = '#1b2620';
          ctx.fillRect(x + 4, y + 11, 5, 2); ctx.fillRect(x + 17, y + 11, 5, 2);
          ctx.fillStyle = '#ffffff70';
          ctx.fillRect(x + (vx > 0 ? 17 : 4), y + 2, 5, 7);
        }

        // Evening: darken the city, then let the street lamps glow.
        if (fade.light > 0.01) {
          ctx.fillStyle = `rgba(22, 28, 58, ${0.5 * fade.light})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'lighter';
          for (const l of lamps) {
            const r = atlas[l.n];
            const lx = l.x + r[2] / 2;
            const ly = l.y + 8;
            const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 46);
            g.addColorStop(0, `rgba(255, 200, 120, ${0.55 * fade.light})`);
            g.addColorStop(1, 'rgba(255, 200, 120, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(lx - 46, ly - 46, 92, 92);
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // Tags over residents of one block: the "4 in 10" picture.
        if (s.tags) {
          const t = clamp01((now - fade.tagsAt) / 700);
          const mine = walkers.filter((wk) => wk.n.city === s.tags.city).slice(0, s.tags.count);
          mine.forEach(({ pos }, i) => {
            const k = clamp01(t * 1.6 - i * 0.06);
            if (k <= 0) return;
            const burdened = s.tags.burdened.includes(i);
            const bob = reduced ? 0 : Math.sin(now / 240 + i) * 1.2;
            const y = pos.y - 24 + bob;
            ctx.globalAlpha = easeOut(k);
            const size = burdened ? 12 : 6;
            ctx.fillStyle = '#1b2620';
            ctx.fillRect(pos.x - size / 2 - 1, y - size - 1, size + 2, size + 2);
            ctx.fillStyle = burdened ? '#d9583a' : '#5fae9c';
            ctx.fillRect(pos.x - size / 2, y - size, size, size);
            if (burdened) {
              ctx.fillStyle = '#fff4e8';
              ctx.fillRect(pos.x - 1, y - 10, 2, 4);
              ctx.fillRect(pos.x - 1, y - 4, 2, 2);
            }
            ctx.globalAlpha = 1;
          });
        }

        // Signboards on each city's block.
        if ((s.signs === 'burden' || s.signs === 'growth') && stats) {
          ORIGINS.forEach(([ox, oy], i) => {
            const st = stats[i];
            const k = easeOut(clamp01((now - fade.signsAt - i * 140) / 900));
            if (k <= 0) return;
            const focus = s.focusCity === undefined || s.focusCity === null || s.focusCity === i;
            ctx.globalAlpha = k * (focus ? 1 : 0.82);
            const bx = ox + 14;
            const by = oy + 236 + (1 - k) * 18;
            board(ctx, bx, by, 398, 176);
            ctx.textAlign = 'left';
            ctx.fillStyle = '#f0efdf';
            ctx.font = `bold 26px ${MONO}`;
            ctx.fillText(st.name, bx + 18, by + 38);
            if (s.signs === 'burden') {
              ctx.fillStyle = '#e9a08a';
              ctx.font = `bold 44px ${MONO}`;
              const shown = Math.round(st.burden30 * 100 * k);
              ctx.fillText(`${shown}%`, bx + 18, by + 92);
              ctx.fillStyle = '#d9ded3';
              ctx.font = `15px ${MONO}`;
              ctx.fillText('of renters spend 30%+', bx + 150, by + 74);
              ctx.fillText('of income on rent', bx + 150, by + 94);
              const n = Math.round(st.burden30 * 10);
              for (let j = 0; j < 10; j++) {
                const px = bx + 30 + j * 36;
                const py = by + 150;
                const on = j < n && k > 0.4 + j * 0.05;
                if (on) { ctx.fillStyle = '#c9573c'; ctx.fillRect(px - 13, py - 30, 26, 32); }
                drawCharacter(ctx, chars, (j + i * 3) % 10, px, py, 0, false, 0, 1.6);
              }
            } else {
              const rows = [['Rent', st.rentGrowth, '#e9a08a'], ["Renters' income", st.incomeGrowth, '#80c6bb']];
              rows.forEach(([label, v, color], r) => {
                const y = by + 72 + r * 40;
                ctx.fillStyle = '#d9ded3';
                ctx.font = `15px ${MONO}`;
                ctx.fillText(label, bx + 18, y);
                ctx.fillStyle = '#ffffff1a';
                ctx.fillRect(bx + 18, y + 8, 250, 12);
                ctx.fillStyle = color;
                ctx.fillRect(bx + 18, y + 8, 250 * Math.min(1, v / 0.3) * k, 12);
                ctx.fillStyle = '#f0efdf';
                ctx.font = `bold 18px ${MONO}`;
                ctx.fillText(`+${Math.round(v * 100)}%`, bx + 282, y + 20);
              });
              ctx.fillStyle = st.verdict === 'income_outpaced' ? '#80c6bb' : '#d3af65';
              ctx.font = `bold 15px ${MONO}`;
              ctx.fillText(st.verdict === 'income_outpaced' ? 'Incomes grew faster' : st.verdict === 'rent_outpaced' ? 'Rent grew faster' : 'Too close to call', bx + 18, by + 164);
            }
            ctx.globalAlpha = 1;
          });
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return <canvas ref={ref} className="pixel" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} aria-hidden="true" />;
}
