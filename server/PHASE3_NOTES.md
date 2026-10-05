# MediCheck — Phase 3: Booking + Notifications + Admin APIs (COMPLETE)

Appointments (book/list/cancel), pluggable SMS service (demo mode),
30-minute reminder cron job, admin appointment/user management.
Conventions follow Phases 1–2: CommonJS, express-validator + `validate`,
`asyncHandler`, `dbGuard` 503s, uniform `{success:false, message, errors?}`.

## New endpoints

| Method | Route | Auth | Purpose | Key behaviours |
|---|---|---|---|---|
| POST | `/api/appointments/book` | Bearer JWT | Book appointment + confirmation SMS | body `hospitalId` (MongoId), `appointmentDate` (ISO, today-or-future), `appointmentTime` (HH:MM 24h) → hospital must exist + `availabilityStatus:true` (else 404/400) → `201 {appointment, sms:{sent, mode}}` · SMS failure never fails the booking (SDD 4.3) |
| GET | `/api/appointments` | Bearer JWT | Own appointments, upcoming first | `200 {count, appointments[]}` (hospital populated: name/address), sorted `appointmentDate` asc |
| DELETE | `/api/appointments/:id` | Bearer JWT | Cancel own appointment | `404` when id invalid OR belongs to someone else · `400` if already cancelled or date is past |
| GET | `/api/admin/appointments` | admin | All appointments, newest first | query `status?` ∈ pending/confirmed/cancelled, `date?` (YYYY-MM-DD calendar day) · populates user (name/email/phone) + hospital (name/address) |
| PATCH | `/api/admin/appointments/:id` | admin | Confirm / cancel booking | `{status:'confirmed'\|'cancelled'}` · transition map enforced: pending→confirmed/cancelled, confirmed→cancelled, cancelled→∅ (else 400) |
| GET | `/api/admin/users` | admin | Paginated user list | `page`/`limit` (default 20, max 100) · `passwordHash` NEVER returned (`select -passwordHash`) |
| PATCH | `/api/admin/users/:id` | admin | Deactivate / reactivate | `{isActive:boolean}` · deactivated users get 403 at login (see deviation note) |

Auth notes: `/api/appointments/*` uses the user JWT; `/api/admin/*` management
routes sit behind `auth` + `requireAdmin` (403 "Admin access required").
`/api/admin` shares the auth rate limiter (100/15min).

## Files added / changed

```
src/services/smsTemplates.js          bookingConfirmation(), appointmentReminder()
                                      (SDD 4.3 wording), formatDate() helper
src/services/smsService.js            PLUGGABLE SMS: sendSms({to,message}) ->
                                      {sent, mode, messageId?, preview?}.
                                      SMS_PROVIDER env (default 'demo').
                                      'demo': logs masked preview, no network.
                                      'twilio': stub that THROWS (no SDK code —
                                      trial unavailable in Pakistan).
                                      Future 'eocean' slots straight in.
src/controllers/appointmentController.js  book / list / cancel
src/controllers/adminManagementController.js  listAppointments /
                                      updateAppointmentStatus / listUsers / setUserActive
src/routes/appointments.js            POST /book, GET /, DELETE /:id (JWT)
src/routes/admin.js                   + management routes behind auth+requireAdmin
src/jobs/reminderJob.js               node-cron every 30 min (see below);
                                      exports runReminderJob(deps) for unit tests
src/server.js                         mounts /api/appointments; starts cron
                                      unless ENABLE_REMINDERS=false
src/models/User.js                    + isActive Boolean (default true)
src/controllers/authController.js     login now 403s deactivated accounts
.env / .env.example                   + SMS_PROVIDER=demo, ENABLE_REMINDERS=true
package.json                           + node-cron
```

## SMS provider design (+ how to add Eocean later)

Callers only ever use `sendSms({ to, message })`. The provider is picked once
at load from `SMS_PROVIDER` (default `demo`). Adding a local gateway later is
a ~15-line addition to `src/services/smsService.js` and nothing else:

```js
eocean: {
  async send({ to, message }) {
    const res = await fetch(process.env.EOCEAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.EOCEAN_API_KEY, to, message }),
    });
    const data = await res.json();
    return { sent: true, mode: 'eocean', messageId: data.message_id };
  },
},
```

then set `SMS_PROVIDER=eocean` + `EOCEAN_API_URL`/`EOCEAN_API_KEY` in `.env`.
Demo mode keeps the full booking/reminder flow testable (booking SMS +
reminder job both run; `reminderSent` flips) with zero network and zero cost.
Phone numbers are masked (`***4567`) in every log line — no PII in logs.

## Reminder job behaviour

- Schedule: `*/30 * * * *` (every 30 minutes), started from `src/server.js`
  unless `ENABLE_REMINDERS=false`.
