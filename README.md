# Nakandulo

**National Blood Bank Shortage Forecasting Network**

Nakandulo is a centralized data engine for tracking blood supply across regional hubs, predicting cold-chain depletion, routing emergency dispatch between hospitals, and sending SMS alerts for rare phenotype matches.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | TanStack Start (React 19), Vite 7, Tailwind v4, shadcn/ui, Recharts |
| Server logic | TanStack `createServerFn` (typed RPC) + `/api/public/*` server routes |
| Database & Auth | Lovable Cloud (managed Supabase Postgres) with Row-Level Security |
| SMS | Twilio via Lovable connector gateway |
| Runtime | Cloudflare Workers (SSR) |
| Forecasting | Server-side ordinary least squares (no external ML service) |

---

## Modules

1. **Auth & Roles** — Email + Google sign-in; `app_role` enum (`admin`, `hub_staff`, `hospital_requester`, `donor`); roles stored in a separate `user_roles` table and checked via a `has_role()` SECURITY DEFINER function.
2. **Hubs, Hospitals, Inventory** — `hubs`, `hospitals`, `blood_units` (ABO+Rh + phenotype, FEFO expiry), `inventory_snapshots` (daily rollup).
3. **Cold-chain monitoring** — `cold_chain_readings` with a 2–6 °C safe band; out-of-band rows flagged and surfaced on `/app/cold-chain`.
4. **Shortage forecasting** — 30-day linear regression per hub × blood group; results persisted in `shortage_forecasts` and rendered at `/app/forecasts`.
5. **Requests & dispatch** — Hospitals create `blood_requests`; a server function ranks candidate hubs by stock, distance, and expiry (FEFO) and writes a `dispatches` plan.
6. **Rare-phenotype SMS alerts** — Matching donors are notified via Twilio; results stored in `match_alerts`.
7. **Dashboards** — Role-aware home, reports, and admin views built with Recharts.

---

## Routes

```
src/routes/
  __root.tsx          # SSR shell
  index.tsx           # public landing
  auth.tsx            # sign-in / sign-up
  reset-password.tsx
  app.tsx             # authenticated shell (sidebar + outlet)
  app.index.tsx       # role-aware dashboard
  app.inventory.tsx
  app.cold-chain.tsx
  app.forecasts.tsx
  app.requests.tsx
  app.dispatch.tsx
  app.alerts.tsx
  app.reports.tsx
  app.settings.tsx
  api/public/
    cron.refresh-forecasts.tsx
    alerts.broadcast.tsx
```

---

## Database

Twelve tables in `public`: `profiles`, `user_roles`, `hubs`, `hospitals`, `blood_units`, `inventory_snapshots`, `cold_chain_readings`, `shortage_forecasts`, `blood_requests`, `dispatches`, `match_alerts`, `audit_log`. Every table has RLS enabled and explicit `GRANT`s. New auth users are seeded into `profiles` + `user_roles` by the `handle_new_user` trigger.

See **`nakandulo-architecture.pdf`** for the full ERD and architecture diagram.

---

## How cold-chain monitoring works

- Sensors POST readings into `cold_chain_readings(hub_id, storage_unit, temp_c, recorded_at, is_alert)`.
- Safe band: **2 °C ≤ temp_c ≤ 6 °C**. Rows outside the band are stored with `is_alert = true`.
- `/app/cold-chain` queries the last 500 readings, groups by `hub · storage_unit`, and plots them with a green Recharts `ReferenceArea` over the safe band. The *Recent alerts* panel lists `is_alert = true` rows.
- RLS scopes data so hub staff only see their own hub's readings.
- Critical excursions enqueue a Twilio SMS to hub_staff phone numbers stored in `profiles.phone`.

**Configuration knobs**
- Safe band constants live in the route file — change in one place to retune.
- Sensor ingestion is a hub-scoped `createServerFn`.
- Twilio credentials are stored as project secrets, never in client code.

---

## How shortage forecasting works

Implemented in `src/routes/api/public/cron.refresh-forecasts.tsx`.

**Inputs (per `hub × blood_group × rh`)**
- `current_units` — `COUNT(blood_units) WHERE status = 'available'`.
- `history` — trailing 30 days of `inventory_snapshots.units_available`.

**Algorithm — ordinary least squares slope**

Treat snapshot index `i` as `x` and `units_available` as `y`:

```
slope m = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²
avg_daily_consumption = max(0, −m)
projected_days_remaining = current_units / avg_daily   (capped at 999)
```

**Risk band**

| days_remaining | risk |
|---|---|
| < 3  | critical |
| < 7  | high |
| < 14 | medium |
| ≥ 14 | low |

**Storage & UI**
- Each pass writes a row into `shortage_forecasts` (`current_units`, `avg_daily_consumption`, `projected_days_remaining`, `shortage_risk`, `computed_at`).
- `/app/forecasts` orders by `projected_days_remaining` ascending so the most urgent rows appear first; a color-coded badge shows the risk band.

**Configuration**
- Endpoint: `POST /api/public/cron/refresh-forecasts` — idempotent.
- Scheduling: nightly via pg_cron or any external scheduler, plus a *Refresh* button in the UI that calls the same route.
- Tuning knobs (constants in the route file): history window (30 days), risk thresholds (3 / 7 / 14), FEFO filter (`status = available`).
- For production, add an HMAC check against a `CRON_SECRET` on this route.

---

## Local development

```bash
bun install
bun run dev
```

Lovable Cloud manages the database and auth — no separate Supabase setup is required.

## Secrets

Set via the Secrets panel:
- `LOVABLE_API_KEY` (auto)
- `TWILIO_API_KEY` (for SMS)
- `CRON_SECRET` (recommended, for the forecast cron route)

## Deployment

Hosted on Lovable Cloud (Cloudflare Workers SSR + managed Postgres). Stable URLs:
- Production: `project--<id>.lovable.app`
- Preview: `project--<id>-dev.lovable.app`

Use these for Twilio webhooks and external cron schedules — they're immutable.
