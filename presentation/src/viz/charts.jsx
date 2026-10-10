import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sprite } from '../actors.jsx';
import { Counter, EASE, money } from '../ui/motion.jsx';

const POP = { type: 'spring', stiffness: 260, damping: 18 };

/** Steps a highlight through rows once (row i every `every` ms after `after`), then clears. */
function useFocusPass(count, { after, every, onFocus }) {
  const reduced = useReducedMotion();
  const [focus, setFocus] = useState(null);
  useEffect(() => {
    if (reduced) return undefined;
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => setFocus(i), after + i * every));
    timers.push(setTimeout(() => setFocus(null), after + count * every));
    return () => timers.forEach(clearTimeout);
  }, [count, after, every, reduced]);
  useEffect(() => { onFocus?.(focus); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  return focus;
}

// ------------------------------------------------------------------ rent over time
/** San Francisco median rent by ACS release, drawn on as a line over the satellite. */
export function RentLine({ points }) {
  const reduced = useReducedMotion();
  const W = 640;
  const H = 300;
  const pad = { l: 58, r: 64, t: 46, b: 46 };
  const lo = 2000;
  const hi = 2600;
  const x = (i) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  return (
    <figure className="viz-card dark" aria-label="San Francisco median gross rent rising from 2021 to 2024">
      <figcaption>San Francisco median rent, per month</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {[2100, 2300, 2500].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#ffffff1c" />
            <text x={W - pad.r} y={y(v) - 6} textAnchor="end" className="tick">{money(v)}</text>
          </g>
        ))}
        <motion.path d={area} fill="#e9a08a" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 0.18 }} transition={{ delay: 1.6, duration: 0.8 }} />
        <motion.path d={line} fill="none" stroke="#e9a08a" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 1.6, ease: EASE }} />
        {points.map((p, i) => (
          <motion.g key={p.year} initial={reduced ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ ...POP, delay: 0.5 + (1.6 * i) / (points.length - 1) }} style={{ originX: `${x(i)}px`, originY: `${y(p.value)}px` }}>
            <circle cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 9 : 6} fill={i === points.length - 1 ? '#fffef2' : '#e9a08a'} stroke="#e9a08a" strokeWidth="3" />
            <text x={x(i)} y={y(p.value) - 18} textAnchor="middle" className={i === points.length - 1 ? 'val big' : 'val'}>{money(p.value)}</text>
            <text x={x(i)} y={H - 16} textAnchor="middle" className="tick">{p.year}</text>
          </motion.g>
        ))}
      </svg>
    </figure>
  );
}

// ------------------------------------------------------------------ ten people
/** Ten residents; the burdened ones carry the same red marker as on the street. */
export function PeopleRow({ share, moe, burdened }) {
  const reduced = useReducedMotion();
  return (
    <div className="people">
      <div className="people-num">
        <b className="hl-rent"><Counter to={share * 100} duration={1.6} delay={0.6} format={(v) => `${v.toFixed(1)}%`} /></b>
        <span>± {(moe * 100).toFixed(1)} pts</span>
      </div>
      <div className="people-row" role="img" aria-label={`About ${Math.round(share * 10)} in 10 renters spend 30% or more of income on rent`}>
        {Array.from({ length: 10 }, (_, i) => {
          const on = burdened.includes(i);
          return (
            <motion.span key={i} className={`person${on ? ' on' : ''}`}
              initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...POP, delay: 0.9 + i * 0.07 }}>
              {on && <motion.i initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP, delay: 1.8 + i * 0.05 }}>!</motion.i>}
              <Sprite char={(i * 3 + 1) % 10} scale={3} />
            </motion.span>
          );
        })}
      </div>
      <p className="people-key"><i /> spends 30% or more of income on rent</p>
    </div>
  );
}