- Query: `status='confirmed'`, `reminderSent=false`, `appointmentDate`
  between start-of-today and now+24h. (Lower bound is start-of-today, not
  "now", because `appointmentDate` is stored at midnight — a later-today
  appointment must still qualify.)
- Per appointment: send `appointmentReminder` SMS → set `reminderSent=true`.
  A send failure still sets `reminderSent=true` so one bad record can never
  cause an infinite reminder loop. Each record is try/caught independently.
- DB down → job logs and skips (`{skipped:true, reason:'db-down'}`), no crash.
- `runReminderJob({ AppointmentModel, sms })` accepts injected deps so the
  logic is unit-testable without MongoDB or waiting 30 minutes.

## Deviation vs SDD (documented, deliberate)

`User.isActive` (Boolean, default true) does not exist in SDD 3.12.1. Added
because the admin "Deactivate user" use case (SDD 3.7/3.8) needs a mechanism;
without it the button would be decorative. Effect: deactivated users get
`403` at login with a plain message; existing JWTs expire naturally (24h).
One-line addition for Jhon's report if the examiner cross-checks the data
dictionary: "isActive (Boolean, default true) — set by admin to suspend an
account; checked at login."

## Verified 2026-10-05 (this VM, curl + node)

- ✅ `node --check` on all 10 new/changed files
- ✅ Server boots; cron logs `[reminders] cron scheduled (every 30 minutes)`; `/api/health` 200
- ✅ book: 401 no token, 401 garbage token, 400 bad body (per-field errors:
  hospitalId/date/time), 503 valid token + good body (DB down)
- ✅ list: 401 no token, 503 valid token (DB down)
- ✅ cancel: 400 bad id, 503 good id (DB down)
- ✅ admin: 401 no token, **403 user-token** ("Admin access required"),
  503 admin-token (DB down), 400 bad `status` filter, 400 bad PATCH status,
  400 bad `page`, 400 bad `isActive`
- ✅ **smsService demo (isolated, no network):** `{sent:true, mode:'demo',
  messageId, preview(60 chars)}`; log shows masked `to=***4567` only;
  missing args throws; `SMS_PROVIDER=twilio` throws the "not configured" error
- ✅ **Reminder job (unit-style, stubbed models):** due appointment →
  1 SMS sent with correct reminder text, `reminderSent=true`, saved;
  no-phone record → no SMS but still marked (no loop); DB-down →
  `{skipped:true, reason:'db-down'}`
- ⚠️ Full booking SMS path (201 + live sms object) not exercisable here —
  Atlas unreachable from this VM (egress proxy TLS interception, known).
  Re-verify end-to-end from Render at deploy (Phase 2 deploy checklist).

## Phase 4 (frontend) handoff notes

- Backend base URL: `http://localhost:5000` (dev) — frontend calls
  `/api/*` with `Authorization: Bearer <token>` (user) or admin token.
- Booking flow: `POST /api/appointments/book` returns `201 {appointment,
  sms:{sent, mode}}` — show the on-screen confirmation from `appointment`
  regardless of `sms.sent` (SDD 4.3: SMS is best-effort; demo mode sends
  nothing real). In demo mode the "SMS" only appears in server logs.
- Response shapes: appointment objects use `appointmentId` (not `_id`);
  hospital nested as `{hospitalId, name, address}`; user dashboard list is
  already sorted upcoming-first.
- Admin token: `POST /api/admin/login` → `{token, admin}`; use it for all
  `/api/admin/*` calls. No admin registration exists by design.
- Statuses: appointment `pending|confirmed|cancelled`; admin PATCH only
  accepts `confirmed|cancelled` with transition rules (surface the 400
  message to the admin UI, e.g. "Cannot change status from 'cancelled'…").
- Users list: `GET /api/admin/users?page=&limit=` → `{page, limit, total,
  totalPages, users[]}` (no passwordHash, includes `isActive`).
- Reminder job needs no frontend work; it runs server-side every 30 min.

## Appendix — SDD §4.3 update paragraph (for Jhon's report)

> **4.3 SMS Interface (revised).** SMS delivery is implemented behind a
> pluggable provider interface (`sendSms({to, message})`) selected by
> configuration. The development and demonstration build uses a demo-mode
> provider that logs the message and records delivery status without
> contacting a carrier, so the booking and reminder flows are fully testable
> at zero cost. A Twilio provider stub is included but not activated, as
> Twilio trial accounts are unavailable in Pakistan. For production, a local
> gateway provider (e.g. Eocean) can be plugged into the same interface
> without changing any calling code; credentials are held in server-side
> environment variables and never exposed to the client.

## Secrets hygiene

All secrets remain in `server/.env` (chmod 600, gitignored) and
`/home/hatch/workspace/fyp-medicheck/.secrets/` (chmod 600). Phase 3 added
no new secrets (`SMS_PROVIDER=demo`, `ENABLE_REMINDERS=true` are
non-sensitive). No secret value appears in code, logs, or this file.
