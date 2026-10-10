import { motion, useReducedMotion } from 'motion/react';
import { Counter, EASE, POP, pct } from '../ui/motion.jsx';

/**
 * 100 renter households. Cells fill in order (Syro's chunk map): dark coral for 50%+ of
 * income on rent, coral for 30-50%, outline for the rest.
 */
export function BurdenGrid({ share30, share50, delay = 0.2, size = 46, gap = 7 }) {
  const reduced = useReducedMotion();
  const n30 = Math.round(share30 * 100);
  const n50 = Math.round(share50 * 100);
  return (
    <div
      role="img"
      aria-label={`${n30} of every 100 renter households pay 30% or more of income on rent; ${n50} pay half or more.`}
      style={{ display: 'grid', gridTemplateColumns: `repeat(10, ${size}px)`, gap }}
    >
      {Array.from({ length: 100 }, (_, i) => {
        const tone = i < n50 ? 'severe' : i < n30 ? 'burdened' : 'ok';
        const bg = tone === 'severe' ? 'var(--rent-ink)' : tone === 'burdened' ? 'var(--rent)' : 'transparent';
        return (
          <motion.span
            key={i}
            style={{
              width: size, height: size, display: 'block', border: '1px solid',
              borderColor: tone === 'ok' ? '#505c4f55' : 'transparent',
              background: bg,
              boxShadow: tone === 'ok' ? 'none' : '0 0 18px #e9a08a66',
            }}
            initial={reduced ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: delay + (tone === 'ok' ? 0.9 + i * 0.004 : i * 0.022), ease: POP }}
          />
        );
      })}
    </div>
  );
}

/** Horizontal bars with 90% MOE whiskers on a fixed scale. */
export function CityBars({ rows, max = 0.6, delay = 0.3 }) {
  const reduced = useReducedMotion();
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 150px', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>{r.name}</span>
          <div style={{ position: 'relative', height: 40, background: '#505c4f14', border: '1px solid #505c4f55' }}>
            <motion.div
              style={{ position: 'absolute', inset: '0 auto 0 0', background: 'var(--rent)', transformOrigin: 'left', width: `${(r.share30 / max) * 100}%` }}
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, delay: delay + i * 0.14, ease: EASE }}
            />
            <motion.div
              style={{ position: 'absolute', inset: '0 auto 0 0', background: 'var(--rent-ink)', transformOrigin: 'left', width: `${(r.share50 / max) * 100}%` }}
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, delay: delay + 0.25 + i * 0.14, ease: EASE }}
            />
            <motion.div
              aria-hidden="true"
              style={{
                position: 'absolute', top: 10, bottom: 10, borderLeft: '2px solid var(--ink)', borderRight: '2px solid var(--ink)',
                left: `${((r.share30 - r.moe30) / max) * 100}%`, width: `${((2 * r.moe30) / max) * 100}%`,
              }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 1 + i * 0.14 }}
            >
              <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '2px solid var(--ink)' }} />
            </motion.div>
          </div>
          <span style={{ fontSize: 30, fontWeight: 700, textAlign: 'right' }}>
            <Counter to={r.share30 * 100} delay={delay + i * 0.14} format={(v) => `${v.toFixed(1)}%`} />
          </span>
        </div>
      ))}
    </div>
  );
}

const verdictChip = {
  too_close_to_call: { label: 'Too close to call', cls: 'chip ink' },
  income_outpaced: { label: 'Income outpaced rent', cls: 'chip census' },
  rent_outpaced: { label: 'Rent outpaced income', cls: 'chip ai' },
};

/** Rent growth vs renter-income growth 2021→2024 per city, each with its MOE. */
export function GapChart({ rows, max = 0.35, delay = 0.3 }) {
  const reduced = useReducedMotion();
  const bar = (value, moe, color, d) => (
    <div style={{ position: 'relative', height: 18, background: '#505c4f10' }}>
      <motion.div
        style={{ position: 'absolute', inset: '0 auto 0 0', width: `${(value / max) * 100}%`, background: color, transformOrigin: 'left' }}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: d, ease: EASE }}
      />
      <motion.span
        aria-hidden="true"
        style={{
          position: 'absolute', top: 3, bottom: 3, left: `${((value - moe) / max) * 100}%`, width: `${((2 * moe) / max) * 100}%`,
          borderLeft: '2px solid var(--ink)', borderRight: '2px solid var(--ink)',
          background: 'linear-gradient(var(--ink), var(--ink)) center / 100% 2px no-repeat',
        }}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ delay: d + 0.9 }}
      />
    </div>
  );
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {rows.map((r, i) => {
        const d = delay + i * 0.16;
        const v = verdictChip[r.verdict];
        return (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 260px', gap: 24, alignItems: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{r.name}</span>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 10, alignItems: 'center' }}>
                {bar(r.rent, r.rentMoe, 'var(--rent)', d)}
                <span className="num" style={{ fontSize: 16 }}>rent +{pct(r.rent, 0)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 10, alignItems: 'center' }}>
                {bar(r.income, r.incomeMoe, 'var(--income)', d + 0.12)}
                <span className="num" style={{ fontSize: 16 }}>inc. +{pct(r.income, 0)}</span>
              </div>
            </div>
            <motion.span
              className={v.cls}
              style={{ justifySelf: 'start', fontSize: 13 }}
              initial={reduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: d + 1.1, duration: 0.5, ease: POP }}
            >
              {v.label}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}
