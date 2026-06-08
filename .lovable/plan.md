
# Nakandulo — National Blood Bank Shortage Forecasting Network

A centralized data engine for tracking blood supply across regional hubs, predicting cold-chain depletion, routing emergency dispatch between hospitals, and sending SMS alerts for rare phenotype matches.

## Design (defaults chosen)
- Palette: Clinical Navy `#0c2340` + Crimson `#c0392b` on near-white surfaces; dark sidebar.
- Typography: Space Grotesk (headings) + DM Sans (body).
- Layout: Dashboard shell (sidebar + top bar + panels) for staff/admin; clean public landing for donors/hospitals.

## Tech stack
- Frontend: TanStack Start + React 19, Tailwind v4, shadcn/ui, Recharts.
- Backend: TanStack `createServerFn` + server routes (`/api/public/*` for webhooks/cron).
- Database & Auth: Lovable Cloud (Supabase) with RLS.
- SMS: Twilio via Lovable connector gateway.
- Forecasting: server-side linear regression on recent daily consumption (no external ML service).

---

## Modules

### 1. Auth & Roles
- Email/password + Google sign-in via Lovable broker.
- `app_role` enum: `admin`, `hub_staff`, `hospital_requester`, `donor`.
- Separate `user_roles` table + `has_role()` SECURITY DEFINER fn.
- `profiles` table (display_name, phone, blood_type, phenotype, hub_id/hospital_id).
- Protected routes under `src/routes/_authenticated/` (integration-managed gate).

### 2. Hubs, Hospitals, Inventory
- `hubs` (regional donation/storage centers, geo lat/lng, capacity).
- `hospitals` (geo lat/lng, contact).
- `blood_units` (hub_id, blood_type ABO+Rh, phenotype tags, volume_ml, collected_at, expires_at, status: available/reserved/dispatched/expired/discarded).
- `inventory_snapshots` (daily rollup per hub × blood_type for forecasting).

### 3. Cold-Chain Monitoring
- `cold_chain_readings` (hub_id, storage_unit, temp_c, recorded_at).
- Threshold rules: temp outside 2–6 °C → flag depletion risk; server fn computes "time to depletion" estimate from temp drift.
- Alerts surfaced in dashboard + optional SMS to hub_staff.

### 4. Shortage Forecasting
- Server fn aggregates last 30 days of consumption per hub × blood_type.
- Simple linear regression → projected days-until-shortage given current stock & expiry curve.
- Cron-style endpoint `/api/public/cron/refresh-forecasts` (signature-protected) recomputes nightly; also recomputable on demand by admin.
- Output stored in `shortage_forecasts` for fast dashboard reads.

### 5. Blood Requests & Emergency Dispatch
- `blood_requests` (hospital_id, blood_type, phenotype_required, units_needed, urgency: routine/urgent/critical, status).
- Dispatch routing: server fn ranks candidate hubs by (a) stock availability, (b) haversine distance, (c) expiry priority (FEFO). Returns ordered dispatch plan.
- `dispatches` (request_id, hub_id, unit_ids[], status, eta_minutes, created_at).

### 6. Rare Phenotype SMS Match Alerts
- When a request requires a rare phenotype, server fn finds matching donors (`profiles` with matching phenotype + opt-in) and sends SMS via Twilio gateway.
- `match_alerts` log table (request_id, donor_id, sent_at, twilio_sid, status).
- Cold-chain critical events also trigger SMS to hub_staff on that hub.

### 7. Dashboards & Reporting
- **Admin dashboard**: nationwide stock heatmap-ish grid by region × blood type, active shortages, cold-chain incidents, dispatch throughput, alert volume.
- **Hub staff**: own hub inventory, expiring soon (FEFO list), cold-chain charts, incoming dispatch requests.
- **Hospital requester**: create requests, dispatch tracking, history.
- **Public/donor**: shortage map by region, eligibility & sign-up, opt-in for rare-phenotype alerts.

