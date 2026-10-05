const Hospital = require('../models/Hospital');
const User = require('../models/User');
const dbGuard = require('../utils/dbGuard');
const asyncHandler = require('../utils/asyncHandler');
const { haversineKm } = require('../utils/geo');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const EXT_TIMEOUT_MS = 8000;

// Nominatim usage policy: max 1 request/second + identifying User-Agent.
let lastNominatimCall = 0;

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// GET /api/hospitals/nearby?lat=&lng=&radiusKm=&specialization=&insurance=&openNow=
// JWT protected. Uses the 2dsphere index ($near) for the radius filter, then
// attaches haversine distanceKm (1 decimal) and insuranceMatch for the
// requesting user. SDD 3.5 process 3.0.
const nearby = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : 10;
  const { specialization, insurance, openNow } = req.query;

  const user = await User.findById(req.user.id).select('insuranceProvider').lean();
  const userInsurance = ((user && user.insuranceProvider) || '').toLowerCase().trim();

  const query = {
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] }, // GeoJSON: lng FIRST
        $maxDistance: radiusKm * 1000, // metres
      },
    },
  };
  if (specialization) query.specializations = specialization;
  if (insurance) query.insuranceAccepted = insurance;
  if (openNow === 'true') query.availabilityStatus = true;

  const hospitals = await Hospital.find(query).limit(50).lean();

  const results = hospitals
    .map((h) => {
      const [hLng, hLat] = h.location.coordinates;
      const insuranceMatch =
        !!userInsurance &&
        (h.insuranceAccepted || []).some((p) => p.toLowerCase().trim() === userInsurance);
      return { ...h, distanceKm: round1(haversineKm(lat, lng, hLat, hLng)), insuranceMatch };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ success: true, count: results.length, hospitals: results });
});

// GET /api/hospitals/:id  (JWT protected)
const detail = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const hospital = await Hospital.findById(req.params.id).lean();
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }
  res.json({ success: true, hospital });
});

// POST /api/hospitals/geocode  (admin only)
// {address} -> {lat, lng} via Nominatim (OpenStreetMap). Used by the admin
// when adding a hospital so coordinates never have to be looked up by hand.
const geocode = asyncHandler(async (req, res) => {
  const { address } = req.body;

  // Respect Nominatim's 1 req/sec fair-use policy (in-process throttle).
  const wait = 1100 - (Date.now() - lastNominatimCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXT_TIMEOUT_MS);
  try {
    const url =
      `${NOMINATIM_URL}?` +
      new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'pk' });
    const response = await fetch(url, {
      headers: {
        // Nominatim requires an identifying User-Agent (usage policy).
        'User-Agent': 'MediCheck-FYP/1.0 (university final-year project; Bahawalpur, Pakistan)',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) throw httpError('Geocoding service unavailable', 502);
    const data = await response.json();
    if (!data || !data.length) {
      throw httpError('No coordinates found for this address', 404);
    }
    res.json({
      success: true,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.statusCode) throw err;
    if (err.name === 'AbortError') throw httpError('Geocoding service timed out', 502);
    throw httpError('Geocoding service unavailable', 502);
  }
});

// GET /api/hospitals/route?fromLat=&fromLng=&toLat=&toLng=  (JWT protected)
// Real road distance + travel time + route geometry via the public OSRM
// demo server. 503 (not 500) when OSRM is unreachable — the client can fall
// back to straight-line distanceKm from /nearby.
const route = asyncHandler(async (req, res) => {
  const fromLat = parseFloat(req.query.fromLat);
  const fromLng = parseFloat(req.query.fromLng);
  const toLat = parseFloat(req.query.toLat);
  const toLng = parseFloat(req.query.toLng);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXT_TIMEOUT_MS);
  try {
    const url =
      `${OSRM_URL}/${fromLng},${fromLat};${toLng},${toLat}` +
      '?overview=full&geometries=geojson';
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw httpError('Routing service unavailable', 503);
    const data = await response.json();
    const r = data && data.routes && data.routes[0];
    if (!r) throw httpError('No route found', 404);
    res.json({
      success: true,
      distanceKm: round1(r.distance / 1000),
      durationMin: Math.round(r.duration / 60),
      geometry: r.geometry, // GeoJSON LineString for the Leaflet map
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.statusCode) throw err;
    // Network block / timeout / DNS failure -> graceful 503, never a crash.
    throw httpError('Routing service unavailable', 503);
  }
});

module.exports = { nearby, detail, geocode, route };
