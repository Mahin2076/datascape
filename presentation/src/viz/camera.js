// A critically damped spring camera. Position and log-zoom chase the target with
// velocity carried across target changes, so changing slides mid-flight stays smooth
// instead of stopping and restarting.

const STIFFNESS = 7.5; // higher = faster; ~1.6 s to settle at this value

export function createCamera(start) {
  const s = { x: start.x, y: start.y, lz: Math.log(start.z), vx: 0, vy: 0, vlz: 0 };
  return {
    get x() { return s.x; },
    get y() { return s.y; },
    get z() { return Math.exp(s.lz); },
    /** Snap without animation (first frame, reduced motion, scene change). */
    jump(t) {
      s.x = t.x; s.y = t.y; s.lz = Math.log(t.z);
      s.vx = 0; s.vy = 0; s.vlz = 0;
    },
    /** Advance by dt seconds toward target. Sub-stepped for stability on slow frames. */
    step(dt, t, stiffness = STIFFNESS) {
      const k = stiffness;
      const c = 2 * Math.sqrt(k);
      const tlz = Math.log(t.z);
      const steps = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        // Zoom moves in log space; position speed scales with zoom so pans feel even.
        s.vx += (k * (t.x - s.x) - c * s.vx) * h;
        s.vy += (k * (t.y - s.y) - c * s.vy) * h;
        s.vlz += (k * (tlz - s.lz) - c * s.vlz) * h;
        s.x += s.vx * h;
        s.y += s.vy * h;
        s.lz += s.vlz * h;
      }
    },
    /** True once the camera is close to its target and nearly still. */
    settled(t) {
      return Math.hypot(t.x - s.x, t.y - s.y) < 2 && Math.abs(Math.log(t.z) - s.lz) < 0.01 && Math.hypot(s.vx, s.vy) < 4;
    },
  };
}

/** Canvas backing-store scale that matches how large the canvas is actually shown. */
export function backingScale(canvas) {
  const shown = canvas.getBoundingClientRect().width;
  const css = canvas.clientWidth || 1;
  return Math.max(1, Math.min(2, (shown / css) * (window.devicePixelRatio || 1)));
}
