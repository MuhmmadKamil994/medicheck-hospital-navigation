# MediCheck — Phase 4a: Frontend Foundation + Home + Auth (COMPLETE)

Vite + React (plain JS) + react-router-dom + axios + Tailwind CSS v3.
Design-C "Triage Console" system, per the approved mockup
(`~/workspace/fyp-design-samples/direction-c-triage-console.html`).

## Run

```bash
cd ~/workspace/fyp-medicheck/client
cp .env.example .env        # set VITE_API_URL (default http://localhost:5000)
npm install
npm run dev                 # http://localhost:5173
npm run build               # production build → dist/
```

## Routes

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Full mockup replica; working triage console |
| `/login` | Login | Centered card, SDD §7.2 |
| `/register` | Register | Centered card, TC-02 fields |
| `/hospitals` | ComingSoon | Phase 4b: Leaflet map + filters |
| `/dashboard` | ComingSoon | Phase 4b: user dashboard v2 |
| `*` | NotFound | On-brand 404, always a way home |

Hash anchors: `/#how-it-works` (booking steps), `/#faq` (trust Q&A) —
`ScrollManager` in App.jsx smooth-scrolls to them.

## Components

```
src/
  main.jsx                    ReactDOM root + <AuthProvider>
  App.jsx                     BrowserRouter, ScrollManager, PageShell
                              (EmergencyStrip + Navbar + Routes + Footer),
                              branded splash while session restores
  index.css                   Tailwind + craft CSS: slip perforation,
                              rubber stamp, map pulse, skeleton shimmer,
                              spinner, live-dot, .mc-btn/.mc-link/.mc-card-hover
  api/client.js               axios instance; VITE_API_URL (default
                              http://localhost:5000); request interceptor
                              attaches JWT as Bearer; parseApiError() normalises
                              {message, errors:[{field,message}], status}
  context/AuthContext.jsx      user/token/initialising, login(), register(),
                              logout(), fetchMe on mount, isAuthenticated
  components/
    Logo.jsx                  pulse SVG (light variant for footer)
    EmergencyStrip.jsx        1122 safety banner (every page)
    Navbar.jsx                sticky; active-link state; guest → Login/Register,
                              authed → avatar initials + Dashboard + Logout
    LiveTicker.jsx            live activity strip
    SymptomForm.jsx           textarea + toggle chips (synced), severity
                              segmented control, duration pills, Analyze w/
                              spinner + disabled state + empty-input validation
    TriageSlip.jsx            states: idle | loading (shimmer skeleton) |
                              result | error | login-required.
                              Stamp maps SDD enum → emergency(red EMERGENCY) /
                              semi-urgent(amber WITHIN 24 HOURS) /
                              routine(green ROUTINE). Perforated edges,
                              disclaimer, "Find hospitals near me" → /hospitals
    AuthForm.jsx              shared Field/EyeToggle/inputCls/errorsToMap/
                              usePasswordToggle for login+register
    Footer.jsx                4 columns per mockup (Product/Resources/Emergency)
  pages/
    Home.jsx                  ALL mockup sections: ticker, triage console,
                              emergency shortcut, 3-step stepper, why-section,
                              4 booking steps, map teaser (hand-drawn SVG +
                              static hospital rows), stats band, trust Q&A,
                              CTA, disclaimer
    Login.jsx                 generic 401 preserved (never reveals which field
                              was wrong — SDD TC-03); per-field errors under
                              fields; redirects to /dashboard when authed
    Register.jsx              fullName/email/password(min 8, show-hide)/
                              confirm(client match check)/phoneNumber(03XX
                              hint)/dateOfBirth/insuranceProvider(optional);
                              per-field server errors; auto-login → /dashboard
    NotFound.jsx              "This page took a wrong turn at the hospital."
    ComingSoon.jsx            honest placeholder so no nav link ever dead-ends
```

## Design tokens (tailwind.config.js)

