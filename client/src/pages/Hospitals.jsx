import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { parseApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import HospitalMap from '../components/HospitalMap.jsx';
import BookingModal from '../components/BookingModal.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { formatDate } from '../utils/format.js';

const BAHAWALPUR = [29.3956, 71.6722]; // fallback when geolocation is denied
const SPECIALIZATIONS = [
  'Cardiology',
  'Orthopedics',
  'Emergency',
  'General Physician',
  'Pediatrics',
  'Surgery',
  'Dermatology',
  'Radiology',
  'Dental',
];

function HospitalCard({ h, selected, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(h)}
      className={`w-full text-left bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-page ${
        selected ? 'border-amber shadow-page' : 'border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <h4 className="font-serif text-[16px] font-bold leading-snug">{h.name}</h4>
        <span className="text-[12px] font-extrabold text-amber tracking-wide whitespace-nowrap">
          {h.distanceKm} KM
        </span>
      </div>
      <p className="text-[12.5px] text-muted mb-2">{h.address}</p>
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            h.insuranceMatch ? 'bg-[#DDF0E6] text-urgency-green' : 'bg-sand text-faint'
          }`}
        >
          {h.insuranceMatch ? 'Your insurance accepted' : 'Insurance not matched'}
        </span>
        <span className={`text-[11px] font-bold ${h.availabilityStatus ? 'text-urgency-green' : 'text-faint'}`}>
          {h.availabilityStatus ? '● Open now' : '○ Closed'}
        </span>
      </div>
    </button>
  );
}

function DetailPanel({ h, userLoc, route, routeLoading, routeError, onRoute, onClearRoute, onBook, onBack }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <button type="button" onClick={onBack} className="mc-link text-[13px] mb-3">
        ← Back to list
      </button>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-serif text-xl font-bold leading-snug">{h.name}</h3>
        <span className="text-[12px] font-extrabold text-amber tracking-wide whitespace-nowrap">
          {h.distanceKm} KM
        </span>
      </div>
      <p className="text-[13px] text-muted mb-4">{h.address}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(h.specializations || []).map((s) => (
          <span key={s} className="text-[11.5px] font-semibold bg-sand text-ink-slate rounded-md px-2.5 py-1">
            {s}
          </span>
        ))}
      </div>

      <dl className="text-[13px] space-y-2 mb-4">
        <div className="flex gap-2">
          <dt className="text-faint font-semibold min-w-[86px]">Hours</dt>
          <dd>{h.operatingHours || 'Not listed'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-faint font-semibold min-w-[86px]">Contact</dt>
          <dd>{h.contactNumber || 'Not listed'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-faint font-semibold min-w-[86px]">Insurance</dt>
          <dd>{(h.insuranceAccepted || []).join(', ') || 'Not listed'}</dd>
        </div>
      </dl>

      <div
        className={`text-[12.5px] font-bold rounded-lg px-3.5 py-2.5 mb-4 ${
          h.insuranceMatch
            ? 'bg-[#DDF0E6] text-urgency-green'
            : 'bg-sand text-faint'
        }`}
      >
        {h.insuranceMatch ? '✓ Your insurance is accepted here' : '— Your insurance is not listed here'}
      </div>

      {route && (
        <div className="text-[13px] bg-amber-wash border border-amber-line rounded-lg px-3.5 py-2.5 mb-4">
          <span className="font-bold">{route.distanceKm} km</span>
          {route.durationMin != null && <span className="text-muted"> · ~{route.durationMin} min drive</span>}
          {route.fallback && <div className="text-[11.5px] text-faint mt-1">Road routing unavailable — showing straight line.</div>}
        </div>
      )}
      {routeError && <p className="text-[12.5px] text-urgency-red mb-4">{routeError}</p>}

      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={onBook} className="mc-btn w-full">
          Book appointment
        </button>
        {!route ? (
          <button
            type="button"
            onClick={onRoute}
            disabled={routeLoading || !userLoc}
            className="w-full text-[13.5px] font-bold text-ink bg-white border-[1.5px] border-line rounded-[10px] py-3 hover:border-ink transition-colors duration-200 disabled:opacity-50"
          >
            {routeLoading ? 'Finding route…' : 'Show route from my location'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onClearRoute}
            className="w-full text-[13.5px] font-bold text-ink bg-white border-[1.5px] border-line rounded-[10px] py-3 hover:border-ink transition-colors duration-200"
          >
            Hide route
          </button>
        )}
      </div>
    </div>
  );
}

