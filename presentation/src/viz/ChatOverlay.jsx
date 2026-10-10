import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Counter, EASE, Typewriter, money } from '../ui/motion.jsx';
import { HOUSEHOLDS, HOUSING, QUESTIONS, TASHA_INDEX } from './households.js';

const POP = { type: 'spring', stiffness: 160, damping: 17 };
const SHARE_MAX = 0.5; // bar scale: half of income
const percent = (v) => `${Math.round(v)}%`;
const signed = (n) => `${n < 0 ? '−' : '+'}${money(Math.abs(n))}`;
// Bubbles pop in Tasha first, then the neighbors.
const ORDER = HOUSEHOLDS.map((_, k) => (k === TASHA_INDEX ? 0 : 1 + k - (k > TASHA_INDEX ? 1 : 0)));
const TIMING = {
  shock: { bubbles: 2.1, bars: 2.7, every: 0.3 },
  raise: { bubbles: 1.2, bars: 1.6, every: 0.2 },
};

/** Share of income going to rent, with a tick where it started before the scenario. */
function ShareBar({ before, from, to, delay }) {
  const reduced = useReducedMotion();
  return (
    <div className="share">
      <span className="share-track">
        <motion.i className="share-fill" initial={reduced ? false : { scaleX: from / SHARE_MAX }} animate={{ scaleX: to / SHARE_MAX }} transition={{ delay, duration: 1.2, ease: EASE }} />
        <i className="share-tick" style={{ left: `${(before / SHARE_MAX) * 100}%` }} />
      </span>
      <b><Counter key={to} from={from * 100} to={to * 100} delay={delay} duration={1.2} format={percent} /></b>
    </div>
  );
}

function SpeechBubble({ household: h, mode, order }) {
  const t = TIMING[mode];
  const line = mode === 'shock'
    ? <>rent <em className="up">+{money(h.shock.rentUp)}</em> a month</>
    : <><em className={h.raise.left >= h.before.left ? 'ok' : 'up'}>{signed(h.raise.left - h.before.left)}</em> left vs. before</>;
  return (
    <motion.div className="nc-bubble is-speaking" initial={{ opacity: 0, scale: 0.6, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.25 } }} transition={{ ...POP, delay: TIMING.shock.bubbles + order * TIMING.shock.every }}>
      <b>{h.name}</b>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
          transition={{ delay: mode === 'raise' ? t.bubbles + order * t.every : 0, duration: 0.4 }}>{line}</motion.p>
      </AnimatePresence>
      <ShareBar before={h.before.share} from={mode === 'shock' ? h.before.share : h.shock.share} to={h[mode].share} delay={t.bars + order * t.every} />
      <small>of income goes to rent</small>
    </motion.div>
  );
}

/**
 * The app's neighborhood chat, replayed on the slide: the compact chat bubble at the
 * bottom and one speech bubble per household. StreetWorld feeds positions every frame
 * through `feed`; anchors move imperatively so React never re-renders per frame.
 * mode: null | 'shock' | 'raise'
 */
export default function ChatOverlay({ mode, feed }) {
  const speakers = useRef([]);
  const layer = useRef(null);

  useEffect(() => {
    const place = (el, at) => {
      if (!el) return;
      el.style.visibility = at ? 'visible' : 'hidden';
      if (at) el.style.transform = `translate3d(${at[0]}px, ${at[1]}px, 0)`;
    };
    feed.current = (frame) => {
      if (layer.current) layer.current.style.opacity = frame ? String(frame.amount) : '0';
      speakers.current.forEach((el, k) => place(el, frame?.speakers[k]));
    };
    return () => { feed.current = null; };
  }, [feed]);

  return (
    <div ref={layer} className="layer chat-layer" aria-hidden={!mode}>
      {HOUSEHOLDS.map((h, k) => (
        <div key={h.id} className="chat-anchor" ref={(el) => { speakers.current[k] = el; }}>
          <AnimatePresence>{mode && <SpeechBubble household={h} mode={mode} order={ORDER[k]} />}</AnimatePresence>
        </div>
      ))}
      <AnimatePresence>
        {mode && (
          <motion.section key="shell" className="nc-shell" aria-label="Ask the neighborhood"
            initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}>
            <h2>Ask the neighborhood</h2>
            <p className="nc-context">{HOUSING.geography} · {HOUSING.year} · {HOUSEHOLDS.length} nearby voices</p>
            <div className="nc-form">
              <p className="nc-input"><Typewriter key={mode} text={QUESTIONS[mode]} delay={0.7} speed={24} /><i className="caret" /></p>
              <span className="nc-send">Ask neighbors</span>
            </div>
            <p className="nc-status">AI dialogue · fictional residents · sourced citywide context</p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
