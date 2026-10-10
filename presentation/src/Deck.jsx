import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react';
import PixelWorld, { STAGE } from './viz/PixelWorld.jsx';
import SatelliteLayer from './viz/SatelliteLayer.jsx';
import StreetWorld, { homeOf, STREET } from './viz/StreetWorld.jsx';
import ChatOverlay from './viz/ChatOverlay.jsx';
import { Bubble, TashaCard } from './actors.jsx';
import { CHARTS, STATS, buildSlides } from './story.jsx';
import { CityBars, GapDumbbell, PeopleRow, RentLine } from './viz/charts.jsx';

const EASE = [0.16, 1, 0.3, 1];
// Soft spring for the card changing shape; text fades without blur so it stays crisp.
const LAYOUT = { type: 'spring', stiffness: 90, damping: 20, mass: 1 };
const COMPARE_IDLE = { camera: { x: 472, y: 566, z: 0.72 }, light: 0, signs: 'none' };
const SLIDE_COUNT = buildSlides({ x: STREET.w / 2, y: STREET.h / 2 }).length;

function indexFromHash() {
  const n = Number.parseInt(window.location.hash.replace('#', ''), 10);
  return Number.isInteger(n) && n >= 1 && n <= SLIDE_COUNT ? n - 1 : 0;
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

/** Snapshotted OpenStreetMap features for the two mapped locations (loaded lazily). */
function usePlaces() {
  const [places, setPlaces] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all([import('./data/places/roosevelt.json'), import('./data/places/beachchalet.json')]).then(([r, b]) => {
      if (alive) setPlaces({ roosevelt: r.default, beachchalet: b.default });
    });
    return () => { alive = false; };
  }, []);
  return places;
}

function Scrims({ variant }) {
  const layers = {
    hero: 'linear-gradient(90deg, #111a15e6 0%, #111a15a0 46%, #111a1500 78%)',
    card: 'linear-gradient(90deg, #111a1566 0%, #111a1500 48%)',
    side: 'linear-gradient(90deg, #111a1599 0%, #111a1500 30%)',
    wide: 'linear-gradient(90deg, #111a15aa 0%, #111a1500 50%)',
  };
  return Object.entries(layers).map(([k, bg]) => (
    <motion.div key={k} aria-hidden="true" className="layer scrim" style={{ background: bg, pointerEvents: 'none' }} initial={false} animate={{ opacity: variant === k ? 1 : 0 }} transition={{ duration: 1.2, ease: EASE }} />
  ));
}

function PanelViz({ kind, onFocus }) {
  if (kind === 'people') return <PeopleRow {...CHARTS.people} />;
  if (kind === 'citybars') return <CityBars {...CHARTS.citybars} onFocus={onFocus} />;
  if (kind === 'dumbbell') return <GapDumbbell {...CHARTS.dumbbell} onFocus={onFocus} />;
  return null;
}