export default function Hospitals() {
  const { user, isAuthenticated, initialising } = useAuth();
  const [userLoc, setUserLoc] = useState(null);
  const [locNotice, setLocNotice] = useState('');
  const [locKey, setLocKey] = useState(0);

  const [filters, setFilters] = useState({ radiusKm: 10, specialization: '', myInsurance: false, openNow: false });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [bookingFor, setBookingFor] = useState(null);

  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  const debounceRef = useRef(null);

  // Geolocation once on mount; graceful fallback to Bahawalpur.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setUserLoc(BAHAWALPUR);
      setLocNotice('Location is not supported in this browser — showing Bahawalpur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc([pos.coords.latitude, pos.coords.longitude]);
        setLocKey((k) => k + 1);
      },
      () => {
        setUserLoc(BAHAWALPUR);
        setLocNotice('Location access was denied — showing Bahawalpur. Enable location for true nearby results.');
      },
      { timeout: 10000 }
    );
  }, []);

  const fetchNearby = useCallback(async () => {
    if (!userLoc) return;
    setLoading(true);
    setApiError(null);
    try {
      const params = {
        lat: userLoc[0],
        lng: userLoc[1],
        radiusKm: filters.radiusKm,
      };
      if (filters.specialization) params.specialization = filters.specialization;
      if (filters.myInsurance && user?.insuranceProvider) params.insurance = user.insuranceProvider;
      if (filters.openNow) params.openNow = 'true';
      const { data } = await api.get('/api/hospitals/nearby', { params });
      setHospitals(data.hospitals || []);
      setSelected((prev) => (prev ? (data.hospitals || []).find((h) => h._id === prev._id) || null : null));
    } catch (err) {
      const { message, status } = parseApiError(err, 'Could not load hospitals.');
      setApiError({ message, status });
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [userLoc, filters, user?.insuranceProvider]);

  // Debounce so the radius slider doesn't fire a request per pixel.
  useEffect(() => {
    if (!userLoc) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchNearby, 350);
    return () => clearTimeout(debounceRef.current);
  }, [fetchNearby, userLoc]);

  const showRoute = useCallback(async () => {
    if (!selected || !userLoc) return;
    setRouteLoading(true);
    setRouteError('');
    const [hLng, hLat] = selected.location.coordinates;
    try {
      const { data } = await api.get('/api/hospitals/route', {
        params: { fromLat: userLoc[0], fromLng: userLoc[1], toLat: hLat, toLng: hLng },
      });
      const coords = (data.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
      setRoute({ coords, fallback: false, distanceKm: data.distanceKm, durationMin: data.durationMin });
    } catch (err) {
      const { status } = parseApiError(err);
      if (status === 503 || status === 0 || status === 502) {
        // OSRM down — straight dashed line, still useful.
        setRoute({
          coords: [userLoc, [hLat, hLng]],
          fallback: true,
          distanceKm: selected.distanceKm,
          durationMin: null,
        });
      } else {
        setRouteError('Could not calculate a route right now.');
      }
    } finally {
      setRouteLoading(false);
    }
  }, [selected, userLoc]);

  if (initialising) {
    return (
      <div className="p-8">
        <div className="mc-shimmer h-10 w-64 mb-6" />
        <div className="mc-shimmer h-[380px] rounded-[14px]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-7 py-16 text-center">
        <div className="kicker justify-center" style={{ justifyContent: 'center' }}>
          HOSPITAL FINDER
        </div>
        <h1 className="font-serif text-3xl font-semibold mb-3">One quick step first</h1>
        <p className="text-muted text-[15px] max-w-md mx-auto mb-7 leading-relaxed">
          The hospital map needs your account (so we can match your insurance). Log in or create a free
          account to continue.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/login" className="mc-btn">
            Log in
          </Link>
          <Link to="/register" className="mc-btn-ghost">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const setFilter = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setRoute(null);
  };

  return (
    <div className="px-7 py-10">
      <div className="kicker">FIND HOSPITALS</div>
      <h1 className="font-serif text-[32px] font-semibold mb-2">Care near you, right now</h1>
      <p className="text-muted text-[14.5px] mb-6">
        Verified hospitals with live distance, insurance matching and booking in one place.
      </p>

      {locNotice && (
        <div className="text-[13px] bg-amber-wash border border-amber-line rounded-xl px-4 py-3 mb-5 text-[#6B5A2E]">
          {locNotice}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
        <div className="grid md:grid-cols-4 gap-5 items-end">
          <div>
            <label className="block text-[12px] font-extrabold tracking-[1px] text-faint mb-2" htmlFor="f-radius">
              DISTANCE · {filters.radiusKm} KM
            </label>
            <input
              id="f-radius"
              type="range"
              min="1"
              max="50"
              value={filters.radiusKm}
              onChange={(e) => setFilter('radiusKm', Number(e.target.value))}
              className="w-full accent-[#B07818]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-extrabold tracking-[1px] text-faint mb-2" htmlFor="f-spec">
              SPECIALIZATION
            </label>
            <select
              id="f-spec"
              value={filters.specialization}
              onChange={(e) => setFilter('specialization', e.target.value)}
              className="w-full border-[1.5px] border-line rounded-[10px] px-3 py-2.5 text-[14px] bg-white outline-none focus:border-ink transition-colors"
            >
              <option value="">All specializations</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-[13.5px] font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.myInsurance}
              disabled={!user?.insuranceProvider}
              onChange={(e) => setFilter('myInsurance', e.target.checked)}
              className="w-[18px] h-[18px] accent-[#B07818]"
            />
            <span title={user?.insuranceProvider || 'Add insurance to your profile to use this'}>
              My insurance only{user?.insuranceProvider ? ` (${user.insuranceProvider})` : ''}
            </span>
          </label>
          <label className="flex items-center gap-2.5 text-[13.5px] font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.openNow}
              onChange={(e) => setFilter('openNow', e.target.checked)}
              className="w-[18px] h-[18px] accent-[#B07818]"
            />
            Open now
          </label>
        </div>
      </div>

      {apiError ? (
        <div className="bg-white border border-line rounded-[14px]">
          <ErrorState status={apiError.status} message={apiError.message} onRetry={fetchNearby} />
        </div>
      ) : (
        <div className="grid md:grid-cols-[1.35fr_1fr] gap-5 items-start">
          <div>
            {loading && !hospitals.length ? (
              <div className="mc-shimmer h-[380px] md:h-[440px] rounded-[14px]" aria-label="Loading map" />
            ) : (
              <HospitalMap
                center={userLoc || BAHAWALPUR}
                centerKey={locKey}
                hospitals={hospitals}
                selectedId={selected?._id}
                onSelect={(h) => {
                  setSelected(h);
                  setRoute(null);
                  setRouteError('');
                }}
                userLoc={userLoc}
                route={route}
              />
            )}
            <p className="text-[11.5px] text-faint mt-2">
              Map data © OpenStreetMap contributors · Distances are approximate road/straight-line values
            </p>
          </div>

          <div>
            {selected ? (
              <DetailPanel
                h={selected}
                userLoc={userLoc}
                route={route}
                routeLoading={routeLoading}
                routeError={routeError}
                onRoute={showRoute}
                onClearRoute={() => setRoute(null)}
                onBook={() => setBookingFor(selected)}
                onBack={() => {
                  setSelected(null);
                  setRoute(null);
                  setRouteError('');
                }}
              />
            ) : (
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {loading ? (
                  <>
                    <div className="mc-shimmer h-28 rounded-xl" />
                    <div className="mc-shimmer h-28 rounded-xl" />
                    <div className="mc-shimmer h-28 rounded-xl" />
                  </>
                ) : hospitals.length === 0 ? (
                  <div className="bg-white border border-line rounded-xl p-8 text-center">
                    <h4 className="font-serif text-lg font-bold mb-2">No hospitals found</h4>
                    <p className="text-[13.5px] text-muted leading-relaxed">
                      Try a wider distance radius or clear the filters.
                    </p>
                  </div>
                ) : (
                  hospitals.map((h) => (
                    <HospitalCard key={h._id} h={h} selected={false} onPick={setSelected} />
                  ))
                )}
              </div>
            )}
            {!selected && !loading && hospitals.length > 0 && (
              <p className="text-[12px] text-faint mt-3">
                {hospitals.length} hospital{hospitals.length === 1 ? '' : 's'} · {formatDate(new Date())} · click a
                card or pin for details
              </p>
            )}
          </div>
        </div>
      )}

      {bookingFor && (
        <BookingModal
          hospital={bookingFor}
          onClose={() => setBookingFor(null)}
          onBooked={() => {
            /* confirmation lives inside the modal; dashboard shows the booking */
          }}
        />
      )}
    </div>
  );
}
