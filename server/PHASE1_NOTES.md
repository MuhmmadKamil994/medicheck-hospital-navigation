# MediCheck — Phase 1: Backend Foundation (COMPLETE)

Backend API foundation for the Symptom Checker and Hospital Navigation System.
Stack: Node.js + Express + Mongoose (MongoDB Atlas) + JWT + bcrypt.

## How to run

```bash
cd ~/workspace/fyp-medicheck/server
npm install        # first time only
npm run dev        # dev with auto-reload (node --watch)
npm start          # production
```

Server listens on `PORT` from `.env` (default 5000).
Copy `.env.example` → `.env` and fill real values. **Never commit `.env`**
(the repo is public — `.gitignore` already excludes it and `node_modules/`).

## Endpoints

| Method | Route | Auth | Body | Success response | Errors |
|---|---|---|---|---|---|
| GET | `/api/health` | — | — | `200 {status:'ok', timestamp}` | — |
| POST | `/api/auth/register` | — | `fullName`, `email`, `password` (min 8), `phoneNumber` (11 digits, `03…`), `dateOfBirth?`, `insuranceProvider?` | `201 {success:true, token, user}` (passwordHash never returned) | `400` validation per-field errors · `409` email taken · `503` DB down |
| POST | `/api/auth/login` | — | `email`, `password` | `200 {success:true, token, user}` | `400` validation · `401` "Invalid email or password" (generic on purpose — never reveals which field was wrong, per SDD TC-03) · `503` DB down |
| GET | `/api/auth/me` | Bearer JWT | — | `200 {success:true, user}` | `401` no/invalid/expired token · `404` user gone · `503` DB down |

JWT: signed with `JWT_SECRET`, payload `{id}`, **24h expiry** (SDD Ch.5).
Passwords: **bcrypt, salt factor 10** (SDD 3.3). Rate limit: **100 req / 15 min / IP**
on `/api/auth/*`. Security headers via `helmet`, JSON body limit `10kb`, CORS enabled.
All errors share one shape: `{success:false, message, errors?}`.

## Database models (per SDD §3.12 data dictionary)

| Model | File | Key fields |
|---|---|---|
| User | `src/models/User.js` | fullName, email (unique), passwordHash, phoneNumber (`/^03\d{9}$/`), dateOfBirth, insuranceProvider, createdAt |
| SymptomRecord | `src/models/SymptomRecord.js` | userId → User, symptomsEntered[≤20], geminiResponse (≤2000), urgencyLevel ∈ emergency/semi-urgent/routine, createdAt |
| Hospital | `src/models/Hospital.js` | name, address, **location: GeoJSON Point `[lng,lat]` + 2dsphere index**, specializations[], operatingHours, insuranceAccepted[], availabilityStatus, contactNumber |
| Appointment | `src/models/Appointment.js` | userId → User, hospitalId → Hospital, appointmentDate (not past), appointmentTime `HH:MM`, status ∈ pending/confirmed/cancelled, reminderSent (default false), createdAt |
| Admin | `src/models/Admin.js` | username (unique), email (unique), passwordHash, role (default `superadmin`) — created manually, **no self-register route** |

## Project structure

```
server/
  src/
    server.js            # express app, security stack, route mounts, boot
    config/db.js         # mongoose connect (non-blocking) + isDbReady()
    models/              # 5 Mongoose models (above)
    routes/              # auth.js, health.js
    controllers/         # authController.js (register/login/me)
    middleware/          # auth.js (JWT), validate.js (express-validator),
                         # errorHandler.js (uniform JSON errors)
    utils/               # asyncHandler.js
  .env                   # real secrets (600 perms, gitignored) — NOT in repo
  .env.example           # placeholder names only
  .gitignore             # .env, node_modules, logs
  package.json           # start / dev scripts
```

## Verified 2026-10-05 (this VM)

- ✅ `npm install` — 110 packages, no errors
- ✅ Server boots, `GET /api/health` → `200 {status:'ok'}`
- ✅ `POST /api/auth/register` bad data → `400` with per-field messages
- ✅ `POST /api/auth/register` good data → `503` "Database unavailable" (correct graceful path — see below)
- ✅ `GET /api/auth/me` no token → `401`; garbage token → `401`
- ✅ Unknown route → `404`; bcrypt + JWT primitives round-trip tested OK
- ⚠️ **Live DB tests blocked:** this VM's egress proxy intercepts direct
  MongoDB Atlas TLS (handshake fails before auth), so register→201, login→200/401
  and /me→200 could not run end-to-end here. The code paths are correct and the
  503 fallback is proven; **re-run the auth flow once deployed (Render) or from
  Jhon's machine.**

## What Phase 2 adds

1. `POST /api/symptoms/analyze` — Gemini API urgency triage (emergency /
   semi-urgent / routine) + save SymptomRecord; `GET /api/symptoms/history` (user's past checks).
2. `GET /api/hospitals/nearby?lat=&lng=&radius=` — 2dsphere geo-query with
   specialization / insurance / availability filters (Redis-cached); hospital
   detail endpoint.
3. `POST /api/appointments` (+ list/cancel) and admin hospital CRUD.
4. Admin auth routes (`POST /api/admin/login`, role check middleware).
5. Seed script with real Bahawalpur hospitals (Nominatim geocoding for coords).
