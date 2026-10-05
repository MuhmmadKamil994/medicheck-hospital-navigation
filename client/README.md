# MediCheck — Client (Frontend)

React 19 + Vite + Tailwind CSS v3 single-page app for the **Symptom Checker
and Hospital Navigation System** (BSIT final-year project).

Design: **"Triage Console"** (Direction C) — product-first triage console,
medical-slip result with rubber stamp, hand-drawn-feel SVG map, live ticker,
emergency shortcut. Palette: Ink Navy `#1B2A41` · Amber Gold `#B07818` ·
Paper `#FAF7F1` (see `../../fyp-design-samples/color-package.html`).
Backend lives in `../server/`.

## Tech

React 19 · react-router-dom 7 · Tailwind v3 · axios (JWT interceptor) ·
Leaflet 1.9 + OpenStreetMap tiles (plain Leaflet — no react-leaflet) ·
Vite 8 build with route code-splitting.

## Run locally

```bash
cd client
npm install
cp .env.example .env        # optional locally: defaults to http://localhost:5000
npm run dev                 # http://localhost:5173
```

The backend must be running too (`../server`: `npm run dev`).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | prod only | backend base URL, **no trailing slash** (e.g. `https://medicheck-api.onrender.com`). Locally defaults to `http://localhost:5000`. |

Set it in the **Vercel dashboard** (Project → Settings → Environment
Variables) when deploying — never hard-code it.

## Pages

- `/` — home: live ticker, triage console (guest-friendly), slip+stamp
  result, why/how-it-works, hospital teaser, stats, Q&A, CTA, footer
- `/hospitals` — Leaflet map: geolocation + manual fallback, OSM tiles,
  custom pins, distance/specialty/insurance filters, detail panel, OSRM
  route overlay (straight-line fallback), booking modal
- `/dashboard` — user: health timeline, appointment token card, nudge
- `/login`, `/register`, `/404`
- `/admin/login`, `/admin/*` — admin console: sidebar, search bar, KPIs,
  attention strip, tabbed tables, hospital CRUD (Nominatim helper),
  appointment status, user deactivate

## Build & deploy (summary)

```bash
npm run build   # -> dist/ (gitignored)
```

Deploy on Vercel: import the repo, set `VITE_API_URL` to the Render backend
URL, deploy. `vercel.json` handles the build and SPA fallback routing.
Full click-by-click guide: `../DEPLOY_GUIDE.md`.

## Notes

- Guest symptom checks work without login (backend saves history only for
  logged-in users); history/delete stay protected.
- Print stylesheet included for the triage slip (the "print report" moment).
- No secrets in this repo — the only env var is the public API URL.
