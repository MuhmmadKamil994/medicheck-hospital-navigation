import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Plain-Leaflet map wrapper (no react-leaflet: React 19 has no stable
// react-leaflet release, and direct Leaflet is fully deterministic here).
// Props:
//   center: [lat, lng] the map should be centred on (with centerKey to re-centre)
//   hospitals: [{_id, name, location:{coordinates:[lng,lat]}}]
//   selectedId, onSelect(hospital)
//   userLoc: [lat, lng] | null
//   route: { coords: [[lat,lng]...], fallback: bool } | null
export default function HospitalMap({ center, centerKey, hospitals, selectedId, onSelect, userLoc, route }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const routeRef = useRef(null);
  const userRef = useRef(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // Init once (StrictMode-safe: cleanup removes the map).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      routeRef.current = null;
      userRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-centre when the key changes (e.g. geolocation resolved).
  useEffect(() => {
    if (mapRef.current && center) mapRef.current.setView(center, 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerKey]);

  // Hospital markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    (hospitals || []).forEach((h) => {
      const coords = h.location && h.location.coordinates;
      if (!coords || coords.length !== 2) return;
      const [lng, lat] = coords;
      const icon = L.divIcon({
        className: 'mc-leaflet-pin',
        html: `<span class="mc-pin${h._id === selectedId ? ' sel' : ''}"></span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker([lat, lng], { icon, title: h.name }).addTo(map);
      marker.on('click', () => selectRef.current && selectRef.current(h));
      markersRef.current.set(h._id, marker);
    });
  }, [hospitals, selectedId]);

  // User location dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc) return;
    if (userRef.current) userRef.current.remove();
    const icon = L.divIcon({
      className: 'mc-leaflet-pin',
      html: '<span class="mc-you"><span class="mc-you-pulse"></span></span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    userRef.current = L.marker(userLoc, { icon, interactive: false, keyboard: false }).addTo(map);
  }, [userLoc]);

  // Route overlay: solid amber for OSRM road route, dashed slate for the
  // straight-line fallback (drawn when /route returns 503).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }
    if (route && route.coords && route.coords.length > 1) {
      const line = L.polyline(
        route.coords,
        route.fallback
          ? { color: '#8A7B5C', weight: 3, dashArray: '10 8', opacity: 0.9 }
          : { color: '#B07818', weight: 5, opacity: 0.95 }
      ).addTo(map);
      routeRef.current = line;
      map.fitBounds(line.getBounds(), { padding: [48, 48] });
    }
  }, [route]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[380px] md:h-[440px] rounded-[14px] border border-line z-0"
      aria-label="Map of nearby hospitals"
    />
  );
}