// ------------------------------------------------------------------ five cities
/** Ranked share of renters spending 30%+ on rent, with 90% MOE whiskers. */
export function CityBars({ rows, onFocus, max = 0.6 }) {
  const reduced = useReducedMotion();
  const focus = useFocusPass(rows.length, { after: 2200, every: 1100, onFocus: (f) => onFocus?.(f === null ? null : rows[f].mapIndex) });
  const pct = (v) => `${(v / max) * 100}%`;
  return (
    <div className="bars">
      {rows.map((r, i) => (
        <motion.div key={r.name} className={`bar-row${focus === i ? ' focus' : ''}`}
          initial={reduced ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: EASE }}>
          <span className="bar-name">{r.name}</span>
          <span className="bar-track">
            <motion.i className="fill" style={{ width: pct(r.share30) }} initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6 + i * 0.12, duration: 1.1, ease: EASE }} />
            <motion.i className="fill severe" style={{ width: pct(r.share50) }} initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.85 + i * 0.12, duration: 1.1, ease: EASE }} />
            <motion.i className="whisker" style={{ left: pct(r.share30 - r.moe30), width: pct(2 * r.moe30) }} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 + i * 0.12 }} />
          </span>
          <b className="bar-val"><Counter to={r.share30 * 100} delay={0.6 + i * 0.12} duration={1.1} format={(v) => `${Math.round(v)}%`} /></b>
        </motion.div>
      ))}
      <p className="bars-key"><i className="k1" /> 30%+ of income <i className="k2" /> 50%+ <span>├┤ margin of error</span></p>
    </div>
  );
}

// ------------------------------------------------------------------ rent vs income
const VERDICT = { too_close_to_call: 'too close to call', income_outpaced: 'income grew faster', rent_outpaced: 'rent grew faster' };

/** Rent growth vs renter-income growth since 2021, each with its 90% MOE. */
export function GapDumbbell({ rows, onFocus, max = 0.36 }) {
  const reduced = useReducedMotion();
  const focus = useFocusPass(rows.length, { after: 2600, every: 1100, onFocus: (f) => onFocus?.(f === null ? null : rows[f].mapIndex) });
  const W = 290;
  const X = (v) => (v / max) * W;
  return (
    <div className="dumbbell">
      <div className="db-axis">{[0, 0.1, 0.2, 0.3].map((t) => <span key={t} style={{ left: X(t) }}>{t ? `+${t * 100}%` : '0'}</span>)}</div>
      {rows.map((r, i) => {
        const d = 0.5 + i * 0.14;
        const lo = Math.min(r.rent, r.income);
        const hi = Math.max(r.rent, r.income);
        return (
          <motion.div key={r.name} className={`db-row${focus === i ? ' focus' : ''}`}
            initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d - 0.2 }}>
            <span className="bar-name">{r.name}</span>
            <svg width={W} height={34} aria-hidden="true">
              {[0.1, 0.2, 0.3].map((t) => <line key={t} x1={X(t)} x2={X(t)} y1={0} y2={34} stroke="#505c4f22" />)}
              <motion.line x1={X(lo)} x2={X(hi)} y1={17} y2={17} stroke="#505c4f" strokeWidth="3"
                initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: d + 0.5, duration: 0.6 }} />
              {[['rent', '#c9573c', 11], ['income', '#2f8a73', 23]].map(([k, color, yy]) => (
                <motion.g key={k} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d + 1 }}>
                  <line x1={X(r[k] - r[`${k}Moe`])} x2={X(r[k] + r[`${k}Moe`])} y1={yy} y2={yy} stroke={color} strokeWidth="2" opacity="0.55" />
                </motion.g>
              ))}
              <motion.circle cx={X(r.rent)} cy={17} r={8} fill="#e9a08a" stroke="#a8442d" strokeWidth="2"
                initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP, delay: d }} style={{ originX: `${X(r.rent)}px`, originY: '17px' }} />
              <motion.circle cx={X(r.income)} cy={17} r={8} fill="#80c6bb" stroke="#2f6b55" strokeWidth="2"
                initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP, delay: d + 0.15 }} style={{ originX: `${X(r.income)}px`, originY: '17px' }} />
            </svg>
            <motion.span className={`verdict v-${r.verdict}`} initial={reduced ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: d + 1.2 }}>{VERDICT[r.verdict]}</motion.span>
          </motion.div>
        );
      })}
      <p className="bars-key"><i className="dot rent" /> rent <i className="dot income" /> renters’ income <span>thin lines: margin of error</span></p>
    </div>
  );
}
