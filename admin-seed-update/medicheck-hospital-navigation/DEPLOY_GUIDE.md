# MediCheck — Deploy Guide (for Jhon: click-by-click)

Everything technical is already prepared (auto-seed, `.env.example`,
`vercel.json`). You only do the **clicks and pastes** below — no code.
Estimated total time: **30–45 minutes**.

**Accounts you need** (all free): GitHub, Render, Vercel, MongoDB Atlas
(already made), Google AI Studio key (already saved).

**Your setup:** ONE repo — `MuhmmadKamil994/medicheck-hospital-navigation` —
with both folders inside it (`server/` + `client/`).

---

## Step 1 — Push the code to GitHub (one repo)

The zip (`medicheck-hospital-navigation.zip`) already has both folders.
Extract it, then in PowerShell **inside the folder where you can see both
`server` and `client`** (check with `dir`):

```powershell
cd "C:\path\to\medicheck-hospital-navigation"
git init
git add .
git commit -m "MediCheck FYP - initial commit"
git branch -M main
git remote add origin https://github.com/MuhmmadKamil994/medicheck-hospital-navigation.git
git push -u origin main
```

> Password puche to **GitHub password nahi chalega** — Personal Access Token
> chahiye: github.com → profile → Settings → Developer settings →
> Personal access tokens → Tokens (classic) → Generate new token
> (`repo` tick) → token copy karke password ki jagah paste karo.
>
> Agar push `rejected` kahe (repo mein pehle se README hai):
> `git pull origin main --allow-unrelated-histories` phir dobara push.
>
> Kabhi `.env` upload mat karo — GitHub par sirf `.env.example`
> nazar aana chahiye.

---

## Step 2 — Deploy the backend on Render (Web Service)

1. Go to **dashboard.render.com** → **New +** → **Web Service**.
2. **Connect GitHub** (authorize Render if asked) → select your repo
   `medicheck-hospital-navigation`.