### 8. Security
- RLS on every table; policies scoped via `has_role(auth.uid(), …)` and ownership (hub_id / hospital_id / user_id).
- Twilio + cron secret stored via secrets tool, only used server-side.
- Webhook/cron routes verify HMAC signature; Zod validation on all server fn inputs.
- Service-role client only inside server fns; never imported by components.
- Audit log table for dispatch and alert events.

### 9. Cloud Deployment Notes (documented in `/docs` route + README)
- Hosted on Lovable Cloud (Cloudflare Workers SSR + Supabase managed Postgres).
- Stable URLs `project--{id}.lovable.app` for Twilio webhooks & external cron.
- Secrets: `TWILIO_API_KEY`, `LOVABLE_API_KEY` (auto), `CRON_SECRET`.
- Scaling: stateless server fns; durable state in Postgres; SMS rate handled via Twilio.

---

## Routes (TanStack file-based)
```
src/routes/
  __root.tsx
  index.tsx                      # public landing + shortage map
  auth.tsx                       # sign-in/up
  donor-signup.tsx               # public donor opt-in
  _authenticated/
    route.tsx                    # (managed) gate
    dashboard.tsx                # role-aware home
    inventory.tsx                # hub inventory mgmt
    cold-chain.tsx               # readings + alerts
    forecasts.tsx                # shortage projections + charts
    requests.tsx                 # hospital requests list
    requests.new.tsx             # create request
    requests.$id.tsx             # request detail + dispatch plan
    dispatches.tsx               # active dispatches
    alerts.tsx                   # match alert log
    admin.hubs.tsx               # admin: hubs CRUD
    admin.users.tsx              # admin: role mgmt
    reports.tsx                  # aggregation dashboards
  api/
    public/cron/refresh-forecasts.ts
    public/webhooks/twilio-status.ts
```

## Database (single migration with GRANTs + RLS)
Tables: `profiles`, `user_roles`, `hubs`, `hospitals`, `blood_units`, `inventory_snapshots`, `cold_chain_readings`, `shortage_forecasts`, `blood_requests`, `dispatches`, `match_alerts`, `audit_log`. Enums: `app_role`, `blood_type`, `rh_factor`, `urgency`, `unit_status`, `request_status`, `dispatch_status`.

Seed data: ~8 hubs (Manila, Cebu, Davao, etc.), ~6 hospitals, ~200 blood_units across types/expiries, 30 days of inventory_snapshots & cold_chain_readings, 3 demo requests, 5 demo donors with rare phenotypes.

## Server functions (`src/lib/*.functions.ts`)
- `inventory.functions.ts` — list/update units, FEFO query.
- `cold-chain.functions.ts` — submit reading, list alerts.
- `forecast.functions.ts` — compute & fetch forecasts.
- `requests.functions.ts` — create request, compute dispatch plan, accept/dispatch.
- `alerts.functions.ts` — find rare-phenotype matches, send SMS via Twilio gateway, log.
- `reports.functions.ts` — aggregation queries for dashboards.
- All write fns use `requireSupabaseAuth`; admin maintenance fns load `supabaseAdmin` inside handler.

## Build order
1. Enable Lovable Cloud; create migration (enums, tables, RLS, GRANTs, seed).
2. Connect Twilio; store cron secret.
3. Auth pages + role bootstrap.
4. App shell (sidebar, role-aware nav) + design tokens in `src/styles.css`.
5. Inventory + cold-chain modules.
6. Forecasting engine + cron route.
7. Requests + dispatch routing.
8. Rare phenotype SMS alerts + Twilio webhook.
9. Reporting dashboards (Recharts).
10. Public landing + donor signup + `/docs` deployment notes.
11. Security scan + fix.

## Out of scope (call out for follow-up)
- Real geographic map tiles (we'll use a region grid + lat/lng table; can add Mapbox later).
- Full ML model (linear regression is intentional for MVP).
- Mobile app / native push.
- Multi-country i18n.
