# MediCheck — Phase 2: Core APIs (COMPLETE)

Symptom triage (Gemini), hospital map APIs (nearby/geocode/route), admin auth.
Conventions follow Phase 1: CommonJS, express-validator + `validate`,
`asyncHandler`, `dbGuard` 503s, uniform `{success:false, message, errors?}`.

## New endpoints

| Method | Route | Auth | Purpose | Key behaviours |
|---|---|---|---|---|
| POST | `/api/symptoms/analyze` | Bearer JWT | AI urgency triage + save record | body `symptoms[1..20]` (each ≤100 chars), `severity?` ∈ mild/moderate/severe, `duration?` ≤50 chars → `201 {recordId, urgencyLevel, conditionDescription, disclaimer}` · Gemini failure → `502` "Analysis temporarily unavailable, please try again" · `503` DB down |
| GET | `/api/symptoms/history` | Bearer JWT | Own symptom checks, newest first | `200 {count, records[]}` (recordId, symptomsEntered, urgencyLevel, conditionDescription, createdAt) |
| DELETE | `/api/symptoms/:id` | Bearer JWT | Delete own record | `404` when id invalid OR belongs to someone else (never leaks existence) |
| POST | `/api/admin/login` | — | Admin sign-in | `{email, password}` → `200 {token, admin}`; token payload `{id, role:'superadmin', kind:'admin'}` 24h. **No register route** (SDD 1.5). Same 100/15min rate limit as `/api/auth`. |
| GET | `/api/hospitals/nearby` | Bearer JWT | Hospitals within radius | query `lat` `lng` (required), `radiusKm` 1–50 default 10, `specialization?`, `insurance?`, `openNow?` → `$near` on 2dsphere index + filters; each result adds `distanceKm` (haversine, 1 decimal) and `insuranceMatch` (vs user's `insuranceProvider`, case-insensitive) |
| GET | `/api/hospitals/:id` | Bearer JWT | Full hospital detail | `404` when missing |
| POST | `/api/hospitals/geocode` | Bearer JWT + `requireAdmin` | address → {lat,lng} via Nominatim | proper `User-Agent` header, in-process 1 req/sec throttle, `countrycodes=pk` bias · `404` no result · `502` service down |
| GET | `/api/hospitals/route` | Bearer JWT | Road route via OSRM | `fromLat/fromLng/toLat/toLng` → `{distanceKm, durationMin, geometry (GeoJSON LineString)}` · `503` when OSRM unreachable (client falls back to straight-line distance) |

## Files added

```
src/utils/geo.js                 haversineKm(lat1,lng1,lat2,lng2) -> km
src/utils/dbGuard.js             shared 503-when-DB-down guard (extracted from authController pattern)
src/services/geminiService.js    analyzeSymptoms(); strict-JSON prompt; SDD enum mapping;
                                 error classes: GEMINI_NO_KEY / GEMINI_AUTH / GEMINI_TIMEOUT /
                                 GEMINI_NETWORK / GEMINI_BAD_RESPONSE (all -> 502 to client)
src/controllers/symptomController.js   analyze / history / remove
src/controllers/hospitalController.js  nearby / detail / geocode / route
src/controllers/adminController.js     admin login (role-claim JWT)
src/routes/symptoms.js  src/routes/hospitals.js  src/routes/admin.js
src/middleware/requireAdmin.js   403 unless req.user.role === 'superadmin'
scripts/seedHospitals.js         idempotent seed of 8 Bahawalpur hospitals
scripts/createAdmin.js           manual admin creation: node scripts/createAdmin.js <user> <email> <pass>
```

`src/server.js`: mounted `/api/symptoms`, `/api/hospitals`, `/api/admin`; `/api/admin`
shares the auth rate limiter.

## Gemini prompt (verbatim, sent as the single `parts[0].text`)

> You are a medical triage assistant for a university final-year project. A patient
> describes symptoms; you classify the urgency and describe the likely condition
> in plain, everyday words.
>
> Symptoms: {comma list} / Severity: {…} / Duration: {…}
>
> Classification rules — urgency_level must be exactly one of:
> - "emergency": life-threatening signs (severe chest pain, difficulty breathing,
>   stroke signs, heavy bleeding, loss of consciousness) → ER immediately.
> - "within_24_hours": concerning but not immediately life-threatening
>   (high persistent fever, spreading rash, severe pain, continuous vomiting).
> - "routine": mild, common, likely self-limiting (mild cold, light headache,
>   minor aches) → normal GP appointment.
>
> Writing rules: 1–2 sentences, plain words, never claim a diagnosis
> ("may suggest" / "often associated with"), no medication/dosages.
>
> Respond with STRICT JSON only — no markdown, no fences, no extra text:
> {"urgency_level":"emergency|within_24_hours|routine","condition_description":"..."}

Model output is mapped to the SDD enum: `emergency→emergency`,
`within_24_hours→semi-urgent`, `routine→routine` (plus tolerant variants).
Every response carries the disclaimer:
"This is automated guidance, not a medical diagnosis. Please consult a qualified doctor."

## IMPORTANT findings (2026-10-05, verified live)

1. **SDD §4.1 model `gemini-pro` is RETIRED** — v1beta returns 404
   "models/gemini-pro is not found". Also, this account tier (new user) is
   refused 2.x models ("no longer available to new users"). **Default is now
   `gemini-3.5-flash-lite`** (verified working), overridable via `GEMINI_MODEL`.
   **SDD §4.1 needs a one-line endpoint update** in the report:
   `.../models/gemini-3.5-flash-lite:generateContent` (or "current supported model").
2. **The stored Gemini key (AQ.Ab8… format) is VALID** — it authenticated fine
   and ListModels worked. The unusual format is not a problem.
3. **Timeout:** SDD 5s kept as default (`GEMINI_TIMEOUT_MS`), but this VM's
   proxy adds ~10–15s latency to Google APIs, so live calls from here exceed
   it. From Render/prod the 5s budget should hold; re-verify at deploy.
4. **Nominatim + OSRM both reachable from this VM** and returned real data:
   geocode("Bahawal Victoria Hospital, Circular Road, Bahawalpur") →
   29.3900142, 71.6818314 (used in seed); OSRM test route → 3.1 km / 6 min
   with GeoJSON geometry. No billing, no keys — as decided.
5. **Atlas still unreachable from this VM** (egress proxy TLS interception —
   known). All DB paths 503 cleanly; seed/createAdmin fail with clear messages.

## Verified 2026-10-05 (this VM, curl)

- ✅ `node --check` on all 13 new/changed files
- ✅ Server boots; `/api/health` 200
- ✅ analyze: 401 (no token), 401 (garbage token), 400 (empty symptoms array + per-field message), 503 (valid token + good body, DB down)
- ✅ history: 401 no token · delete: 400 bad id
- ✅ nearby: 401 no token, 400 missing lat, 400 radiusKm=999, 503 valid query (DB down)
- ✅ route: 400 missing params; **200 real OSRM route** (3.1 km, 6 min, LineString)
- ✅ geocode: 401 no token, **403 user-token** ("Admin access required"), **200 admin-token** (real Nominatim coords)
- ✅ admin/login: 400 bad body, 503 good body (DB down)
- ✅ hospital detail: 400 bad id
- ✅ **Gemini end-to-end (service level):** `GEMINI_OK` — input
  fever/body aches/sore throat → `urgencyLevel: "semi-urgent"`,
  plain-words `conditionDescription`, disclaimer attached. (17s via VM proxy;
  the 5s production timeout applies at the HTTP layer.)
- ✅ haversine sanity: Lahore–Islamabad ≈ 266.6 km; same point = 0
- ✅ seedHospitals / createAdmin fail gracefully (clear message, exit 1) with DB down

## Seed data (scripts/seedHospitals.js)

8 entries, idempotent (skips if any hospitals exist). Bahawal Victoria Hospital
coordinates **verified via Nominatim** (29.3900142, 71.6818314); the other 7 are
**approximate** around Bahawalpur (29.3956, 71.6722) and marked as such in
comments — Jhon's homework (real addresses/phones) will refine them:
BVH, Civil Hospital, Al-Shifa Medical Clinic, City Care Clinic,
Noor Medicare Hospital, Model Town Medical Centre, Gulberg Dental & Medical
Clinic, Shalimar Medical Clinic (one seeded inactive to exercise the filter).

## What Phase 3 needs

1. **Appointments API** — `POST /api/appointments` (validate hospitalId, future
   date, HH:MM slot; status pending), `GET /api/appointments` (own, upcoming),
   `PATCH /api/appointments/:id/cancel` (own only); admin `GET /api/appointments/all`
   + `PATCH /:id/status` (pending→confirmed/cancelled) behind `requireAdmin`.
2. **SMS service (pluggable)** — `src/services/smsService.js` with interface
   `sendSms(to, message)`; **demo-mode implementation now** (logs + returns
   `{sent:false, mode:'demo'}` — Twilio trial unavailable in PK, local gateway
   like Eocean later). Wire: booking confirmation + `node-cron` reminder job
   (runs hourly, sends for appointments within next 24h where `reminderSent=false`).
   **No real Twilio code.**
3. **Redis caching** (optional if time) — cache `nearby` results 5 min by
   query hash; needs Upstash URL in `.env` (`REDIS_URL`), graceful skip if unset.
4. **Deploy checklist** — re-run: register→login→analyze(201)→nearby(200)→
   book→admin login→seed, from Render (Atlas reachable there); confirm Gemini
   5s timeout holds in prod; set `CORS_ORIGIN` to the frontend domain.
5. **SDD report updates** (for Jhon's docs): §4.1 model endpoint
   (`gemini-3.5-flash-lite`), §4.3 SMS provider paragraph (pluggable
   Twilio/Eocean/demo-mode — Torque to write), §3.4 tools table (Leaflet/OSM
   instead of Google Maps, per build decision).

## Secrets hygiene

All secrets live in `server/.env` (chmod 600, gitignored) and
`/home/hatch/workspace/fyp-medicheck/.secrets/` (chmod 600). No secret value
appears in code, logs, notes, or this file. Never commit `.env`.
