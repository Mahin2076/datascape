import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { SLIDES } from './slides.jsx';

const STAGE_W = 1600;
const STAGE_H = 900;

function indexFromHash() {
  const n = Number.parseInt(window.location.hash.replace('#', ''), 10);
  return Number.isInteger(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0;
}

function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

export default function Deck() {
  const [index, setIndex] = useState(indexFromHash);
  const [direction, setDirection] = useState(1);
  const [showNotes, setShowNotes] = useState(false);
  const [replay, setReplay] = useState(0);
  const scale = useStageScale();
  const slide = SLIDES[index];

  const go = useCallback((next) => {
    setIndex((current) => {
      const target = Math.max(0, Math.min(SLIDES.length - 1, next(current)));
      setDirection(target >= current ? 1 : -1);
      return target;
    });
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${index + 1}`);
    document.title = `${index + 1}/${SLIDES.length} · ${slide.title} · DataScape`;
  }, [index, slide.title]);

  useEffect(() => {
    const onHash = () => go(() => indexFromHash());
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go((i) => i + 1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go((i) => i - 1); }
      else if (e.key === 'Home') go(() => 0);
      else if (e.key === 'End') go(() => SLIDES.length - 1);
      else if (e.key.toLowerCase() === 'n') setShowNotes((v) => !v);
      else if (e.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else if (e.key.toLowerCase() === 'r') {
        setReplay((v) => v + 1); // remount the slide to replay its animations
      }
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('keydown', onKey);
    };
  }, [go]);

  const Current = slide?.Component;

  return (
    <MotionConfig reducedMotion="user">
      <main className="viewport">
        <div className={`stage${slide?.dark ? ' dark' : ''}`} style={{ transform: `scale(${scale})` }}>
          <div className="progress" aria-hidden="true">
            {SLIDES.map((s, i) => (
              <span key={s.id}>
                <motion.i initial={false} animate={{ scaleX: i <= index ? 1 : 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
              </span>
            ))}
          </div>
          <AnimatePresence mode="wait" custom={direction}>
            {Current && (
              <motion.section
                key={`${slide.id}-${replay}`}
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${SLIDES.length}: ${slide.title}`}
                style={{ position: 'absolute', inset: 0 }}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: direction * -40, filter: 'blur(8px)' }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Current />
              </motion.section>
            )}
          </AnimatePresence>
          <nav className="chrome" aria-label="Slide controls">
            <span className="brand"><i />datascape</span>
            <span style={{ opacity: 0.7 }}>{slide?.title}</span>
            <span className="spacer" />
            <span style={{ opacity: 0.6 }}><kbd>←</kbd> <kbd>→</kbd> move · <kbd>N</kbd> notes · <kbd>F</kbd> full screen · <kbd>R</kbd> replay</span>
            <button type="button" onClick={() => go((i) => i - 1)} aria-label="Previous slide" style={{ background: 'none', border: '1px solid currentColor', padding: '3px 10px' }}>←</button>
            <span className="count">{String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}</span>
            <button type="button" onClick={() => go((i) => i + 1)} aria-label="Next slide" style={{ background: 'none', border: '1px solid currentColor', padding: '3px 10px' }}>→</button>
          </nav>
        </div>
        {showNotes && slide && (
          <aside className="notes" aria-live="polite">
            <b>Speaker notes · {index + 1}/{SLIDES.length}</b>
            {slide.notes}
          </aside>
        )}
      </main>
    </MotionConfig>
  );
}
