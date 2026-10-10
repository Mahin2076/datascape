const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
// Coordinates are an illustrative entry point in the artwork, not a geocoded home.
const ENTRY = { x: 1230, y: 1020 };
export function createCityOverview({ onEnter, onError, reducedMotion = false }) {
  const image = new Image();
  let ready = false, failed = false, active = false, entering = false;
  let camera = { x: 1072, y: 960, zoom: 1 }, target = { ...camera };
  let viewport = null, fade = 0;
  image.onload = () => { ready = true; };
  image.onerror = () => { failed = true; if (active) { active = false; onError(); } };
  image.src = new URL('./assets/sf_tiles.png', import.meta.url).href;
  function open() {
    if (failed) { onError(); return false; }
    active = true; entering = false; fade = 0; target = { x: 1072, y: 960, zoom: 1 };
    return true;
  }
  function close({ preserveFade = false } = {}) { active = false; entering = false; if (!preserveFade) fade = 0; }
  function enter() {
    if (!ready || entering) return;
    entering = true; target = { ...ENTRY, zoom: 4.5 };
  }
  function changeZoom(delta) {
    if (!ready) return;
    if (delta > 0 && target.zoom >= 2.6) { enter(); return; }
    entering = false;
    target.zoom = clamp(target.zoom * (delta > 0 ? 1.4 : 1 / 1.4), 1, 3.4);
    if (target.zoom === 1) target = { x: 1072, y: 960, zoom: 1 };
    else if (delta > 0) { target.x = ENTRY.x; target.y = ENTRY.y; }
  }
  function pan(dx, dy) {
    if (!viewport || entering) return;
    target.x = clamp(target.x - dx / viewport.scale, 200, 1944);
    target.y = clamp(target.y - dy / viewport.scale, 200, 1720);
  }
  function hit(x, y) {
    return viewport && Math.hypot(x - viewport.pinX, y - viewport.pinY) < 48;
  }
  function draw(ctx, w, h, top, dt, now) {
    if (!active && fade <= 0) return false;
    const bottom = 64, usable = Math.max(80, h - top - bottom);
    const ease = reducedMotion ? 1 : Math.min(1, dt * 8);
    for (const key of ['x', 'y', 'zoom']) camera[key] += (target[key] - camera[key]) * ease;
    const scale = Math.min(w / 2144, usable / 1920) * camera.zoom;
    const ox = w / 2 - camera.x * scale, oy = top + usable / 2 - camera.y * scale;
    viewport = { scale, pinX: ox + ENTRY.x * scale, pinY: oy + ENTRY.y * scale };
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top, w, usable); ctx.clip();
    if (!active) { fade = Math.max(0, fade - dt * 3); ctx.globalAlpha = reducedMotion ? 0 : fade; }
    ctx.fillStyle = '#215c81'; ctx.fillRect(0, top, w, usable);
    ctx.imageSmoothingEnabled = false;
    if (ready) ctx.drawImage(image, ox, oy, 2144 * scale, 1920 * scale);
    if (ready && !entering) {
      const x = viewport.pinX, y = viewport.pinY;
      ctx.fillStyle = '#f4d893'; ctx.strokeStyle = '#213e36'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 20 + (reducedMotion ? 0 : Math.sin(now / 600) * 3), 0, Math.PI * 2); ctx.stroke();
      const boxW = 186, bx = clamp(x - boxW / 2, 8, w - boxW - 8), by = clamp(y + 29, top + 8, h - bottom - 48);
      ctx.fillStyle = '#203a31'; ctx.fillRect(bx, by, boxW, 39);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff3cc'; ctx.font = 'bold 11px monospace';
      ctx.fillText('EXPLORE A STREET ↗', bx + boxW / 2, by + 16);
      ctx.font = '9px monospace'; ctx.fillStyle = '#cbdac9'; ctx.fillText('Illustrative neighborhood', bx + boxW / 2, by + 30);
      viewport.label = { x: bx, y: by, w: boxW, h: 39 };
    }
    if (!ready) { ctx.fillStyle = '#fff3cc'; ctx.textAlign = 'center'; ctx.font = '14px monospace'; ctx.fillText('Loading San Francisco…', w / 2, top + usable / 2); }
    ctx.restore();
    if (entering && Math.abs(camera.zoom - target.zoom) < .08) {
      active = false; entering = false; fade = reducedMotion ? 0 : 1;
      onEnter();
    }
    return active;
  }
  return {
    open, close, enter, changeZoom, pan, draw,
    get active() { return active; },
    get ready() { return ready; },
    click(x, y) { const b = viewport?.label; if (hit(x, y) || (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)) { enter(); return true; } return false; },
    reset() { entering = false; target = { x: 1072, y: 960, zoom: 1 }; },
  };
}
