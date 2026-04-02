# Minutes Matter — Complete Application Documentation

**Repository:** `wildfire-alert-system` (npm package name) · **Product names:** Minutes Matter, WildfireAlert (used interchangeably in UI and copy).  
**Documentation methodology:** This file is built from the **shipped codebase** (`app/`, `components/`, `lib/`, `supabase/migrations/`, `app/api/`), plus **`docs/DATA_SOURCES_AND_FLOWS.md`**, **`docs/RESPONSIBLE_AI.md`**, and **`anishadocs/`** where cited. It is **not** a line-by-line audit of every component file; routes and behaviors are verified against entrypoints and migrations.

**Last updated:** 2026-04-02

---

## Table of Contents

1. [Product Overview](#1-product-overview)  
2. [User Types & Journeys](#2-user-types--journeys)  
3. [Features by User Type](#3-features-by-user-type)  
4. [Flameo AI — Full Explanation](#4-flameo-ai--full-explanation)  
5. [Data Sources & Pipeline](#5-data-sources--pipeline)  
6. [Infrastructure & Tech Stack](#6-infrastructure--tech-stack)  
7. [Database Schema](#7-database-schema)  
8. [API Reference](#8-api-reference)  
9. [Security & Privacy](#9-security--privacy)  
10. [Notification System](#10-notification-system)  
11. [Responsible AI Framework](#11-responsible-ai-framework)  

---

## 1. Product Overview

### What Minutes Matter / WildfireAlert is

A **multi-role web application** for **wildfire awareness, evacuation support, and responder coordination**. The marketing homepage (`app/page.tsx`) positions the product around the tagline **“Every minute counts”** with cycling hero copy (**counts. / saves. / matters.**), demo phone mockup, and CTAs into authentication.

### Core problem

Households need **timely, trustworthy** information about **fire proximity**, **shelters**, **routes**, and **family status** under stress; emergency responders need **operational views** of **consented** evacuee data, **station rosters**, and **field coordination**; analysts need **research surfaces** on fire data, equity, and risk.

### One-line solution statement

**Unify verified fire, weather, shelter, and profile context into role-specific hubs—with Flameo as a grounded AI layer—and enforce consent and RLS for sensitive data.**

### Target users

| Segment | Primary surface |
|---------|-----------------|
| **Consumers (evacuee / legacy caregiver)** | `/dashboard/home` (canonical), maps, check-in, Flameo |
| **Emergency responders** | `/dashboard/responder` (Command hub), station hub, evacuation map |
| **Data analysts** | `/dashboard/analyst` and sub-routes |
| **Field firefighters (iOS-oriented)** | Join via station code; web surfaces for location / clear-house where implemented |

### Differentiators (vs Watch Duty, CodeRED, Everbridge — product intent)

- **Grounded AI (Flameo):** structured **`FlameoContext`** from **NIFC, FIRMS, shelters, weather, hazards** before any consumer briefing/chat (see §4).  
- **Two-tier shelter model:** **FEMA NSS live** + **pre-identified** fallbacks (see §5).  
- **Two-status check-in:** **home evacuation** (responder-visible when consented) vs **person safety** (not shown to responders).  
- **Responder consent + audit:** **`responder_access_log`**, **`ResponderDataConsent`**, RPC-gated updates (see §7–9).  
- **Research stack:** analyst routes for ML, NRI, equity, signal gap, etc., backed by WiDS-style datasets (see `archive/widsdatathon/`, `docs/DATA_SOURCES_AND_FLOWS.md`).

### Product name history

- **WildfireAlert** — brand/string used in AI system prompts, legal pages, and older copy.  
- **Minutes Matter** — primary public name on landing (`app/page.tsx`), emergency card footer (`minutesmatter.app`).

### Deployment

- **Hosting:** **Vercel** (Next.js). **`vercel.json`** defines a cron schedule for **`GET /api/push/check`** (daily at 08:00 UTC).  
- **Domain:** **`minutesmatter.app`** referenced in-app (e.g. emergency card). Exact production URL for a given deployment is an **environment** concern.  
- **Status:** **Research / datathon-class prototype** evolving toward production; **`fire_events`** and some analyst datasets may be **loaded outside** this repo’s migrations (see `docs/DATA_SOURCES_AND_FLOWS.md`).

---

## 2. User Types & Journeys

**Auth & routing:** `middleware.ts` refreshes Supabase session; guards `/dashboard/*` and `/m/dashboard/*`; redirects mobile UA from `/dashboard/...` → `/m/dashboard/...`; redirects legacy **`/dashboard/caregiver/*`** and **`/dashboard/evacuee/*`** → **`/dashboard/home/*`** for **`evacuee` / `caregiver`** roles; can force onboarding when `terms_accepted_at` is missing (consumer).

### 2.1 Consumer (evacuee / legacy caregiver) — canonical “user”

| Step | Screen / route | Data collected / behavior |
|------|----------------|---------------------------|
| 1 | **Marketing** `app/page.tsx` | None (browse). |
| 2 | **Sign up** `app/auth/login/page.tsx` | Email/password or OAuth; role selection includes **Evacuee**; invite verification for gated roles. |
| 3 | **Onboarding** `app/auth/onboarding/page.tsx` | Role-specific: address verification (Places/autocomplete + geocode), **work location** (responder branch differs), **mobility / health** chips, **consent** flags (`location_sharing_consent`, `evacuation_status_consent`, `health_data_consent`, `terms_accepted_at`, responder data consent for ER). |
| 4 | **Email verification** | Supabase Auth; **resend** via `supabase.auth.resend` in login UI when confirmation required. |
| 5 | **Post-login routing** `app/auth/post-login/page.tsx` | Chooses dashboard by role. |
| 6 | **Hub** `/dashboard/home` (also served via legacy caregiver page module per implementation) | Loads **Flameo context**, **ProactiveBriefing**, **Situation Room** components; map/check-in/ai/persons subroutes under `/dashboard/home/*`. |
| 7 | **Ongoing** | Check-in (two statuses), **My People** (family links + local `monitored_persons_v2` where used), alerts, shelter routing, push (optional). |

**Note:** `profiles.role` may still be **`caregiver`** on older rows; migration **`20260404_unify_evacuee_role.sql`** backfills toward **`evacuee`**. Middleware treats caregiver/evacuee consumer paths equivalently for hub routing.

### 2.2 Emergency responder (commander)

| Step | Detail |
|------|--------|
| Signup | **Invite code** flow (`/api/invite/*`, `invite_codes` table). |
| Onboarding | **Station name + verified command post address**; **`POST /api/station/create`** creates **`stations`** + **`station_invite_codes`**. |
| Command hub | `/dashboard/responder` — **Flameo COMMAND** (`FlameoCommandRoom`, command context/briefing APIs). |
| Station code | **Station hub** `/dashboard/responder/station` + Flameo panel — **iOS join code** (format e.g. `STATION-XXXXXX` from `lib/station-invite-code.ts`). |
| Evacuee map | **Consent gate** `ResponderDataConsent`; data from **`/api/responder/evacuees`**, **`profiles_visible_to_responder()`** RPC pattern. |
| Field sync | **`PATCH /api/station/firefighter/location`**, **`POST /api/station/firefighter/clear-house`** (RPC `responder_update_evacuee_home_status`). |

**Infra:** **`SUPABASE_SERVICE_ROLE_KEY`** on the server strongly recommended for roster/station APIs (see `anishadocs/ANISHA_emergency-responder-station-and-consent.md`).

### 2.3 Firefighter (field)

| Step | Detail |
|------|--------|
| Code | Commander-provided **station invite code**. |
| Join | **`POST /api/station/invite/validate`** + **`accept`** creates **`station_firefighters`** membership. |
| Map / tasks | Responder evacuation views; **priority** logic in command Flameo (`lib/flameo-command.ts`, command APIs). |
| Clear house | **`clear-house`** API sets target **`home_evacuation_status`** via RPC when consents allow. |

### 2.4 Data analyst

| Step | Detail |
|------|--------|
| Signup | **Invite-gated** (`data_analyst` role). |
| Hub | `/dashboard/analyst` + tools: **ML**, **Fire Weather**, **Fire Patterns**, **Signal Gap**, **Hidden Danger**, **Equity**, **NRI**, **Live Fire Map**, **Fire Density**, **Trends**, **Data Health**, **Simulation**, **Map** — see §3.4. |

---

## 3. Features by User Type

### 3.1 Consumer features (representative)

| Feature | Route(s) | Data | Who | Implementation notes |
|---------|----------|------|-----|----------------------|
| **My Hub** | `/dashboard/home` | Profile, Flameo context, check-ins | Consumer | Canonical hub; legacy `/dashboard/caregiver` may re-export same module. |
| **Flameo Situation Room** | Hub right rail `components/flameo/FlameoSituationRoom.tsx` | `FlameoContext` | Consumer | Structured panels (situation, locations, routes, My People summary). |
| **My People** | `/dashboard/home/persons`, settings | `caregiver_family_links`, `family_invites`, localStorage `monitored_persons_v2` | Consumer | Mix of **DB-linked** and **client-side** person list per `lib/user-data.ts`. |
| **Check-in** | `/dashboard/home/checkin` | `home_evacuation_status`, `person_safety_status` on `profiles`; `monitored_person_checkins` | Consumer | Two-status model (`20260329_two_status_model.sql`). |
| **Evacuation Map** | `/dashboard/home/map` | NIFC/FIRMS, layers, profile anchor | Consumer | Leaflet (`react-leaflet`). |
| **Shelter routes** | Context + `POST /api/shelter` | Google Routes, hazards, fire buffers | Consumer | Server-side ranking; see `app/api/shelter/route.ts`. |
| **Fire alert range** | Settings / profile | `alert_radius_miles` (default migration `20260331_alert_radius_default_50.sql`) | Consumer | Used in Flameo context radius. |
| **Emergency Card** | `/dashboard/home/emergency-card` | Profile medical/mobility | Consumer | PDF/print; footer **minutesmatter.app**. |
| **Flameo AI chat** | Hub + `/dashboard/home/ai` | `POST /api/ai` + optional `flameoContext` | Consumer | **Grounding** when context attached (see `docs/RESPONSIBLE_AI.md`). |
| **Push** | `PushSetup`, `/api/push/*` | `push_subscriptions`, `fire_events`/FIRMS | Opt-in user | Escalation in `lib/flameo-push-escalation.ts`. |
| **Language switcher** | Sidebar / layout | `lib/languages.ts` (**30** US-focused languages) | All | Google Translate widget + `LanguageProvider`. |
| **Work location + floor** | Onboarding/settings | `work_address`, work geocode fields (`20260406_work_location.sql`) | Consumer | Flameo **`location_anchor`** (`lib/flameo-context-types.ts`). |
| **Live GPS anchor** | Client → `GET /api/flameo/context?liveLat&liveLon` | Session-style coords | Consumer | **`live_differs_from_home`** in context flags. |

### 3.2 Emergency responder features

| Feature | Route / API | Data | Notes |
|---------|-------------|------|-------|
| Command hub | `/dashboard/responder` | Evacuees, fires, Flameo command | `ResponderCommandHubShell`, consent gate. |
| Flameo COMMAND | `GET/POST /api/flameo/command-*` | Roster, assignments | `lib/flameo-command.ts`. |
| Priority assignment | Command briefing | Evacuee list + heuristics | See command briefing route. |
| Household rollup map | `/dashboard/responder/evacuation` | Consented profiles | Map components under `components/responder/`. |
| Firefighter GPS | `PATCH .../firefighter/location` | `station_firefighters` | Realtime-capable table. |
| House cleared | `POST .../clear-house` | RPC updates `home_evacuation_status` | Not a separate `cleared_addresses` table in repo migrations. |
| Station hub | `/dashboard/responder/station` | `stations`, roster, invites | See ANISHA ER doc. |
| Invite regeneration | `POST /api/station/invite/regenerate` | `station_invite_codes` | Commander-only. |
| Data consent gate | `ResponderDataConsent.tsx` | `responder_consent_*` on `profiles` | Updates profile on agree. |
| Access logging | `lib/responder-access-log.ts` | `responder_access_log` | **`20260410_responder_access_log.sql`**. |

### 3.3 Analyst features (routes under `/dashboard/analyst`)

| Feature | Path |
|---------|------|
| Research hub | `/dashboard/analyst` |
| ML | `/dashboard/analyst/ml` |
| Fire Weather | `/dashboard/analyst/fire-weather` |
| Fire Patterns | `/dashboard/analyst/fire-patterns` |
| Signal Gap | `/dashboard/analyst/signal-gap` |
| Hidden Danger | `/dashboard/analyst/hidden-danger` |
| Equity | `/dashboard/analyst/equity` |
| NRI | `/dashboard/analyst/nri` |
| Live Fire Map | `/dashboard/analyst/map` |
| Fire Density | `/dashboard/analyst/fire-density` |
| Trends | `/dashboard/analyst/trends` |
| Data Health | `/dashboard/analyst/data-health` |
| Simulation | `/dashboard/analyst/simulation` |

Data sources mix **CSV assets**, **`fire_events`** (when present in Supabase), and **live APIs** — see each page’s copy and `docs/DATA_SOURCES_AND_FLOWS.md`.

---

## 4. Flameo AI — Full Explanation

### 4.1 What Flameo is

- **Anthropic Claude** via **`@anthropic-ai/sdk`** in **`app/api/ai/route.ts`**.  
- **Production model id (current code):** **`claude-sonnet-4-6`** (confirm when upgrading).  
- **Not only chat:** **Phase A** context is **deterministic**; **Phase B** briefing calls the LLM only when appropriate; **Phase C** chat injects the same structured context.  
- **Responder path:** **Flameo COMMAND** uses **`/api/flameo/command-context`** + **`/api/flameo/command-briefing`**.

Types and fields: **`lib/flameo-context-types.ts`** (`FlameoContext`, `FlameoIncidentNearby`, `FlameoShelterRouteRanked`, `FlameoSheltersMeta`, `FlameoLocationAnchorDetail`, `FlameoContextStatus`, etc.).

### 4.2 Phase A — Context pipeline (no LLM)

**`GET /api/flameo/context`** (`app/api/flameo/context/route.ts`)

- **Inputs:** Authenticated user; profile address/geocode; optional **`liveLat`/`liveLon`**; optional **`contextAddress`** (My People); **`alert_radius_miles`**.  
- **Fetches:** **NIFC** (`/api/fires/nifc` or internal fetch), **NASA FIRMS** (`/api/fires/firms`), **shelters** (FEMA live + pre-identified), **Open-Meteo** weather (`/api/weather`), **hazard sites** (`lib/hazard-facilities.ts`).  
- **Processing:** Haversine distances, anchor selection, shelter ranking, route hints feeding **`shelters_ranked`** / **`shelters_meta`**.  
- **Output:** **`FlameoContextApiResponse`** with **`status`** ∈ `ready | address_missing | geocode_failed | feeds_unavailable | feeds_partial | no_fires_in_radius`.

### 4.3 Phase B — Proactive briefing

**`POST /api/flameo/briefing`** (`app/api/flameo/briefing/route.ts`)

- **Input:** Client sends context or server rebuilds from same pipeline.  
- **LLM:** Only when threat / status rules satisfied (see route + `lib/flameo-briefing.ts`).  
- **Fallback:** Template path when model unavailable.  
- **UI:** `components/flameo/ProactiveBriefing.tsx` on hub mount patterns.

### 4.4 Phase C — Grounded chat

**`POST /api/ai`**

- **`flameoContext`** parsed by **`parseOptionalFlameoContext`** (`lib/flameo-ai-prompt.ts`).  
- **`buildFlameoGroundingPrefix(flameoContext)`** prepends JSON + **`FLAMEO_RESPONSIBLE_AI_GUARDRAILS`** when context present (consumer).  
- **Roles:** **`flameoRole`** `caregiver | evacuee | responder` via **`resolveFlameoAiRole`**.  
- **Tools:** **`FLAMEO_TOOLS`** vs **`COMMAND_INTEL_TOOLS`** (`lib/flameo-phase-c-tools.ts`) with **tool-style** actions for bounded navigation.  
- **Rate limits:** **10/min**, **30/hour** per user or IP (`lib/ratelimit.ts`).

### 4.5 Flameo COMMAND (responder)

- **`GET /api/flameo/command-context`** — builds operational context from roster/evacuees.  
- **`POST /api/flameo/command-briefing`** — dispatch-style briefing.  
- **`lib/flameo-command.ts`** — assignment/priority helpers.

### 4.6 Grounding badge (UI)

`components/FlameoChat.tsx` (and related) expose grounding state—**green / amber / red** style messaging tied to **`FlameoContext.flags`** (`has_confirmed_threat`, `no_data`) and feed health. Exact strings evolve in UI; principle: **visible grounding state for judges/users**.

### 4.7 Guardrails (summary)

| # | Guardrail | Mechanism |
|---|-----------|-----------|
| 1 | Data grounding | `buildFlameoGroundingPrefix` + ACCURACY text in `lib/flameo-ai-prompt.ts` |
| 2 | Hallucination prevention | Instructions: no invented fire names/distances |
| 3 | Medical boundaries | Logistics only; defer clinical advice |
| 4 | Mental health | Crisis Text Line **741741**, **988** per `FLAMEO_RESPONSIBLE_AI_GUARDRAILS` |
| 5 | Scope | No legal/insurance/“ignore order” coaching |
| 6 | Fallback | Generic reply if model returns empty (`app/api/ai/route.ts`) |
| 7 | Rate limit | See §4.4 |

**Caveat (documented in `docs/RESPONSIBLE_AI.md`):** **Standalone** `/dashboard/home/ai` / caregiver AI pages may **omit** `flameoContext` → fewer automatic guardrail injections than **hub-embedded** chat.

### 4.8 What Flameo does vs does not do

| Does | Does not |
|------|----------|
| Summarize **verified** nearby incidents & shelters from context | Invent **unknown** fire perimeters or orders |
| Suggest evacuation **checklists** | Provide **medical diagnosis/treatment** |
| Open **in-app routes** via tools (consumer) | Replace **911** / official channels |
| COMMAND dispatch language for responders | Access raw external APIs inside the model |

---

## 5. Data Sources & Pipeline

**Deep reference:** `docs/DATA_SOURCES_AND_FLOWS.md`.

### 5.1 Fire data

| Source | Role in app |
|--------|-------------|
| **NASA FIRMS** | `GET /api/fires/firms` — hotspots; Flameo + push (`NASA_FIRMS_API_KEY`). |
| **NIFC** | `GET /api/fires/nifc`, `GET /api/active-fires` — incident polygons/points for map + context. |
| **`fire_events` (Supabase)** | Used by push cron, caregiver hub lists, analyst pages — **CREATE may be external** to this repo. |
| **Open-Meteo / NFDRS-style** | `GET /api/fires/raws` — fire weather indices for analyst/responder tooling. |
| **Red Flag** | `GET /api/fires/redflags`. |
| **`GET /api/fires`** | Reads **`fire_events`** from Supabase for consolidated list. |

### 5.2 Shelters (two-tier)

- **Tier 1 — FEMA NSS (ArcGIS):** `app/api/shelters/live/route.ts`, **`lib/fema-live-shelters-query.ts`** — **human** shelters, cached ~**20 minutes** in route memory.  
- **Tier 2 — Pre-identified:** Static HUMAN list when live feed sparse — labeled **unverified** in `FlameoShelterNearby.verified` / `source: pre_identified`.  
- **Why two tiers:** NSS only lists **opened + reported** shelters; planned sites may exist before NSS ingestion.

### 5.3 Weather

- **`GET /api/weather`** — Open-Meteo; **`wind_mph`**, **`temp_f`**, **`fire_risk`**, etc. (`FlameoWeatherSummary`).

### 5.4 Geocoding & Places

- **Client:** **Google Places Autocomplete** — `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` (see onboarding/settings).  
- **Server:** **Google Geocoding** — `GOOGLE_GEOCODING_API_KEY` in `app/api/geocode/forward` / reverse.  
- **Historical note:** Nominatim/OSM mentioned in comments in `flameo-context-types.ts` and transformation story; **current stack is Google** for production-quality geocoding in-app.

### 5.5 Routing

- **`POST /api/shelter`** — **Google Routes API** (`GOOGLE_ROUTES_API_KEY`): duration, distance, **`passes_near_fire`**, hazard proximity, accessibility hints.

### 5.6 Hazard sites

- **`lib/hazard-facilities.ts`** — static **nuclear / chemical / LNG** coordinates for context + routing.

### 5.7 NRI

- **`GET /api/nri`** — FEMA National Risk Index layers (`hazards.fema.gov` in CSP `connect-src`).

---

## 6. Infrastructure & Tech Stack

### 6.1 Frontend

| Tech | Version (package.json) |
|------|-------------------------|
| **Next.js** | **16.1.6** (App Router) |
| **React** | **19** |
| **TypeScript** | **5** |
| **Tailwind CSS** | **3.4.x** |
| **Framer Motion / motion** | **12.x** |
| **Leaflet + react-leaflet** | Map |
| **Recharts** | Analyst charts |
| **Radix / shadcn-style** | `components/ui/*` |
| **Lucide** | Icons |

### 6.2 Backend

- **Next.js Route Handlers** — `app/api/**/route.ts`.  
- **Supabase** — PostgreSQL + Auth + Realtime; **`@supabase/ssr`** for cookies in `middleware.ts` and server clients.  
- **RLS** — enabled on user data tables per migrations.

### 6.3 AI

- **Anthropic Messages API** — `claude-sonnet-4-6` in `app/api/ai/route.ts`.  
- **Optional:** `POST /api/alerts/ai-summarize` for structured alert summaries (env-gated).

### 6.4 External APIs (representative)

Google (Places, Geocoding, Routes), NASA FIRMS, NIFC/ArcGIS, FEMA NSS + NRI, Open-Meteo, Anthropic, **Resend** (`lib/send-family-invite-email.ts` for family invites), **Web Push** + VAPID (`web-push`, `push_subscriptions`).

### 6.5 Hosting & cron

- **Vercel** + **`vercel.json`** cron → **`/api/push/check`**.

### 6.6 Security headers

- **`next.config.js`** — CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, etc. (includes **Google Translate** / Maps origins).

### 6.7 PWA / push

- **`public/sw.js`** — service worker.  
- **Manifest** — under `public/` (if present).  
- **`/api/push/subscribe`** — `POST`/`DELETE` for subscriptions.

### 6.8 Other

- **`app/api/honeypot/route.ts`** — bot trap.  
- **`lib/cors.ts`** — API CORS allowlist used by `middleware.ts`.

---

## 7. Database Schema

**`profiles`** is the **auth-linked** user table (Supabase default); **column additions** are spread across migrations below.

### 7.1 Tables created in `supabase/migrations/` (chronological file order)

| Table | Migration | Purpose |
|-------|-----------|---------|
| **`invite_codes`** | `20260311_invite_codes_and_roles.sql` | Gated signup for analyst/responder. |
| **`push_subscriptions`**, **`checkin_events`** | `20260325_rls_data_isolation.sql` | Web push endpoints; token check-ins. |
| **`evacuee_records`**, **`monitored_person_checkins`**, **`user_alert_items`** | `20260327_consumer_checkins_alerts.sql` | Status + alerts pipeline. |
| **`caregiver_family_links`** | `20260330_caregiver_family_links.sql` | Linked accounts (legacy naming). |
| **`family_invites`** | `20260401_family_invites.sql` | Email family invites. |
| **`stations`**, **`station_invite_codes`**, **`station_firefighters`** | `20260402_station_invite_system.sql` | Responder station + roster + codes. |
| **`responder_access_log`** | `20260410_responder_access_log.sql` | Audit trail. |

**Not created in repo migrations (may exist in deployed DB):** **`fire_events`**, **`signal_gap_by_state`**, etc. — see `docs/DATA_SOURCES_AND_FLOWS.md`.

### 7.2 `profiles` columns (aggregated from migrations)

**Identity & role:** `id` (PK, matches auth user), `full_name`, `phone`, `role`, `roles[]`, `org_name`.  
**Location:** `address`, geocode-related usage, **`work_address`**, work lat/lng/place id (`20260406_work_location.sql`).  
**Check-in / two-status:** `home_evacuation_status`, `person_safety_status`, `safety_shelter_name`, `safety_location_note`, `home_status_updated_at`, `safety_status_updated_at` (`20260329_two_status_model.sql`).  
**Legacy sync:** `monitored_persons` jsonb, `go_bag_checked`, `checkin_status`, `checkin_at` (`20260326_user_sync_data.sql`).  
**Alerts:** `alerts_ai_enabled`, `alert_radius_miles` (`20260327` + default migration `20260331_alert_radius_default_50.sql`).  
**Push cadence:** `last_flameo_push_at`, `last_flameo_push_level`, `last_flameo_status_prompt_at` (`20260328_flameo_push_cadence.sql`).  
**Consent:** `location_sharing_consent`, `evacuation_status_consent`, `health_data_consent`, `terms_accepted_at`, `my_people_consent_shown` (`20260331_consent_flags.sql`).  
**Mobility / health:** `mobility_access_needs`, `mobility_access_other` (`20260403`); expanded `mobility_needs`, `medical_needs`, `disability_needs`, free-text caps (`20260405_expanded_mobility.sql`); responder notes (`20260401_responder_notes.sql`).  
**Responder:** `responder_consent_accepted`, `responder_consent_accepted_at`, `responder_consent_version` (`20260409_responder_consent.sql`); **`responder_data_consent`** and related RPC/RLS updates may appear in `20260405` / `20260407_responder_communication_rpc.sql` — verify deployed DB.  
**Notifications / household:** fields from `20260310` / `20260316` (dependents, pets, emergency contacts, `language_preference`, `communication_needs`, `household_languages`).  

**RLS:** **`20260325_rls_data_isolation.sql`** baseline; **`20260408_profiles_rls_responder_no_recursion.sql`** introduces **`auth_profile_role()`** to avoid recursion; responder SELECT policies updated in consent migrations.

### 7.3 `monitored_persons_v2`

**Not a database table** — **localStorage** key used by hub/settings (`lib/user-data.ts`, `RoleContext.tsx`) for client-side person list alongside **server-side** family links.

### 7.4 Station RLS helpers (April 2026)

**`station_ids_for_user()`**, **`user_can_read_station()`**, responder roster RPCs — see **`20260413`–`20260417`** and **`anishadocs/ANISHA_emergency-responder-station-and-consent.md`**.

---

## 8. API Reference

**Convention:** Routes live under **`app/api/<segment>/route.ts`**. Auth = Supabase session cookie unless noted. Rate limits called out only where implemented in code.

### 8.1 Auth / invite

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/invite/verify` | Verify invite code. |
| POST | `/api/invite/generate` | Generate invite (admin-style). |
| POST | `/api/invite/consume` | Consume invite on signup. |

### 8.2 Profile

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/profile/role` | Switch/normalize role. |

### 8.3 Flameo

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/flameo/context` | Build `FlameoContext`. |
| POST | `/api/flameo/briefing` | Proactive briefing. |
| GET | `/api/flameo/command-context` | Responder command context. |
| POST | `/api/flameo/command-briefing` | Responder briefing. |

### 8.4 Fires / weather / shelters

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fires` | List from `fire_events`. |
| GET | `/api/fires/firms` | NASA FIRMS proxy. |
| GET | `/api/fires/nifc` | NIFC features. |
| GET | `/api/fires/redflags` | Red flag feed. |
| GET | `/api/fires/raws` | Fire weather / RAWs-style. |
| GET | `/api/active-fires` | Active fires aggregation. |
| GET | `/api/weather` | Open-Meteo weather. |
| GET | `/api/shelters` | Shelter list / search. |
| GET | `/api/shelters/live` | FEMA NSS live slice. |
| POST | `/api/shelter` | Ranked shelter routes. |

### 8.5 Geocode

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/geocode/forward` | Address → lat/lng. |
| GET | `/api/geocode/reverse` | Reverse geocode. |

### 8.6 Push

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/push/subscribe` | Register push subscription. |
| DELETE | `/api/push/subscribe` | Remove subscription. |
| GET | `/api/push/check` | Cron: proximity + escalation push. |

### 8.7 Family

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/family/send-invite` | Send family invite email (Resend optional). |
| POST | `/api/family/invite/accept` | Accept invite token. |
| POST | `/api/family/add-by-email` | Lookup/add by email. |

### 8.8 Station / responder

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/station/roster` | Station + roster + invite snippet. |
| POST | `/api/station/create` | Create station + code. |
| PATCH | `/api/station/update` | Update station. |
| POST | `/api/station/invite/validate` | Validate code. |
| POST | `/api/station/invite/accept` | Join station. |
| POST | `/api/station/invite/regenerate` | New commander code. |
| PATCH | `/api/station/firefighter/location` | Update GPS row. |
| POST | `/api/station/firefighter/clear-house` | Mark household evacuated via RPC. |
| GET | `/api/responder/evacuees` | List consented evacuees for map. |
| PATCH | `/api/responder/update-status` | Responder status update helper. |

### 8.9 AI / alerts / misc

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai` | Flameo chat + tools. |
| POST | `/api/alerts/ai-summarize` | AI alert summaries. |
| POST | `/api/checkin` | Check-in event ingestion. |
| POST | `/api/evacuee-records/dashboard` | Dashboard aggregate. |
| POST | `/api/ml` | ML/analyst backend helper. |
| GET | `/api/nri` | NRI proxy. |
| POST | `/api/translate` | Translation helper. |
| GET/POST | `/api/honeypot` | Honeypot. |

---

## 9. Security & Privacy

### 9.1 Data classification (high level)

| Class | Examples | Protection |
|-------|----------|------------|
| **Public marketing** | Landing copy | None |
| **PII** | Name, email, phone | RLS; auth-only reads |
| **Location** | Home/work address | Consent + RLS; responder gated |
| **Health/mobility** | Arrays + short text | **`health_data_consent`**; null in responder RPC if false |
| **Operational** | Station codes, roster | RLS + commander checks + service role server pattern |

### 9.2 Consent architecture

1. **Location sharing** — `location_sharing_consent` (address visible to responders when policy satisfied).  
2. **Evacuation status** — `evacuation_status_consent` (home evacuation status in responder views).  
3. **Health data** — `health_data_consent` (mobility/medical fields in **`profiles_visible_to_responder()`**).  
4. **Terms** — `terms_accepted_at` gates consumer onboarding exit.  
5. **Responder agreement** — `responder_consent_*` + `ResponderDataConsent` modal.

### 9.3 Responder access

- **Modal:** `components/responder/ResponderDataConsent.tsx` (high-contrast light card; emerald legal links).  
- **Logging:** `logResponderAccessFireAndForget` → **`responder_access_log`**.  
- **RPC:** `responder_update_evacuee_home_status` (migration **`20260412_...`**) enforces consent and role.

### 9.4 Encryption & transport

- **Supabase** — platform-managed encryption at rest.  
- **TLS** — browser ↔ Vercel ↔ Supabase.  
- **Live GPS** — passed as query params for context assembly; treat as **sensitive ephemeral** client data.

### 9.5 User rights

- Settings flows for profile updates; account deletion depends on Supabase Auth + app hooks (verify deployed policies).

**Extended AI policy:** `docs/RESPONSIBLE_AI.md`, `docs/FLAMEO_GUARDRAILS_AUDIT.md`.

---

## 10. Notification System

### 10.1 Escalation levels

**`lib/flameo-push-escalation.ts`:**

- **L4** — mandatory evacuation order in radius (`hasMandatoryOrderInRadius`).  
- **L3** — severe uncontained fire in radius.  
- **L2** — fire within **20 mi**.  
- **L1** — monitor (farther).  

### 10.2 Cadence

- **`shouldSendEscalationPush`:** **20-minute** window for repeat at same level; **L4** allows more urgent repeats per code.  
- **`shouldSendStatusPrompt`:** **2-hour** cap for status prompts during active incident (`TWO_HOUR_MS`).

### 10.3 Web Push

- **`POST /api/push/subscribe`** stores subscription in **`push_subscriptions`**.  
- **VAPID** keys from env (see `.env.example`).  
- **`public/sw.js`** handles push event.

### 10.4 Cron

- **`vercel.json`** → daily **`GET /api/push/check`** (adjust schedule in Vercel if needed for demos).

---

## 11. Responsible AI Framework

**Authoritative internal doc:** **`docs/RESPONSIBLE_AI.md`**.

Summary:

- **Model:** Claude **`claude-sonnet-4-6`** via **`app/api/ai/route.ts`**.  
- **Grounding:** `FlameoContext` JSON + explicit accuracy instructions in **`lib/flameo-ai-prompt.ts`**.  
- **Medical / mental health / scope:** `FLAMEO_RESPONSIBLE_AI_GUARDRAILS`.  
- **Rate limits:** 10/min, 30/hour on **`POST /api/ai`**.  
- **Human oversight:** No second automated judge model; compliance via prompts + product boundaries (as documented honestly in `RESPONSIBLE_AI.md`).

---

## Appendix — Related documentation

| Path | Topic |
|------|--------|
| `docs/DATA_SOURCES_AND_FLOWS.md` | Pipelines, `fire_events` caveats |
| `docs/RESPONSIBLE_AI.md` | AI policy |
| `docs/FLAMEO_GUARDRAILS_AUDIT.md` | Guardrail audit |
| `docs/HOW_WE_BUILT_THIS.md` | High-level build narrative |
| `anishadocs/ANISHA_00_INDEX.md` | Transformation index |
| `anishadocs/ANISHA_emergency-responder-station-and-consent.md` | ER station + RLS |
| `anishadocs/ANISHA_transformation-story.md` | **Companion narrative (doc 2)** |
