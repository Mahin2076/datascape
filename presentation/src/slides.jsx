import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import data from '../../dist/assets/data.json';
import facts from './data/facts.json';
import PixelWorld from './viz/PixelWorld.jsx';
import { BurdenGrid, CityBars, GapChart } from './viz/charts.jsx';
import FlowDiagram from './viz/FlowDiagram.jsx';
import ResidentDemo, { TASHA } from './viz/ResidentDemo.jsx';
import { Counter, POP, Reveal, money, pct } from './ui/motion.jsx';

const C = facts.cities;
const SF = C.sf;
const ORDER = ['nyc', 'chicago', 'austin', 'seattle', 'sf'];
const TASHA_SPOT = { x: 368, y: 486, char: 3 };

function Eyebrow({ children, dot = true }) {
  return <span className="eyebrow">{dot && <i className="dot" />}{children}</span>;
}

function Source({ children, href }) {
  return (
    <p className="source">
      {children}{' '}
      {href && <a href={href} target="_blank" rel="noopener noreferrer">Census file ↗</a>}
    </p>
  );
}

/** Cycles 0..n-1 every `ms`, or stays at `n-1` with reduced motion. */
function useCycle(n, ms) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(reduced ? n - 1 : 0);
  useEffect(() => {
    if (reduced) return undefined;
    const t = setInterval(() => setI((v) => (v + 1) % n), ms);
    return () => clearInterval(t);
  }, [n, ms, reduced]);
  return i;
}

