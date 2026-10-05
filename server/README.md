# MediCheck — Server (Backend API)

Node.js + Express REST API for the **Symptom Checker and Hospital Navigation
System** (BSIT final-year project, Islamia University of Bahawalpur).

Implements SDD §3 (architecture), §3.12 (data models), §4 (external
interfaces) and §6 (test cases). Frontend lives in `../client/`.

## Tech

Express 5 · Mongoose (MongoDB Atlas) · JWT + bcryptjs · Gemini API (symptom
triage) · Leaflet/OpenStreetMap + Nominatim + OSRM (maps — no Google billing)
· pluggable SMS service (demo-mode default) · node-cron reminders ·
helmet / CORS / express-rate-limit / express-validator.

## Run locally

```bash
cd server
npm install
cp .env.example .env        # then fill in the values below
npm run dev                 # auto-reload, or: npm start
```

API base: `http://localhost:5000` · health check: `GET /api/health`

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | yes | Google AI Studio key for symptom triage |
| `JWT_SECRET` | yes | 64-hex-char secret for signing tokens (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `GEMINI_MODEL` | no | default `gemini-3.5-flash-lite` (SDD §4.1's `gemini-pro` is retired) |
| `GEMINI_TIMEOUT_MS` | no | default `5000` |
| `SMS_PROVIDER` | no | `demo` (default, logs only) — future: `eocean` |
| `ENABLE_REMINDERS` | no | `true` — 30-min cron sending 24h appointment reminders |
| `SEED_ON_BOOT` | no | `true` — auto-seeds 8 demo hospitals on first boot if empty |
| `CORS_ORIGIN` | prod only | frontend URL(s), comma-separated (e.g. `https://medicheck.vercel.app`) |
| `PORT` | no | default `5000` (Render injects its own) |

> Never commit a real `.env` — it is gitignored. Secrets for this project are
> kept outside the repo.

## Useful scripts

```bash
node scripts/seedHospitals.js                      # idempotent: seeds 8 Bahawalpur hospitals (skips if any exist)
node scripts/createAdmin.js <username> <email> <password>   # manual admin account (SDD 1.5: no self-registration)
```

## API overview

Full endpoint table (method · route · auth · purpose) is in
`../SDD_UPDATES.md` (Appendix — REST API table, ready to paste into the SDD).

Highlights:

- `POST /api/symptoms/analyze` — **guest-friendly** (no token needed): Gemini
  triage, saves a `SymptomRecord` only for logged-in users
- `GET /api/hospitals/nearby?lat&lng&radiusKm&specialization&...` — 2dsphere
  geo-query, Redis-free, Haversine/OSRM distances
- `POST /api/appointments/book` — booking + best-effort SMS (never fails the booking)
- `POST /api/admin/login` + `/api/admin/*` — hospital CRUD, appointment
  management, user list/deactivate (JWT + `requireAdmin`)

Uniform responses: `{success:true, ...}` / `{success:false, message, errors?}`.
DB unreachable → `503` (server stays up; `/api/health` keeps answering).

## Deploy (summary)

Render Blueprint from `render.yaml` (see `../DEPLOY_GUIDE.md` for the
click-by-click guide): paste `MONGODB_URI`, `GEMINI_API_KEY`, `CORS_ORIGIN`
in the dashboard; `JWT_SECRET` is auto-generated. `SEED_ON_BOOT=true`
seeds demo hospitals on first boot; create the admin via Render Shell:
`node scripts/createAdmin.js <username> <email> <password>`.
