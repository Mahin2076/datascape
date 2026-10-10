import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react';
import PixelWorld, { STAGE } from './viz/PixelWorld.jsx';
import { Bubble, NameTags, TashaCard } from './actors.jsx';
import { SLIDES, STATS } from './story.jsx';

const EASE = [0.16, 1, 0.3, 1];
const LAYOUT = { type: 'spring', stiffness: 110, damping: 22, mass: 1 };

function indexFromHash() {
  const n = Number.parseInt(window.location.hash.replace('#', ''), 10);
  return Number.isInteger(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0;
}

function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

/** Soft scrims behind the text, cross-faded per layout so the city never fully disappears. */
function Scrims({ variant }) {
  const layers = {
    hero: 'linear-gradient(90deg, #1b2a22e8 0%, #1b2a22a6 46%, #1b2a2200 78%)',
    card: 'linear-gradient(90deg, #1b2a2266 0%, #1b2a2200 48%)',
    side: 'linear-gradient(90deg, #1b2a2299 0%, #1b2a2200 30%)',
  };
  return Object.entries(layers).map(([k, bg]) => (
    <motion.div key={k} aria-hidden="true" style={{ position: 'absolute', inset: 0, background: bg, pointerEvents: 'none' }} initial={false} animate={{ opacity: variant === k ? 1 : 0 }} transition={{ duration: 1.2, ease: EASE }} />
  ));
}

/**
 * The text card. One element for the whole deck: it changes shape and position between
 * the hero title and the side card (layout animation) while its words swap.
 */
function Panel({ slide, replay }) {
  const v = slide.panel;
  return (
    <motion.div layout transition={LAYOUT} className={`panel panel-${v}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${slide.id}-${replay}`}
          layout="position"
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(6px)', transition: { duration: 0.25 } }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        >
          <motion.h1 layoutId="headline" className="headline" transition={LAYOUT}>{slide.headline}</motion.h1>
          <motion.p className="body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.6 }}>{slide.body}</motion.p>
          {slide.list && (
            <ul className="team">
              {slide.list.map(([name, role], i) => (
                <motion.li key={name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.12 }}>
                  <b>{name}</b> {role}
                </motion.li>
              ))}
            </ul>
          )}
          {slide.foot && <motion.p className="foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>{slide.foot}</motion.p>}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default function Deck() {
  const [index, setIndex] = useState(indexFromHash);
  const [showNotes, setShowNotes] = useState(false);
  const [replay, setReplay] = useState(0);
  const scale = useStageScale();
  const slide = SLIDES[index];
  const lastCardAt = useRef(slide.cardAt ?? { x: 1100, y: 110 });
  if (slide.cardAt) lastCardAt.current = slide.cardAt;

  const go = useCallback((next) => {
    setIndex((current) => Math.max(0, Math.min(SLIDES.length - 1, next(current))));
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${index + 1}`);
    document.title = `${index + 1}/${SLIDES.length} · DataScape`;
  }, [index]);

  useEffect(() => {
    const onHash = () => go(() => indexFromHash());
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['arrowright', 'pagedown', ' ', 'enter'].includes(k)) { e.preventDefault(); go((i) => i + 1); }
      else if (['arrowleft', 'pageup', 'backspace'].includes(k)) { e.preventDefault(); go((i) => i - 1); }
      else if (k === 'home') go(() => 0);
      else if (k === 'end') go(() => SLIDES.length - 1);
      else if (k === 'n') setShowNotes((v) => !v);
      else if (k === 'r') setReplay((v) => v + 1);
      else if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('keydown', onKey);
    };
  }, [go]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="viewport">
        <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }} aria-roledescription="slide deck">
          <PixelWorld shot={slide.shot} stats={STATS} />
          <Scrims variant={slide.panel} />
          <LayoutGroup>
            <Panel slide={slide} replay={replay} />
          </LayoutGroup>
          <TashaCard state={slide.card ?? 'hidden'} at={lastCardAt.current} />
          <Bubble show={Boolean(slide.bubble)} text={slide.bubble?.text ?? ''} at={slide.bubble?.at ?? { x: 0, y: 0 }} />
          <NameTags tags={slide.tags ?? []} />
          <nav className="chrome" aria-label="Slide controls">
            <span className="brand"><i />datascape</span>
            <span className="spacer" />
            <button type="button" onClick={() => go((i) => i - 1)} aria-label="Previous slide">←</button>
            <span className="count" aria-live="polite">{index + 1} / {SLIDES.length}</span>
            <button type="button" onClick={() => go((i) => i + 1)} aria-label="Next slide">→</button>
          </nav>
          <div className="progress" aria-hidden="true">
            <motion.i animate={{ scaleX: (index + 1) / SLIDES.length }} initial={false} transition={{ duration: 0.8, ease: EASE }} />
          </div>
        </div>
        {showNotes && (
          <aside className="notes">
            <b>Notes · {index + 1}/{SLIDES.length}</b>
            {slide.notes}
          </aside>
        )}
      </main>
    </MotionConfig>
  );
}
