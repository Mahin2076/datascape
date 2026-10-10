import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import charsUrl from '../../dist/assets/sprites.png';
import data from '../../dist/assets/data.json';
import { Counter, EASE, Typewriter, money, pct } from './ui/motion.jsx';

const SPRING = { type: 'spring', stiffness: 120, damping: 20, mass: 0.9 };

/** One character from dist/assets/sprites.png, drawn crisp at any scale. */
export function Sprite({ char, scale = 4, dir = 0, frame = 1, style }) {
  return (
    <span
      aria-hidden="true"
      className="pixel"
      style={{
        display: 'inline-block',
        width: 16 * scale,
        height: 16 * scale,
        backgroundImage: `url(${charsUrl})`,
        backgroundSize: `${240 * scale}px ${128 * scale}px`,
        backgroundPosition: `${-((char % 5) * 48 + frame * 16) * scale}px ${-(Math.floor(char / 5) * 64 + dir * 16) * scale}px`,
        ...style,
      }}
    />
  );
}

// Tasha's household: rent 1.1x and income 0.7x the SF medians the product shows
// (dist/assets/data.json, ACS 2020-2024), as in the resident-stories fixture.
const sf = data.cities.find((c) => c.id === 'sf');
const latest = sf.data.at(-1);
export const TASHA_NUMBERS = (() => {
  const income = Math.round((latest.income * 0.7) / 12);
  const rent = Math.round(latest.rent * 1.1);
  const raised = Math.round(rent * 1.1);
  return { income, rent, raised, left: income - rent, leftRaised: income - raised, median: latest.rent, period: latest.period };
})();

function Line({ label, from, to, changed, warn }) {
  return (
    <div className="tc-row">
      <span>{label}</span>
      <b className={changed && warn ? 'hl-rent' : ''}>
        {changed ? <Counter from={from} to={to} duration={1.1} delay={0.5} format={money} /> : money(from)}
      </b>
    </div>
  );
}

/**
 * Tasha's budget card. It persists across slides and changes shape:
 * compact by the door -> rent raised -> the full resident panel from the app.
 */
export function TashaCard({ state, at }) {
  const reduced = useReducedMotion();
  const n = TASHA_NUMBERS;
  const raised = state === 'raised' || state === 'panel';
  const ratio = (raised ? n.raised : n.rent) / n.income;
  const isPanel = state === 'panel';
  return (
    <AnimatePresence>
      {state !== 'hidden' && (
        <motion.aside
          key="tasha-card"
          className="tasha-card"
          initial={reduced ? false : { opacity: 0, scale: 0.6, x: at.x - 40, y: at.y + 60 }}
          animate={{ opacity: 1, scale: 1, x: at.x, y: at.y, width: isPanel ? 520 : 400 }}
          exit={{ opacity: 0, scale: 0.85, y: at.y + 30, transition: { duration: 0.35 } }}
          transition={{ ...SPRING, delay: 0.9 }}
          style={{ originX: 0, originY: 1 }}
          aria-label="Tasha's monthly budget"
        >
          <header className="tc-head">
            <span className="tc-avatar"><Sprite char={3} scale={3} /></span>
            <span>
              <b className="tc-name">Tasha</b>
              <span className="tc-sub">Bakery owner · renting here 9 years</span>
            </span>
            <AnimatePresence>
              {isPanel && (
                <motion.span className="chip illustrative" style={{ marginLeft: 'auto', fontSize: 10 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Illustrative
                </motion.span>
              )}
            </AnimatePresence>
          </header>
          <AnimatePresence initial={false}>
            {isPanel && (
              <motion.div className="tc-presets" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                {['No change', 'Rent +10%', 'Income +5%'].map((p) => (
                  <span key={p} className={p === 'Rent +10%' ? 'on' : ''}>{p}</span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="tc-body">
            <Line label="Income / month" from={n.income} to={n.income} />
            <Line label="Rent" from={n.rent} to={n.raised} changed={raised} warn />
            <Line label="Left after rent" from={n.left} to={n.leftRaised} changed={raised} warn />
            <div className="budget-bar" role="img" aria-label={`Rent is ${pct(ratio, 0)} of income; ${money(raised ? n.leftRaised : n.left)} is left`}>
              <motion.span className="seg rent" initial={false} animate={{ width: `${ratio * 100}%` }} transition={{ duration: 1.1, delay: raised ? 0.5 : 0, ease: EASE }}>
                rent
              </motion.span>
              <motion.span className="seg left" initial={false} animate={{ width: `${(1 - ratio) * 100}%` }} transition={{ duration: 1.1, delay: raised ? 0.5 : 0, ease: EASE }}>
                left over
              </motion.span>
              <span className="line30" style={{ left: '30%' }}><em>30%</em></span>
            </div>
            <div className="tc-foot">
              <span>Rent is <b className="num">{pct(ratio, 0)}</b> of income</span>
              <AnimatePresence>
                {raised && (
                  <motion.span className="hl-rent" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: 1.2 }}>
                    −{money(n.left - n.leftRaised)} a month
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {isPanel && (
              <motion.div className="tc-reaction" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}>
                <b className="hl-rent">Tightening the budget</b>
                <p>“We’d make it work, but the kids would notice the cutbacks.”</p>
                <span className="tc-sub">Rent would take {pct(n.raised / n.income)} of income and {money(n.left - n.leftRaised)} less is left each month.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Pixel speech bubble pinned to a point in the city (tail points down at `at`). */
export function Bubble({ text, at, show }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={text}
          className="bubble"
          style={{ left: at.x, top: at.y }}
          initial={reduced ? false : { opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.25 } }}
          transition={{ ...SPRING, delay: 1.6 }}
        >
          <Typewriter text={text} delay={1.9} speed={32} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