3. Settings:
   - **Name:** `medicheck-api` (or anything you like)
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Environment → Add Environment Variable**, paste these:
   - `MONGODB_URI` → your Atlas connection string (the long
     `mongodb://...` one, with the real password and `/medicheck` in it)
   - `GEMINI_API_KEY` → your Gemini key (ask Torque if you lost it)
   - `JWT_SECRET` → any long random string you make up
     (e.g. `kamil-final-year-2026-secret-key-xyz`) — **write it down**
   - `CORS_ORIGIN` → leave **empty for now** (you'll fill it after Step 4)
   - The rest (`SMS_PROVIDER=demo`, `ENABLE_REMINDERS`, `SEED_ON_BOOT`)
     already have defaults — don't touch them.
5. Click **Deploy**. Wait 3–5 minutes. The **Logs** tab should end with:
   `[server] MediCheck API listening on port ...` and
   `[seed] auto-seeded 8 hospitals on first boot` (first deploy only).
6. Copy your backend URL from the top of the page — it looks like
   `https://medicheck-api-xxxx.onrender.com`. **Save it; Step 4 needs it.**
7. Quick check: open `https://YOUR-BACKEND-URL/api/health` in the browser —
   you should see `{"success":true,...}`.

---

## Step 3 — Create the first admin account

Render's free tier has **no Shell**, so the admin is bootstrapped from
environment variables instead (the server creates it once on boot):

1. In the Render service page → **Environment** tab → **Add Environment Variable**:
   - `SEED_ADMIN_EMAIL` = your admin email (e.g. `admin@medicheck.local`)
   - `SEED_ADMIN_PASSWORD` = a strong password (≥ 8 characters — **write it down**,
     it can't be recovered, only reset)
2. **Manual Deploy → Deploy latest commit** (env changes need a redeploy).
3. In **Logs**, look for:
   `[seed] admin account created for admin@medicheck.local — DELETE the SEED_ADMIN_* env vars now`
4. **Important (security):** delete both `SEED_ADMIN_*` variables from Environment
   and redeploy once more, so the password no longer sits in the config.
   (The admin account stays in the database — only the bootstrap vars are removed.)

> Paid Render plans: you can also use the **Shell** tab:
> `node scripts/createAdmin.js <username> <email> <password>`
>
> If the hospital auto-seed ever didn't run (older build), the same Shell
> command `node scripts/seedHospitals.js` fills them in — it skips safely if
> hospitals already exist.

---

## Step 4 — Deploy the frontend on Vercel

1. Go to **vercel.com** → **Add New…** → **Project** → **Import** the
   SAME repo: `medicheck-hospital-navigation`.
2. **Root Directory:** click **Edit** → set it to `client`.
3. Framework preset: **Vite** (auto-detected). Leave build settings as-is
   (`vercel.json` handles them).
4. **Environment Variables** → add one:
   - Name: `VITE_API_URL`
   - Value: your Render backend URL from Step 2.6
     (e.g. `https://medicheck-api-xxxx.onrender.com` — **no trailing slash**)
5. Click **Deploy**. Wait 2–3 minutes → you get a live URL like
   `https://medicheck-hospital-navigation.vercel.app`. **Save it.**

## Step 5 — Connect frontend ↔ backend (CORS)

1. Back in **Render** → your `medicheck-api` service → **Environment** tab.
2. Find `CORS_ORIGIN` → **paste your Vercel URL**
   (e.g. `https://medicheck-hospital-navigation.vercel.app`) → **Save changes**.
3. Render redeploys automatically (~2 min). Without this step the browser
   blocks frontend→backend calls.

---

## Step 6 — End-to-end verification checklist

Open your **Vercel URL** and walk through every SDD test case:

| # | SDD case | What to do | Pass if… |
|---|---|---|---|
| TC-01 | Home page | Open the site | ticker, triage console, slip demo, map teaser, footer all render |
| TC-02 | Registration | Register a new account | lands on dashboard with welcome message |
| TC-03 | Login | Log out, log back in | dashboard opens; wrong password → clean error |
| TC-04 | Symptom analysis | **Without logging in**: type `fever, body aches` → Analyze | urgency badge + condition + disclaimer appear (guest mode — NEW, no login needed); log in and repeat → result also appears in dashboard history |
| TC-05 | Hospital map | `/hospitals` → allow location (or type Bahawalpur manually) | pins on map; Cardiology filter narrows list; click pin → detail card |
| TC-06 | Booking | Book → pick date/time → Confirm | token-style confirmation; appointment in dashboard; (demo SMS logged server-side) |
| TC-07 | Insurance | Hospital detail vs your profile insurance | green "accepted" / grey "not listed" badge |
| TC-08 | Admin | `/admin/login` with the Step-3 account | KPIs load; Hospitals tab → add/edit a hospital → it appears on the user map; confirm a pending appointment; deactivate a test user → that user gets 403 at login |

Also verify on your **phone** (mobile layout) — examiners often open it there.

---

## Troubleshooting

- **Site feels slow on first open / API "wakes up" slowly** — Render's free
  tier sleeps after ~15 min idle; the first request takes 30–50s, then it's
  fast. Before the defence, open the site once 2 minutes early.
- **Frontend shows "Cannot reach the server"** — 99% cause: `CORS_ORIGIN`
  on Render doesn't exactly match the Vercel URL (no trailing slash), or
  `VITE_API_URL` on Vercel is wrong. Fix the value → both redeploy
  automatically.
- **API returns 503 "Database unavailable"** — Atlas: Network Access must be
  `0.0.0.0/0` (allow anywhere); the DB user's password in `MONGODB_URI`
  must be exact. Check Render → Logs for `[db] MongoDB connected`.
- **Symptom analysis says "temporarily unavailable"** — `GEMINI_API_KEY`
  wrong/revoked, or the 5s timeout tripped on a slow network. Check Render
  logs for `GEMINI_AUTH` vs `GEMINI_TIMEOUT`.
- **Map shows no hospitals** — the auto-seed runs only on first boot with an
  empty collection. Run `node scripts/seedHospitals.js` in Render Shell.
- **Lost admin password** — re-run the Step-3 command with a new password
  (delete the old admin first via Atlas dashboard if the username clashes).

## What NOT to do

- Never paste `.env` contents into GitHub, chat screenshots, or the report.
- Never commit `server/.env` (it's gitignored — leave it that way).
- Don't change `SMS_PROVIDER` from `demo` unless a real gateway (Eocean) is
  configured — anything else throws on purpose.
