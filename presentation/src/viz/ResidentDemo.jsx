import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import data from '../../../dist/assets/data.json';
import { Counter, EASE, POP, Typewriter, money, pct } from '../ui/motion.jsx';

// Tasha, from the resident-stories fixture: rent = 1.1 x SF median gross rent, income =
// 0.7 x SF median household income, ACS 2020–2024 (dist/assets/data.json). The budget math
// is the plan's calculateBudget contract; the reaction is the scripted rule set.
const sf = data.cities.find((c) => c.id === 'sf');
const latest = sf.data[sf.data.length - 1];
const RENT = Math.round(latest.rent * 1.1);
const INCOME_M = Math.round((latest.income * 0.7) / 12);
const RENT_AFTER = Math.round(RENT * 1.1);
const BEFORE = { rent: RENT, left: INCOME_M - RENT, ratio: RENT / INCOME_M };
const AFTER = { rent: RENT_AFTER, left: INCOME_M - RENT_AFTER, ratio: RENT_AFTER / INCOME_M };
const LOSS = BEFORE.left - AFTER.left;

const PRESETS = ['No change', 'Rent +10%', 'Income +5%'];

function Row({ label, before, after, applied, delay, warn }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px dashed var(--hair)' }}>
      <span style={{ color: 'var(--ink-2)', fontSize: 16 }}>{label}</span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        {applied && <span style={{ color: 'var(--ink-3)', textDecoration: 'line-through', fontSize: 15 }}>{before.text}</span>}
        {applied && <span style={{ color: 'var(--ink-3)' }}>→</span>}
        <strong style={{ fontSize: 22, color: applied && warn ? 'var(--rent-ink)' : 'var(--ink)' }}>
          {applied ? <Counter from={before.value} to={after.value} delay={delay} duration={1} format={after.format} /> : before.text}
        </strong>
      </span>
    </div>
  );
}

/** The resident panel, auto-playing "Rent +10%" for Tasha. */
export default function ResidentDemo({ startAt = 1.6 }) {
  const reduced = useReducedMotion();
  const [applied, setApplied] = useState(reduced);
  useEffect(() => {
    if (reduced) return undefined;
    const t = setTimeout(() => setApplied(true), startAt * 1000);
    return () => clearTimeout(t);
  }, [reduced, startAt]);
  const ratio = applied ? AFTER.ratio : BEFORE.ratio;

  return (
    <motion.aside
      className="glass"
      style={{ width: 560, background: 'var(--paper-2)' }}
      initial={reduced ? false : { opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: POP, delay: 0.2 }}
      aria-label="Resident profile demo"
    >
      <header style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--hair)', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, letterSpacing: '0.12em', color: 'var(--ink-2)' }}>
          <span className="chip illustrative" style={{ fontSize: 10 }}>Illustrative resident</span> SAN FRANCISCO
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 8 }}>Tasha</div>
        <div className="small">Small bakery owner · 40s · Parent and teenager · The Corner Residence · 9 years here</div>
      </header>
      <section style={{ padding: '14px 22px', borderBottom: '1px solid var(--hair)' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map((p, i) => {
            const pressed = (i === 1 && applied) || (i === 0 && !applied);
            return (
              <span key={p} style={{ position: 'relative', padding: '7px 11px', fontSize: 14, border: '1px solid var(--line)', background: pressed ? 'var(--ink)' : 'var(--card)', color: pressed ? 'var(--card)' : 'var(--ink)', transition: 'transform .15s' }}>
                {p}
                {i === 1 && !reduced && (
                  <motion.span
                    aria-hidden="true"
                    style={{ position: 'absolute', right: -14, bottom: -18, fontSize: 26 }}
                    initial={{ opacity: 0, x: 60, y: 40 }}
                    animate={{ opacity: [0, 1, 1, 0], x: [60, 0, 0, 0], y: [40, 0, 0, 0], scale: [1, 1, 0.85, 1] }}
                    transition={{ duration: 1.6, delay: startAt - 1, times: [0, 0.55, 0.7, 1], ease: EASE }}
                  >
                    ⬉
                  </motion.span>
                )}
              </span>
            );
          })}
        </div>
      </section>
      <section style={{ padding: '14px 22px', borderBottom: '1px solid var(--hair)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, letterSpacing: '0.14em', fontWeight: 700 }}>
          MONTHLY BUDGET <span className="chip illustrative" style={{ fontSize: 10 }}>Illustrative household</span>
        </div>
        <Row label="Income" before={{ text: money(INCOME_M), value: INCOME_M }} after={{ value: INCOME_M, format: money }} applied={applied} delay={0} />
        <Row label="Rent" before={{ text: money(BEFORE.rent), value: BEFORE.rent }} after={{ value: AFTER.rent, format: money }} applied={applied} delay={0.1} />
        <Row label="Left after rent" before={{ text: money(BEFORE.left), value: BEFORE.left }} after={{ value: AFTER.left, format: money }} applied={applied} delay={0.2} />
        <Row label="Rent share of income" before={{ text: pct(BEFORE.ratio), value: BEFORE.ratio }} after={{ value: AFTER.ratio, format: (v) => pct(v) }} applied={applied} delay={0.3} warn />
        <div style={{ position: 'relative', height: 14, marginTop: 14, background: '#cfe4d9', border: '1px solid var(--line)' }}>
          <motion.div
            style={{ position: 'absolute', inset: '0 auto 0 0', background: ratio >= 0.3 ? 'var(--rent-ink)' : 'var(--income-ink)' }}
            animate={{ width: `${ratio * 100}%` }}
            initial={false}
            transition={{ duration: 0.9, ease: EASE }}
          />
          <span style={{ position: 'absolute', left: '30%', top: -5, bottom: -5, width: 2, background: 'var(--ink)' }} title="30% cost-burden line" />
        </div>
        <AnimatePresence>
          {applied && (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ marginTop: 10, fontWeight: 700, fontSize: 15 }}>
              {money(LOSS)} less left after rent each month than the 2024 baseline.
            </motion.p>
          )}
        </AnimatePresence>
      </section>
      <section style={{ padding: '14px 22px 18px', minHeight: 196 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, letterSpacing: '0.14em', fontWeight: 700 }}>
          REACTION <span className="chip scripted" style={{ fontSize: 10 }}>Scripted · not live AI</span>
        </div>
        {applied ? (
          <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--rent-ink)', marginTop: 10 }}>Tightening the budget</div>
            <blockquote style={{ margin: '10px 0 0', padding: '10px 12px', borderLeft: '3px solid var(--line)', background: 'var(--card)', fontStyle: 'italic', fontSize: 17, minHeight: 50 }}>
              “<Typewriter text="We’d make it work, but the kids would notice the cutbacks." delay={1.3} />”
            </blockquote>
            <motion.p className="small" style={{ marginTop: 10 }} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 }}>
              Why: rent would take {pct(AFTER.ratio)} of income (30% is the cost-burden line), and {money(LOSS)} less is left after rent each month.
            </motion.p>
          </motion.div>
        ) : (
          <p className="small" style={{ marginTop: 10 }}>Rent takes {pct(BEFORE.ratio, 0)} of what we bring in. Try a scenario.</p>
        )}
      </section>
    </motion.aside>
  );
}

export const TASHA = { RENT, INCOME_M, BEFORE, AFTER, LOSS, period: latest.period };