- `ink` #1B2A41 / `ink-deep` #141F33 / `ink-slate` #3A4A68
- `amber` #B07818 / `amber-bright` #E8A33D / `amber-wash` #FBF4E4 / `amber-line` #EBD9AE
- `paper` #FAF7F1, `sand` #F1ECE0, `cream` #F4EEE1, `line` #E5DECF
- `muted` #5C6B84, `faint` #8A7B5C
- `urgency-red` #B91C1C, `urgency-amber` #B45309, `urgency-green` #2E7D62
- `font-serif` Newsreader/Georgia, `font-sans` Inter/system-ui
- No gradients, no emoji icons (inline SVG only), 60-30-10 rule,
  150–250ms transitions, focus-visible rings, responsive <860px single column.

## Deviations (documented, deliberate)

1. **Guest analyze degrades gracefully.** Backend `POST /api/symptoms/analyze`
   requires JWT (`router.use(auth)` in server/src/routes/symptoms.js), so a
   true guest call 401s. The frontend attempts the call; on 401-for-guest it
   shows an on-brand "One quick step first" nudge (Login / Create account)
   preserving the entered symptoms — never a blank screen or raw error.
   To make guest analyze real, the backend needs a tiny change: token-optional
   analyze that skips saving the SymptomRecord (recommended; ~10 lines).
2. **Idle slip is an honest empty state**, not the mockup's sample report —
   showing a fake "diagnosis" before any analysis would be misleading.
   Same slip chrome (perforation, header), centered "Your report appears here".
3. **`/hospitals` and `/dashboard` are ComingSoon placeholders** — every nav
   link stays alive; Phase 4b replaces them with real pages.

## Verified 2026-10-05 (this VM)

- ✅ `npm install` clean; `npm run build` succeeds, 94 modules, no errors
- ✅ `vite` dev server boots on :5173; index.html served with correct title
- ✅ All key modules transform 200 via dev server (Home/Login/Register/
      TriageSlip/AuthContext/api client) — no JSX/import errors
- ✅ Bundle contains all components (dist grep: TRIAGE REPORT, MediCheck)
- ⚠️ API calls untestable here — backend needs Atlas (egress proxy blocks
  TLS from this VM). UI handles all failure modes with friendly states:
  502 → "Analysis temporarily unavailable", 401-guest → login nudge,
  network down → "Cannot reach the server…". Re-verify live from Render.

## Phase 4b must build

1. **Hospitals page** (`/hospitals`): Leaflet + react-leaflet map (new dep),
   browser geolocation → `GET /api/hospitals/nearby?lat=&lng=` (+ radiusKm,
   specialization, insurance, openNow filters), hospital cards with
   `distanceKm` + `insuranceMatch`, detail view, OSRM route overlay
   (`GET /api/hospitals/route`, fall back to straight line on 503).
2. **Booking flow**: pick hospital → date/time slot → `POST
   /api/appointments/book` → confirmation from `appointment` object
   regardless of `sms.sent` (demo mode sends nothing real).
3. **User dashboard** (`/dashboard`): health timeline + appointment token
   card + nudge (approved v2 structure in `~/workspace/fyp-design-samples/dashboards.html`);
   data from `GET /api/symptoms/history` + `GET /api/appointments`;
   cancel via `DELETE /api/appointments/:id`.
4. **Admin pages**: separate admin login (`POST /api/admin/login`, store
   admin token apart from user token), hospitals CRUD table, appointments
   table with status PATCH (surface 400 transition messages), users table
   with deactivate (403-at-login behaviour).
5. **Polish**: print-friendly triage report, 404 audit, mobile pass,
   `VITE_API_URL` prod value, deploy frontend (Vercel) + backend (Render).

## Secrets hygiene

No secrets in this repo. `.env` is gitignored; only `.env.example`
(VITE_API_URL placeholder) is committed. JWT lives in localStorage
(`medicheck_token`) — XSS-mitigated per SDD Ch.5 (short-lived 24h tokens,
sanitised rendering).
