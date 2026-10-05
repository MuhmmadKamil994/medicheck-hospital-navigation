# MediCheck — Phase 4b: Hospital Map + Booking + Dashboards + Polish (COMPLETE)

Vite + React 19 + react-router-dom 7 + axios + Tailwind v3 + **plain Leaflet**
(no react-leaflet — no stable React 19 release; direct Leaflet is deterministic).
Design-C "Triage Console" system throughout; mockup refs:
`~/workspace/fyp-design-samples/direction-c-triage-console.html` (map section)
and `~/workspace/fyp-design-samples/dashboards.html` (v2 dashboards).

## Run

```bash
cd ~/workspace/fyp-medicheck/client
cp .env.example .env        # set VITE_API_URL (default http://localhost:5000)
npm install                  # pulls leaflet
npm run dev                  # http://localhost:5173
npm run build                # dist/ — code-split (Leaflet chunk separate)
```

## Routes (new / changed)

| Route | Page | Notes |
|---|---|---|
| `/hospitals` | Hospitals.jsx | **Replaces ComingSoon.** Geolocation → `GET /api/hospitals/nearby` |
| `/dashboard` | Dashboard.jsx | **Replaces ComingSoon.** User dashboard v2 (exact approved structure) |
| `/admin/login` | admin/AdminLogin.jsx | Separate dark sign-in; admin token stored apart |
| `/admin` | admin/AdminLayout.jsx | Dark sidebar shell + `RequireAdmin` guard |

Hash anchors `/#how-it-works`, `/#faq` still work (ScrollManager untouched).

## What was built

**Hospitals page** (`src/pages/Hospitals.jsx`, `src/components/HospitalMap.jsx`)
- Browser geolocation with graceful fallback: denied/unsupported → Bahawalpur
  (29.3956, 71.6722) + amber notice banner ("Enable location for true nearby results").
- Leaflet map, OSM tiles, custom divIcon pins (navy; amber when selected — no
  image assets, so no Vite broken-icon issue), pulsing user-location dot.
- Filter bar: distance slider 1–50 km (350 ms debounce), specialization select
  (9 options), "My insurance only" toggle (uses `user.insuranceProvider`; disabled
  with hint when unset), "Open now" toggle.
- Hospital cards: `distanceKm` + insuranceMatch badge + open/closed dot.
  Click card or pin → detail panel (address, hours, contact, specializations,
  insurance list + match banner).
- **Route overlay**: "Show route" → `GET /api/hospitals/route` → amber polyline
  from GeoJSON geometry + distance/duration chips. On **503** (OSRM down) draws a
  dashed slate straight line from `distanceKm` instead — never crashes.
