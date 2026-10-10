import { useEffect, useRef } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';

export const EASE = [0.16, 1, 0.3, 1];
export const POP = [0.2, 0.9, 0.3, 1.25];

/** Fade + rise with a slight overshoot (Syro's "pop"), delayed for staggering. */
export function Reveal({ children, delay = 0, y = 24, x = 0, as = 'div', className, style }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      style={style}
      initial={reduced ? false : { opacity: 0, y, x, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay, ease: POP }}
    >
      {children}
    </Tag>
  );
}

/** Number that counts up from `from` to `to` on mount (tabular figures, no layout shift). */
export function Counter({ to, from = 0, duration = 1.6, delay = 0, format = (v) => Math.round(v).toString() }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduced) {
      el.textContent = format(to);
      return undefined;
    }
    el.textContent = format(from);
    const controls = animate(from, to, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (v) => { el.textContent = format(v); },
    });
    return () => controls.stop();
  }, [to, from, duration, delay, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="num">{format(reduced ? to : from)}</span>;
}

/** Text typed out character by character. */
export function Typewriter({ text, delay = 0, speed = 28 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduced) {
      el.textContent = text;
      return undefined;
    }
    el.textContent = '';
    let i = 0;
    let timer = setTimeout(function tick() {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i < text.length) timer = setTimeout(tick, speed);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [text, delay, speed, reduced]);
  return <span ref={ref} aria-label={text} />;
}

export const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
export const pct = (r, d = 1) => `${(r * 100).toFixed(d)}%`;
