import { motion, useReducedMotion } from 'motion/react';
import { POP } from '../ui/motion.jsx';

const NODES = [
  { id: 'census', x: 40, title: 'Census ACS', sub: 'rent · income · MOE', chip: ['census', 'Sourced'] },
  { id: 'data', x: 330, title: 'getHousing()', sub: 'calculateBudget()', chip: ['ink', 'Housing data'] },
  { id: 'resident', x: 620, title: 'Resident stories', sub: 'profile · budget · reaction', chip: ['illustrative', 'Illustrative'] },
  { id: 'map', x: 910, title: 'Map + zoom', sub: 'city → street → person', chip: ['ink', 'Map'] },
  { id: 'you', x: 1200, title: 'You', sub: 'try rent +10%', chip: ['scripted', 'Scenario'] },
];
const W = 1420;
const NODE_W = 220;
const Y = 120;

/** Data path through the app, with packets streaming between modules (Syro's particle lanes). */
export default function FlowDiagram({ owners }) {
  const reduced = useReducedMotion();
  const links = NODES.slice(0, -1).map((n, i) => {
    const m = NODES[i + 1];
    const x1 = n.x + NODE_W;
    const x2 = m.x;
    return { id: `${n.id}-${m.id}`, d: `M ${x1} ${Y} C ${x1 + 40} ${Y - 40}, ${x2 - 40} ${Y - 40}, ${x2} ${Y}`, i };
  });
  return (
    <div style={{ position: 'relative', width: W, height: 320 }}>
      <svg width={W} height={260} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
        {links.map((l) => (
          <g key={l.id}>
            <motion.path
              d={l.d}
              fill="none"
              stroke="#505c4f"
              strokeWidth="2"
              strokeDasharray="6 6"
              initial={reduced ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 + l.i * 0.25 }}
            />
            {!reduced && [0, 1, 2].map((k) => (
              <rect key={k} width="8" height="8" x="-4" y="-4" fill={k === 1 ? '#80c6bb' : '#e9a08a'}>
                <animateMotion dur="2.4s" begin={`${1.2 + l.i * 0.25 + k * 0.8}s`} repeatCount="indefinite" path={l.d} />
              </rect>
            ))}
          </g>
        ))}
      </svg>
      {NODES.map((n, i) => (
        <motion.div
          key={n.id}
          className="glass"
          style={{ position: 'absolute', left: n.x, top: Y - 62, width: NODE_W, padding: '16px 18px', background: n.id === 'you' ? 'var(--ink)' : 'var(--paper)', color: n.id === 'you' ? 'var(--paper)' : 'var(--ink)' }}
          initial={reduced ? false : { opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: POP }}
        >
          <span className={`chip ${n.chip[0]}`} style={{ fontSize: 10 }}>{n.chip[1]}</span>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 10 }}>{n.title}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{n.sub}</div>
        </motion.div>
      ))}
      {owners.map((o, i) => (
        <motion.div
          key={o.name}
          style={{ position: 'absolute', left: o.x, width: o.w, top: 232, borderTop: '3px solid', borderColor: o.color, paddingTop: 10 }}
          initial={reduced ? false : { opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 1.4 + i * 0.15, ease: POP }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>{o.name}</div>
          <div className="small">{o.branch}</div>
        </motion.div>
      ))}
    </div>
  );
}