/** One text card for the whole deck: it reshapes between layouts while its words swap. */
function Panel({ slide, replay, onFocus }) {
  const v = slide.panel;
  const inPanel = slide.viz && slide.viz !== 'rentline';
  return (
    <motion.div layout transition={LAYOUT} className={`panel panel-${v}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${slide.id}-${replay}`}
          layout="position"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.22, ease: 'easeIn' } }}
          transition={{ duration: 0.75, ease: EASE, delay: 0.3 }}
        >
          <h1 className="headline">{slide.headline}</h1>
          {inPanel && <div className="panel-viz"><PanelViz kind={slide.viz} onFocus={onFocus} /></div>}
          {slide.steps && (
            <ol className="steps">
              {slide.steps.map(([title, desc, at]) => (
                <motion.li key={title} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: at + 1.3, duration: 0.6, ease: EASE }}>
                  <span><b>{title}</b> {desc}</span>
                </motion.li>
              ))}
            </ol>
          )}
          <motion.p className="body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: slide.steps ? 6.4 : 0.6, duration: 0.6 }}>{slide.body}</motion.p>
          {slide.foot && <motion.p className="foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: slide.steps ? 6.8 : 1.1 }}>{slide.foot}</motion.p>}
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
  const places = usePlaces();
  const home = useMemo(() => (places ? homeOf(places.roosevelt) : { x: STREET.w / 2, y: STREET.h / 2 }), [places]);
  const slides = useMemo(() => buildSlides(home), [home]);
  const slide = slides[index];
  const prev = useRef(slide);

  // Street layer: keep showing the last street shot while it shrinks away.
  const lastStreet = useRef(slide.street ?? slides.find((x) => x.street).street);
  if (slide.street) lastStreet.current = slide.street;
  useEffect(() => { prev.current = slide; }, [slide]);

  const lastCompare = useRef(COMPARE_IDLE);
  if (slide.compare) lastCompare.current = slide.compare;
  const lastCardAt = useRef(slide.cardAt ?? { x: 1100, y: 110 });
  if (slide.cardAt) lastCardAt.current = slide.cardAt;

  const satellite = useRef(null);
  const chatFeed = useRef(null);

  const go = useCallback((next) => {
    setIndex((current) => Math.max(0, Math.min(SLIDE_COUNT - 1, next(current))));
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${index + 1}`);
    document.title = `${index + 1}/${SLIDE_COUNT} · DataScape`;
  }, [index]);

  useEffect(() => {
    const onHash = () => go(() => indexFromHash());
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['arrowright', 'pagedown', ' ', 'enter'].includes(k)) { e.preventDefault(); go((i) => i + 1); }
      else if (['arrowleft', 'pageup', 'backspace'].includes(k)) { e.preventDefault(); go((i) => i - 1); }
      else if (k === 'home') go(() => 0);
      else if (k === 'end') go(() => SLIDE_COUNT - 1);
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

  const compareOn = Boolean(slide.compare);
  const [focus, setFocus] = useState(null);
  useEffect(() => { setFocus(null); }, [index]);
  return (
    <MotionConfig reducedMotion="user">
      <main className="viewport">
        <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }} aria-roledescription="slide deck">
          <div className={`layer sat-wrap${slide.dusk ? ' dusk' : ''}`}>
            <SatelliteLayer view={slide.sat} liveRef={satellite} />
          </div>
          <div className="layer street-layer">
            <StreetWorld places={places} shot={lastStreet.current} visible={Boolean(slide.street)} satellite={satellite} chat={chatFeed} />
          </div>
          <motion.div className="layer compare-layer" initial={false} animate={{ opacity: compareOn ? 1 : 0 }} transition={{ duration: 0.9, ease: EASE }}>
            <PixelWorld shot={lastCompare.current} stats={STATS} active={compareOn} focus={focus} />
          </motion.div>
          <Scrims variant={slide.panel} />
          <ChatOverlay mode={slide.street?.chat ?? null} feed={chatFeed} />
          <LayoutGroup>
            <Panel slide={slide} replay={replay} onFocus={setFocus} />
          </LayoutGroup>
          <AnimatePresence>
            {slide.viz === 'rentline' && (
              <motion.div
                key={`rentline-${replay}`}
                className="viz-right"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay: 0.5 } }}
                exit={{ opacity: 0, scale: 0.35, x: -260, y: 60, transition: { duration: 0.9, ease: [0.5, 0, 0.75, 0] } }}
              >
                <RentLine {...CHARTS.rentline} />
              </motion.div>
            )}
          </AnimatePresence>
          <TashaCard state={slide.card ?? 'hidden'} at={lastCardAt.current} />
          <Bubble show={Boolean(slide.bubble)} text={slide.bubble?.text ?? ''} at={slide.bubble?.at ?? { x: 0, y: 0 }} />
          <nav className="chrome" aria-label="Slide controls">
            <span className="brand"><i />datascape</span>
            <span className="spacer" />
            <button type="button" onClick={() => go((i) => i - 1)} aria-label="Previous slide">←</button>
            <span className="count" aria-live="polite">{index + 1} / {SLIDE_COUNT}</span>
            <button type="button" onClick={() => go((i) => i + 1)} aria-label="Next slide">→</button>
          </nav>
          <div className="progress" aria-hidden="true">
            <motion.i animate={{ scaleX: (index + 1) / SLIDE_COUNT }} initial={false} transition={{ duration: 0.8, ease: EASE }} />
          </div>
        </div>
        {showNotes && (
          <aside className="notes">
            <b>Notes · {index + 1}/{SLIDE_COUNT}</b>
            {slide.notes}
          </aside>
        )}
      </main>
    </MotionConfig>
  );
}
