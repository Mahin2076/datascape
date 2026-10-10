import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import atlas from '../../../dist/assets/world-atlas.json';
import artUrl from '../../../dist/assets/world-atlas.png';
import charsUrl from '../../../dist/assets/sprites.png';
import data from '../../../dist/assets/data.json';
import { H, ORIGINS, W, buildWorld, drawCharacter, npcPosition, paintGround } from './world.js';

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

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * The DataScape city on a canvas. The camera eases toward `camera` ({x, y, z} in world
 * pixels, or z: 'fit'), like the product's own camera.
 */
export default function PixelWorld({
  camera = { x: W / 2, y: H / 2, z: 'fit' },
  yearIndex = 3,
  signs = 'rent',
  highlight = null,
  ease = 2.4,
  className = '',
}) {
  const ref = useRef(null);
  const props = useRef({ camera, yearIndex, signs, highlight, ease });
  props.current = { camera, yearIndex, signs, highlight, ease };
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
      const cam = { x: W / 2, y: H / 2, z: 0.5, init: false };
      let last = performance.now();
      let clock = 0;
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reduced) clock += dt;
        const { camera: target, yearIndex: yi, signs: mode, highlight: hl, ease: k } = props.current;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const tz = target.z === 'fit' ? Math.min(w / (W + 40), h / (H + 40)) : target.z;
        const a = reduced || !cam.init ? 1 : Math.min(1, dt * k);
        cam.x += (target.x - cam.x) * a;
        cam.y += (target.y - cam.y) * a;
        cam.z += (tz - cam.z) * a;
        cam.init = true;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#68816c';
        ctx.fillRect(0, 0, w, h);
        ctx.translate(Math.round(w / 2 - cam.x * cam.z), Math.round(h / 2 - cam.y * cam.z));
        ctx.scale(cam.z, cam.z);
        ctx.drawImage(ground, 0, 0);

        const objs = world.props.map((p) => ({ z: p.z, draw: () => { const r = atlas[p.n]; ctx.drawImage(art, ...r, p.x, p.y, r[2], r[3]); } }));
        for (const b of world.buildings) {
          objs.push({ z: b.foot, draw: () => {
            const r = atlas[b.n];
            ctx.fillStyle = '#26332a20';
            ctx.fillRect(b.x + 8, b.y + 12, b.w, b.h);
            ctx.drawImage(art, ...r, b.x, b.y, r[2], r[3]);
            if (mode === 'rent') {
              const rent = data.cities[b.city].data[yi].rent;
              ctx.fillStyle = '#202e2aee';
              ctx.fillRect(b.doorX - 37, b.foot - 22, 74, 16);
              ctx.fillStyle = '#e9a08a';
              ctx.font = '10px ui-monospace, monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`${money(rent)}/mo`, b.doorX, b.foot - 10);
            }
          } });
        }
        for (const npc of world.npcs) {
          const p = npcPosition(npc, clock);
          objs.push({ z: p.y, draw: () => drawCharacter(ctx, chars, npc.char, p.x, p.y, p.dir, !reduced, clock + npc.offset) });
        }
        if (hl) {
          objs.push({ z: hl.y + 1, draw: () => {
            const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 260);
            ctx.strokeStyle = `rgba(233,160,138,${0.45 + 0.5 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(hl.x, hl.y - 1, 9 + 3 * pulse, 4 + 1.5 * pulse, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#25332633';
            ctx.beginPath();
            ctx.ellipse(hl.x, hl.y, 7, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            drawCharacter(ctx, chars, hl.char, hl.x, hl.y, 0, false, 0, 1.15);
            ctx.fillStyle = '#fff9d8';
            ctx.beginPath();
            ctx.moveTo(hl.x - 3, hl.y - 27); ctx.lineTo(hl.x + 3, hl.y - 27); ctx.lineTo(hl.x, hl.y - 23);
            ctx.fill();
          } });
        }
        objs.sort((p, q) => p.z - q.z);
        for (const o of objs) o.draw();

        // Moving cars on the main avenue, as in the product.
        for (let i = 0; i < 6; i++) {
          const vx = i % 2 ? 23 : -19;
          const x = (i * 231 + clock * vx + 100000) % 1450 + 40;
          ctx.fillStyle = ['#c9705a', '#4f7d8c', '#d3af65'][i % 3];
          ctx.fillRect(Math.round(x), i % 2 ? 557 : 514, 26, 12);
          ctx.fillStyle = '#ffffff66';
          ctx.fillRect(Math.round(x) + (vx > 0 ? 18 : 3), i % 2 ? 559 : 516, 5, 8);
        }

        if (mode === 'cities') {
          ORIGINS.forEach(([x, y], i) => {
            const c = data.cities[i];
            const rent = c.data[yi].rent;
            ctx.fillStyle = '#202e2af2';
            ctx.fillRect(x + 18, y + 255, 390, 112);
            ctx.strokeStyle = '#e9a08a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 18, y + 255, 390, 112);
            ctx.textAlign = 'left';
            ctx.fillStyle = '#f0efdf';
            ctx.font = 'bold 30px ui-monospace, monospace';
            ctx.fillText(c.name, x + 34, y + 296);
            ctx.font = '20px ui-monospace, monospace';
            ctx.fillStyle = '#e9a08a';
            ctx.fillText(`${money(rent)}/mo median rent`, x + 34, y + 336);
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

  return <canvas ref={ref} className={`pixel ${className}`} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true" />;
}