- **Booking** (`BookingModal.jsx`): date picker (today-or-future only) + time-slot
  pills (09:00–17:00) → `POST /api/appointments/book` → token-style confirmation
  built from `appointment` regardless of `sms.mode` (demo mode: "SMS confirmation
  logged in demo mode — no real SMS was sent"). Per-field 400 errors under fields.

**User dashboard v2** (`src/pages/Dashboard.jsx`) — approved structure exactly
- Header with "+ New symptom check" CTA; 3 stat cards (checks, upcoming visits,
  emergency flags) with inline SVG icons.
- **Health timeline**: vertical line, urgency-coloured dots, date/symptoms/
  truncated AI summary, `UrgencyBadge`, "View report →" opens the **real triage
  slip** (`TriageSlip` in `result` state) in a modal — same chrome, stamp, print button.
- **Right rail**: next appointment as dark perforated **token card**
  (perforation via dashed border + punched circles) with Get directions / Cancel
  (`DELETE /api/appointments/:id`, 400 message surfaced); "Suggested next step"
  nudge derived from last urgency (emergency → act now, semi-urgent → book today,
  routine → all clear).
- Empty states: "No checks yet — run your first triage", "No upcoming visits".
  Friendly `ErrorState` for 401/502/network.

**Admin console** (`src/pages/admin/`)
- `AdminLogin.jsx`: dark card, generic 401 message (never reveals which field),
  show/hide password, redirects to `/admin` when authed.
- `AdminContext.jsx`: `medicheck_admin_token` in localStorage — fully separate
  from the user token. Session restore probes `GET /api/admin/users?limit=1`
  (no `/me` endpoint exists); 401/403 drops the token.
- `RequireAdmin.jsx`: splash while initialising, redirect to `/admin/login` otherwise.
- `AdminLayout.jsx`: dark sidebar (Dashboard/Hospitals/Appointments/Users/Logout)
  + mobile top bar; sidebar switches the overview's tabs.
- `AdminOverview.jsx`: top **search bar** (client-side filter across the active tab),
  **4 KPI cards** (users, hospitals, today's appointments, pending review),
  **"Needs attention" strip** (inactive hospitals, unconfirmed appointments),
  **tabbed tables**:
  - *Hospitals*: from `GET /api/hospitals/nearby` (Bahawalpur, 50 km — includes
    inactive, which the patient map hides). Add/Edit/Delete via `HospitalModal`
    → `POST/PATCH/DELETE /api/admin/hospitals` (**new backend endpoints**, see below).
    "Find coordinates" button → `POST /api/hospitals/geocode` (Nominatim).
  - *Appointments*: status filter → `GET /api/admin/appointments?status=`; Confirm /
    Cancel buttons → `PATCH …/appointments/:id`; the backend's **400 transition
    message is surfaced verbatim** ("Cannot change status from 'cancelled'…").
  - *Users*: paginated (`GET /api/admin/users?page=`, Prev/Next), deactivate /
    reactivate toggle (`PATCH …/users/:id {isActive}`), Active/Inactive pills.

**Polish**
- Print-friendly triage report: "Print this report" button on the slip; `@media print`
  CSS hides nav/strip/footer/modals (`.no-print`) and prints only the slip.
- 404 audit: every `to=`/`href=` in `src/` resolves to a real route or anchor —
  no dead links. Footer gained a subtle "Admin console" link.
- Mobile: all new grids collapse to single column <860px; admin gets a mobile top bar.
- Loading skeletons (shimmer) on map, dashboard, admin; `ErrorState` covers
  401 → login nudge, 502/503 → "temporarily unavailable", network → "cannot reach server".
- Code-splitting: Hospitals/Dashboard/AdminLogin/AdminLayout are `React.lazy`
  chunks — landing bundle stays lean (Leaflet = separate 167 kB chunk).

## Backend addition (documented deviation)

`admin.js` shipped **without** the SDD 3.7 hospital CRUD, so the admin table would
have been decorative. Added, following existing conventions
(express-validator + `validate`, `auth` + `requireAdmin`, `dbGuard` 503s,
`asyncHandler`):

| Method | Route | Body |
|---|---|---|
| POST | `/api/admin/hospitals` | name*, latitude*, longitude*, address?, specializations[]?, operatingHours?, insuranceAccepted[]?, availabilityStatus?, contactNumber? |
| PATCH | `/api/admin/hospitals/:id` | any of the above (lat/lng rebuild the GeoJSON Point) |
| DELETE | `/api/admin/hospitals/:id` | — |

Files: `server/src/controllers/adminManagementController.js` (+Hospital model,
`hospitalFromBody`), `server/src/routes/admin.js` (+validation chains).
`node --check` + route-require smoke test pass.

## Other deviations (documented, deliberate)

1. **Plain Leaflet instead of react-leaflet** — no stable React 19 release of
   react-leaflet exists; direct Leaflet via ref/effect is deterministic and
   StrictMode-safe (cleanup removes the map).
2. **Admin hospital list via `/api/hospitals/nearby`** (Bahawalpur, 50 km) — no
   `GET /api/admin/hospitals` existed; nearby already returns everything the
   table needs, including inactive hospitals the patient map would hide.
3. **`mc-btn` / `mc-btn-ghost` / `mc-link` are now complete primitives** in
   `index.css` (`@layer components`) — Phase 4a defined `mc-btn` as
   transitions-only, which left bare usages unstyled. Existing paired usages
   (e.g. `mc-btn … bg-urgency-red`) still win via utilities-layer specificity.

## Verified 2026-10-05 (this VM)

- ✅ `npm install` (leaflet) clean; `npm run build` succeeds — 109 modules,
  code-split chunks, no errors
- ✅ `vite` dev server boots on :5173; index 200; Hospitals/Dashboard/
  AdminOverview/AdminLogin/HospitalMap all transform 200 — no JSX/import errors
- ✅ 404 audit: all link targets resolve
- ✅ No secrets in `src/`; `.env.example` holds only `VITE_API_URL`
- ⚠️ API flows untestable here — backend needs Atlas (egress proxy blocks TLS
  from this VM). Every call site handles 401/400/404/502/503/network-down with
  friendly UI. **Re-verify end-to-end from Render at deploy.**

## Phase 5 deploy checklist

- [ ] Backend on Render: set env `VITE_API_URL` — no wait, that's frontend.
  Backend env: `MONGODB_URI` (Atlas), `GEMINI_API_KEY`, `GEMINI_MODEL`
  (default `gemini-3.5-flash-lite`), `JWT_SECRET`, `SMS_PROVIDER=demo`,
  `ENABLE_REMINDERS=true`, `CORS_ORIGIN=https://<vercel-app>.vercel.app`
- [ ] Verify Atlas Network Access allows `0.0.0.0/0` (Render has dynamic IPs)
- [ ] Seed hospitals: `node server/src/seed/bahawalpur.js` (8 hospitals, Phase 2)
- [ ] Create admin account manually in DB (no self-registration by design)
- [ ] Frontend on Vercel: set `VITE_API_URL=https://<render-app>.onrender.com`,
  `npm run build`, confirm `/hospitals` map loads tiles (OSM reachable from browser)
- [ ] End-to-end: register → triage → hospitals → book → SMS log on Render →
  dashboard token → admin login → confirm appointment → user sees confirmed
- [ ] Defence rehearsal: keep Render warm (free tier sleeps — hit the site once
  before the demo), verify Twilio stays in demo mode
