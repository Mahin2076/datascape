import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Same imagery source and attribution as the app's city overview (dist/map/city-overview.js).
const TILES = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION = 'Imagery: Esri, Vantor, Earthstar Geographics, GIS User Community';

/** Leaflet pixels per meter at a zoom level and latitude (Web Mercator, 256px tiles). */
export function pxPerMeter(zoom, lat) {
  return (256 * 2 ** zoom) / (2 * Math.PI * 6378137 * Math.cos((lat * Math.PI) / 180));
}

/**
 * The satellite map from the app's overview, persistent for the whole deck and not
 * interactive: each slide hands it a view and it flies there.
 */
export default function SatelliteLayer({ view, liveRef }) {
  const el = useRef(null);
  const map = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const m = L.map(el.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      zoomSnap: 0,
      fadeAnimation: true,
      zoomAnimation: true,
    });
    m.attributionControl.setPrefix(false);
    // A coarse backdrop (one or two z12 tiles, scaled) under the detailed layer, so a
    // flight shows soft imagery instead of empty gaps while the sharp tiles arrive.
    // It requests only what is on screen: no prefetching.
    L.tileLayer(TILES, { maxZoom: 19, maxNativeZoom: 12, className: 'sat-backdrop' }).addTo(m);
    L.tileLayer(TILES, { maxZoom: 19, keepBuffer: 3, attribution: ATTRIBUTION }).addTo(m);
    m.setView(view.center, view.zoom, { animate: false });
    map.current = m;
    // Shared with the street layer so it can ride the exact same camera mid-flight.
    const live = { map: m, moving: false };
    m.on('movestart', () => { live.moving = true; });
    m.on('moveend', () => { live.moving = false; });
    if (liveRef) liveRef.current = live;
    return () => { m.remove(); map.current = null; if (liveRef) liveRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (reduced || !view.duration) m.setView(view.center, view.zoom, { animate: false });
    else m.flyTo(view.center, view.zoom, { duration: view.duration, easeLinearity: 0.2 });
  }, [view, reduced]);

  return <div ref={el} className="satellite" aria-hidden="true" />;
}