/** Runs a timed sequence of steps once: returns the current step index. */
function useSequence(times) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(reduced ? times.length : 0);
  useEffect(() => {
    if (reduced) return undefined;
    const timers = times.map((t, k) => setTimeout(() => setI(k + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return i;
}

// ---------------------------------------------------------------- 1 · cover
function Cover() {
  const year = useCycle(4, 1500);
  const row = data.cities[0].data[year];
  return (
    <>
      <div style={{ position: 'absolute', inset: 0 }}>
        <PixelWorld camera={{ x: 300, y: 330, z: 2.3 }} yearIndex={year} signs="rent" highlight={TASHA_SPOT} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #263d34ee 0%, #263d34aa 38%, #263d3400 70%)' }} />
      <div className="slide" style={{ justifyContent: 'flex-end', color: 'var(--paper)' }}>
        <Reveal delay={0.1}><Eyebrow>DataScape · housing · hackathon</Eyebrow></Reveal>
        <Reveal delay={0.25}><h1 className="display" style={{ fontSize: 132, marginTop: 22 }}>Can you afford<br />to stay?</h1></Reveal>
        <Reveal delay={0.45}>
          <p className="lede" style={{ marginTop: 26, maxWidth: 760, color: '#e7ece0' }}>
            Walk a city built on real Census rent data. Meet the people living the numbers.
            Push rent up 10% and see who makes it.
          </p>
        </Reveal>
        <Reveal delay={0.65} style={{ display: 'flex', gap: 10, marginTop: 30 }}>
          <span className="chip census">Census statistics</span>
          <span className="chip illustrative">Illustrative households</span>
          <span className="chip scripted">Labeled reactions</span>
        </Reveal>
      </div>
      <motion.div
        className="glass"
        style={{ position: 'absolute', top: 40, right: 40, padding: '14px 18px', zIndex: 2 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, ease: POP }}
      >
        <div className="eyebrow" style={{ fontSize: 11 }}>San Francisco · median gross rent</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
          <motion.b key={row.year} className="num" style={{ fontSize: 40, letterSpacing: '-0.04em' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {money(row.rent)}
          </motion.b>
          <span className="small num">ACS {row.period}</span>
        </div>
      </motion.div>
    </>
  );
}

// ---------------------------------------------------------------- 2 · the squeeze
function Squeeze() {
  return (
    <div className="slide" style={{ flexDirection: 'row', alignItems: 'center', gap: 80 }}>
      <div style={{ flex: 1 }}>
        <Reveal><Eyebrow>The squeeze · San Francisco</Eyebrow></Reveal>
        <Reveal delay={0.15}>
          <div className="display hl-rent" style={{ fontSize: 210, marginTop: 18, letterSpacing: '-0.07em' }}>
            <Counter to={SF.burden30 * 100} duration={1.8} delay={0.3} format={(v) => `${v.toFixed(1)}%`} />
          </div>
        </Reveal>
        <Reveal delay={0.4}>
          <p className="h2" style={{ maxWidth: 640, marginTop: 10 }}>of renter households spend <span className="hl-rent">30% or more</span> of their income on rent.</p>
        </Reveal>
        <Reveal delay={0.7}>
          <p className="lede" style={{ marginTop: 22 }}>
            <b className="hl-rent num">{pct(SF.burden50)}</b> spend half or more. That’s the 2024 Census, not a model.
          </p>
        </Reveal>
        <Reveal delay={0.9} style={{ marginTop: 34 }}>
          <Source href={SF.sources.B25070}>
            U.S. Census Bureau, ACS 2024 1-year, table B25070, San Francisco city. ±{(SF.burden30Moe * 100).toFixed(1)} pts at 90% confidence.
          </Source>
        </Reveal>
      </div>
      <div>
        <BurdenGrid share30={SF.burden30} share50={SF.burden50} delay={0.4} />
        <Reveal delay={2.4} style={{ display: 'flex', gap: 22, marginTop: 18, fontSize: 14 }}>
          <span><i style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--rent-ink)', marginRight: 8 }} />50%+ of income</span>
          <span><i style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--rent)', marginRight: 8 }} />30–50%</span>
          <span><i style={{ display: 'inline-block', width: 12, height: 12, border: '1px solid #505c4f88', marginRight: 8 }} />under 30%</span>
        </Reveal>
        <Reveal delay={2.6}><p className="small" style={{ marginTop: 6 }}>Each square is one in a hundred renter households.</p></Reveal>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 3 · five cities
function Cities() {
  const rows = ORDER.map((id) => ({ id, name: C[id].name, share30: C[id].burden30, share50: C[id].burden50, moe30: C[id].burden30Moe }));
  return (
    <div className="slide">
      <Reveal><Eyebrow>Five cities · 2024</Eyebrow></Reveal>
      <Reveal delay={0.1}><h2 className="h1" style={{ marginTop: 16 }}>It’s not just San Francisco.</h2></Reveal>
      <Reveal delay={0.2}><p className="lede" style={{ marginTop: 16 }}>In every city we cover, <b>4 to 5 in 10</b> renter households are cost-burdened.</p></Reveal>
      <div style={{ marginTop: 44 }}><CityBars rows={rows} delay={0.4} /></div>
      <Reveal delay={1.8} style={{ display: 'flex', gap: 26, marginTop: 30, alignItems: 'center', fontSize: 14 }}>
        <span><i style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--rent)', marginRight: 8 }} />30%+ of income on rent</span>
        <span><i style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--rent-ink)', marginRight: 8 }} />50%+</span>
        <span>├─┤ 90% margin of error</span>
        <span style={{ flex: 1 }} />
        <Source>ACS 2024 1-year, B25070, city (place) geography.</Source>
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------- 4 · the honest trend
function Trend() {
  const rows = ['sf', 'nyc', 'austin', 'chicago', 'seattle'].map((id) => ({
    id, name: C[id].name, rent: C[id].growth.rent, rentMoe: C[id].growth.rentMoe,
    income: C[id].growth.renterIncome, incomeMoe: C[id].growth.renterIncomeMoe, verdict: C[id].growth.verdict,
  }));
  return (
    <div className="slide">
      <Reveal><Eyebrow>Plot twist · 2021 → 2024</Eyebrow></Reveal>
      <Reveal delay={0.1}><h2 className="h1" style={{ marginTop: 16, maxWidth: 1300 }}>Is rent outpacing income? <span className="hl-income">Mostly too close to call.</span></h2></Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 60, marginTop: 44, alignItems: 'start' }}>
        <GapChart rows={rows} delay={0.4} />
        <Reveal delay={1.6} className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 19, lineHeight: 1.5 }}>
            Compared with <b>renter</b> income, rent didn’t clearly pull ahead anywhere. In New York, renter income grew faster.
          </p>
          <p style={{ fontSize: 19, lineHeight: 1.5, marginTop: 14 }}>
            So we don’t sell a trend. We show the squeeze people are in <b>today</b>, and let you test what comes next.
          </p>
        </Reveal>
      </div>
      <Reveal delay={2} style={{ marginTop: 'auto' }}>
        <Source>ACS 1-year, B25064 median gross rent and B25119 median renter household income, 2021 vs 2024. Whiskers are 90% MOE; “too close to call” means the gap is inside it.</Source>
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------- 5 · what we built
const SHOTS = [
  { at: 0, camera: { x: 768, y: 576, z: 'fit' }, signs: 'cities' },
  { at: 2600, camera: { x: 256, y: 300, z: 1.55 }, signs: 'rent' },
  { at: 5600, camera: { x: TASHA_SPOT.x, y: TASHA_SPOT.y - 20, z: 4.2 }, signs: 'rent' },
];
function Built() {
  const step = useSequence(SHOTS.slice(1).map((s) => s.at));
  const shot = SHOTS[Math.min(step, SHOTS.length - 1)];
  const items = [
    ['01', 'City overview', 'Real medians on every block.'],
    ['02', 'Zoom into a neighborhood', 'Walk the street, inspect buildings.'],
    ['03', 'Click a resident', 'Their budget, their reaction, their why.'],
  ];
  return (
    <>
      <div style={{ position: 'absolute', inset: 0 }}>
        <PixelWorld camera={shot.camera} signs={shot.signs} yearIndex={3} highlight={step >= 2 ? TASHA_SPOT : null} ease={1.6} />
      </div>
      <div className="slide" style={{ pointerEvents: 'none' }}>
        <Reveal className="glass" style={{ padding: '22px 26px', width: 520 }}>
          <Eyebrow>What we built</Eyebrow>
          <h2 className="h2" style={{ marginTop: 12 }}>From the skyline to one household.</h2>
          <div style={{ display: 'grid', gap: 2, marginTop: 18 }}>
            {items.map(([n, t, d], i) => {
              const active = Math.min(step, 2) === i;
              return (
                <motion.div
                  key={n}
                  animate={{ opacity: active ? 1 : 0.45, x: active ? 6 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ display: 'grid', gridTemplateColumns: '44px 1fr', padding: '10px 0', borderTop: '1px solid var(--hair)' }}
                >
                  <span className="num" style={{ color: active ? 'var(--rent-ink)' : 'var(--ink-3)', fontWeight: 700 }}>{n}</span>
                  <span><b style={{ fontSize: 19 }}>{t}</b><br /><span className="small">{d}</span></span>
                </motion.div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- 6 · meet Tasha
function Tasha() {
  return (
    <div className="slide" style={{ flexDirection: 'row', alignItems: 'center', gap: 70 }}>
      <div style={{ flex: 1 }}>
        <Reveal><Eyebrow>Meet a resident</Eyebrow></Reveal>
        <Reveal delay={0.1}><h2 className="h1" style={{ marginTop: 16 }}>Rent goes up 10%.<br />What happens to Tasha?</h2></Reveal>
        <Reveal delay={0.3}>
          <p className="lede" style={{ marginTop: 22 }}>
            Her rent is <b>1.1×</b> and her income <b>0.7×</b> San Francisco’s Census medians (ACS {TASHA.period}).
            The budget math is deterministic. The reaction is scripted, and says so.
          </p>
        </Reveal>
        <Reveal delay={0.5} className="hairgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 34, maxWidth: 640 }}>
          {[
            ['Rent / month', `+${money(TASHA.AFTER.rent - TASHA.BEFORE.rent)}`, ''],
            ['Left after rent', `−${money(TASHA.LOSS)}`, 'hl-rent'],
            ['Rent share of income', pct(TASHA.AFTER.ratio), 'hl-rent'],
          ].map(([label, value, cls]) => (
            <div key={label} style={{ padding: '14px 16px' }}>
              <div className="eyebrow" style={{ fontSize: 11, display: 'block' }}>{label}</div>
              <b className={`num ${cls}`} style={{ fontSize: 32, display: 'block', marginTop: 8, letterSpacing: '-0.03em' }}>{value}</b>
            </div>
          ))}
        </Reveal>
      </div>
      <ResidentDemo startAt={1.8} />
    </div>
  );
}

// ---------------------------------------------------------------- 7 · honest by design
function Honest() {
  const cards = [
    ['census', 'Census statistic', 'Published ACS medians with margins of error and a link to the exact Census file.'],
    ['illustrative', 'Illustrative household', 'Fictional people. Rent and income are stated multiples of the city median, so the assumption is on screen.'],
    ['scripted', 'Scripted or AI reaction', 'Rule-based by default. If a live model writes the quote, it can’t change the numbers or the why.'],
  ];
  return (
    <div className="slide">
      <Reveal><Eyebrow>Honest by design</Eyebrow></Reveal>
      <Reveal delay={0.1}><h2 className="h1" style={{ marginTop: 16 }}>Every number wears a label.</h2></Reveal>
      <div className="hairgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 50 }}>
        {cards.map(([cls, title, body], i) => (
          <Reveal key={cls} delay={0.35 + i * 0.18} style={{ padding: '34px 30px 40px', minHeight: 300 }}>
            <motion.span
              className={`chip ${cls}`}
              style={{ fontSize: 14 }}
              initial={{ scale: 0.6, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.55 + i * 0.18, ease: POP, duration: 0.6 }}
            >
              {title}
            </motion.span>
            <p style={{ fontSize: 22, lineHeight: 1.45, marginTop: 70, letterSpacing: '-0.01em' }}>{body}</p>
          </Reveal>
        ))}
      </div>
      <Reveal delay={1.3}>
        <p className="lede" style={{ marginTop: 40 }}>
          A fictional building is not a listing. A city median is not a neighborhood. A generated response is not testimony.
        </p>
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------- 8 · how it works
function How() {
  const owners = [
    { name: 'Teammate 2', branch: 'feature/housing-data', x: 330, w: 220, color: 'var(--income)' },
    { name: 'Teammate 1', branch: 'feature/resident-stories', x: 620, w: 220, color: 'var(--gold)' },
    { name: 'Mahin', branch: 'feature/map-zoom', x: 910, w: 220, color: 'var(--rent)' },
  ];
  return (
    <div className="slide">
      <Reveal><Eyebrow>How it works</Eyebrow></Reveal>
      <Reveal delay={0.1}><h2 className="h1" style={{ marginTop: 16 }}>Three branches, one flow.</h2></Reveal>
      <div style={{ marginTop: 90 }}><FlowDiagram owners={owners} /></div>
      <Reveal delay={2} style={{ marginTop: 'auto' }}>
        <code className="card" style={{ display: 'inline-block', padding: '12px 16px', fontSize: 17 }}>
          {'selection = { cityId, year, scenario: { rentChangePct, incomeChangePct } }'}
        </code>
        <p className="small" style={{ marginTop: 10 }}>One shared contract keeps the map, the numbers and the residents in sync. No API keys in the browser.</p>
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------- 9 · next
function Next() {
  const items = [
    ['Sourced research', 'Cala context with citations, once we verify it covers housing. The core demo never depends on it.'],
    ['Live AI reactions', 'Labeled as AI. The stance, the numbers and the why stay calculated.'],
    ['Neighborhood data', 'Rent burden by neighborhood (PUMA) with replicate-weight margins of error.'],
    ['More cities and years', 'Every scenario stays tied to the ACS period it came from.'],
  ];
  return (
    <div className="slide">
      <Reveal><Eyebrow>Next</Eyebrow></Reveal>
      <Reveal delay={0.1}><h2 className="h1" style={{ marginTop: 16 }}>What we’re adding.</h2></Reveal>
      <div className="hairgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 56 }}>
        {items.map(([t, d], i) => (
          <Reveal key={t} delay={0.3 + i * 0.15} style={{ padding: '30px 26px 36px', minHeight: 360, position: 'relative' }}>
            <span className="num" style={{ color: 'var(--ink-3)', fontWeight: 700 }}>0{i + 1}</span>
            <motion.span
              style={{ position: 'absolute', left: 26, top: 66, width: 34, height: 4, background: ['var(--rent)', 'var(--gold)', 'var(--income)', 'var(--rent-ink)'][i], transformOrigin: 'left' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6 + i * 0.15, duration: 0.6 }}
            />
            <h3 style={{ fontSize: 28, letterSpacing: '-0.03em', marginTop: 84 }}>{t}</h3>
            <p style={{ fontSize: 18, lineHeight: 1.5, marginTop: 14, color: 'var(--ink-2)' }}>{d}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 10 · close
function Close() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0 }}>
        <PixelWorld camera={{ x: 768, y: 576, z: 0.9 }} signs="rent" yearIndex={3} ease={0.6} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #263d34dd 0%, #263d34f2 70%)' }} />
      <div className="slide" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--paper)' }}>
        <Reveal><Eyebrow>Thank you</Eyebrow></Reveal>
        <Reveal delay={0.15}><h2 className="display" style={{ fontSize: 140, marginTop: 24 }}>Can you afford<br />to stay?</h2></Reveal>
        <Reveal delay={0.4}><p className="lede" style={{ marginTop: 26, color: '#e7ece0' }}>Open the city. Pick a resident. Push rent up 10%.</p></Reveal>
        <Reveal delay={0.7} style={{ marginTop: 60 }}>
          <p className="source" style={{ color: '#aab3a4', maxWidth: 1100 }}>
            Data: U.S. Census Bureau, American Community Survey. City art: Modern Exteriors by LimeZu.
            Characters: route1rodent / javikolog, CC BY-SA 3.0. Residents are fictional.
          </p>
        </Reveal>
      </div>
    </>
  );
}

export const SLIDES = [
  { id: 'cover', title: 'Can you afford to stay?', dark: true, Component: Cover,
    notes: 'Open on the product itself: this is DataScape’s real city, with real ACS median rents over each building cycling 2021 to 2024. One line: we built a city you can walk through, where the numbers are real and the people are clearly labeled as illustrative.' },
  { id: 'squeeze', title: 'The squeeze', Component: Squeeze,
    notes: `Let the grid fill. ${pct(SF.burden30)} of San Francisco renter households pay 30%+ of income on rent; ${pct(SF.burden50)} pay half or more. This is the 2024 ACS 1-year table B25070, not our model. Margin of error ±${(SF.burden30Moe * 100).toFixed(1)} points.` },
  { id: 'cities', title: 'Five cities', Component: Cities,
    notes: 'San Francisco actually has the LOWEST share of the five, because SF renter incomes are high. New York is over half. Point at the whiskers: we always show the margin of error.' },
  { id: 'trend', title: 'The honest trend', Component: Trend,
    notes: 'This is the credibility moment. The easy pitch is “rent is outpacing income everywhere.” With non-overlapping 1-year data and renter income, it isn’t clear: New York renter income grew faster, and the rest are inside the margin of error. So the product focuses on today’s squeeze and lets people test scenarios instead of selling a trend.' },
  { id: 'built', title: 'What we built', dark: true, Component: Built,
    notes: 'The camera does the talking: overview with city medians, zoom into San Francisco, then land on one resident. That’s the whole interaction: city → street → person.' },
  { id: 'tasha', title: 'Meet Tasha', Component: Tasha,
    notes: `Watch the cursor press Rent +10%. Rent ${money(TASHA.BEFORE.rent)} → ${money(TASHA.AFTER.rent)}, ${money(TASHA.LOSS)} less left each month, rent share ${pct(TASHA.BEFORE.ratio)} → ${pct(TASHA.AFTER.ratio)}. The quote is scripted and labeled; the “why” is computed from the same numbers, so it can’t contradict them.` },
  { id: 'honest', title: 'Honest by design', Component: Honest,
    notes: 'Three labels, everywhere: Census statistic, illustrative household, scripted or AI reaction. That’s our answer to “isn’t this just made up?”' },
  { id: 'how', title: 'How it works', Component: How,
    notes: 'Three branches built in parallel against one shared selection contract: housing data (Teammate 2), resident stories (Teammate 1), map and zoom (Mahin). Replace the teammate labels with names before presenting.' },
  { id: 'next', title: 'Next', Component: Next,
    notes: 'All four are planned, not shipped. Cala only after we confirm coverage; live AI only with labels.' },
  { id: 'close', title: 'Thank you', dark: true, Component: Close,
    notes: 'Close on the question. Invite judges to try rent +10% on a resident themselves.' },
];
