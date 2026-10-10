const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function createCityOverview({ onEnter, onError, reducedMotion = false }) {
  const image = new Image();
  let ready = false, failed = false, active = false, viewport = null;
  const camera = { x: 1072, y: 960, zoom: 1 };
  let target = { ...camera };
  image.onload = () => { ready = true; };
  image.onerror = () => { failed = true; if (active) { active = false; onError(); } };
  image.src = new URL('./assets/sf_tiles.png', import.meta.url).href;
  function open() {
    if (failed) { onError(); return false; }
    active = true; target = { x: 1072, y: 960, zoom: 1 };
    return true;
  }
  function close() { active = false; }
  function enter() {
    if (!ready || !active) return;
    active = false; onEnter();
  }
  function changeZoom(delta) {
    if (!ready) return;
    target.zoom = clamp(target.zoom * (delta > 0 ? 1.4 : 1 / 1.4), 1, 3.4);
    if (target.zoom === 1) target = { x: 1072, y: 960, zoom: 1 };
  }
  function pan(dx, dy) {
    if (!viewport) return;
    target.x = clamp(target.x - dx / viewport.scale, 200, 1944);
    target.y = clamp(target.y - dy / viewport.scale, 200, 1720);
  }
  function draw(ctx, w, h, top, dt) {
    if (!active) return false;
    const usable = Math.max(80, h - top - 64);
    const ease = reducedMotion ? 1 : Math.min(1, dt * 8);
    for (const key of ['x', 'y', 'zoom']) camera[key] += (target[key] - camera[key]) * ease;
    const scale = Math.min(w / 2144, usable / 1920) * camera.zoom;
    const ox = w / 2 - camera.x * scale, oy = top + usable / 2 - camera.y * scale;
    viewport = { scale };
    ctx.save();ctx.beginPath();ctx.rect(0,top,w,usable);ctx.clip();
    ctx.fillStyle = '#215c81';ctx.fillRect(0,top,w,usable);ctx.imageSmoothingEnabled=false;
    if (ready) ctx.drawImage(image,ox,oy,2144*scale,1920*scale);
    else {ctx.fillStyle='#fff3cc';ctx.textAlign='center';ctx.font='14px monospace';ctx.fillText('Loading San Francisco…',w/2,top+usable/2);}
    ctx.restore();return active;
  }
  return {
    open,close,enter,changeZoom,pan,draw,
    get active(){return active;},get ready(){return ready;},
    click(){if(!ready||!active)return false;enter();return true;},
    reset(){target={x:1072,y:960,zoom:1};},
  };
}
