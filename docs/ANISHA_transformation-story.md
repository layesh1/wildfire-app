# Minutes Matter — The Transformation Story

**Companion to:** [MINUTES_MATTER_FULL_DOCS.md](./MINUTES_MATTER_FULL_DOCS.md) · **ANISHA index:** [../anishadocs/ANISHA_00_INDEX.md](../anishadocs/ANISHA_00_INDEX.md)

**Purpose:** Narrate how the **WildfireAlert / Minutes Matter** web application evolved from an early **WiDS / Streamlit–centric research stack** into the **Next.js + Supabase + Flameo** system in this repository—honest about **what was wrong**, **what shipped**, and **how the team built it**.

**Evidence:** `archive/widsdatathon/` (legacy Streamlit + Python analytics), `git log`, `supabase/migrations/`, `anishadocs/`, and `docs/HOW_WE_BUILT_THIS.md`.

**Last updated:** 2026-04-02

---

## Overview

The product line started as a **datathon-grade research platform** (“Wildfire Caregiver Alert System,” WiDS 2025) with **Streamlit** dashboards, **CSV-backed** fire analytics, and a **caregiver-vs-evacuee** mental model inherited from the competition dataset. The **current web app** is a **Next.js 16** multi-role system with **RLS**, **consent gates**, **FEMA live shelters**, **Google geocoding/routing**, and a **three-phase Flameo pipeline** (context → briefing → grounded chat + COMMAND).  

**This repo does not contain the native iOS SwiftUI source** (no `*.swift` files here). The **station join code** and **field firefighter** flows in this document are **web/API contracts** intended to pair with a **separate mobile client**.

---

## The Starting Point (verified from `archive/widsdatathon/`)

### What existed before this Next.js app

| Area | Before (research / Streamlit era) | Where evidenced |
|------|-----------------------------------|-----------------|
| **Shell** | **Streamlit** multi-page app (`archive/widsdatathon/wids-caregiver-alert/src/app.py` + page modules) | Python `src/*.py` |
| **Roles** | **Caregiver** framing for WiDS story; separate mental model from unified consumer hub | README + page titles |
| **Data** | **`fire_events_with_svi_and_delays.csv`** (62,696 rows), county stats, signal-gap scripts | `archive/widsdatathon/`, SQL dedup helpers |
| **Geocoding** | Research pipelines assumed **tabular** locations; public web later experimented with **OSM/Nominatim** (policy + quality issues—see Transformation 3) | Comments in `lib/flameo-context-types.ts`, migration notes |
| **Check-in** | Not the production **two-status** `profiles` model | Early demos vs `20260329_two_status_model.sql` |
| **Responder map** | Research/command **Streamlit** views; not the same as production **Supabase RLS + consent** | `command_dashboard_page.py` etc. |
| **AI** | Not the **FlameoContext** pipeline; research narrative focused on **statistics and alerts** | WiDS docs vs `app/api/flameo/*` |
| **UI** | Streamlit defaults + matplotlib/plotly—**not** the emergency design system on `/dashboard/home` | Archive |

### Problems that motivated the rewrite

- **Role confusion:** Caregiver and evacuee **product** roles duplicated UX and routing logic.  
- **Demo vs real data:** Charlotte-style **demo pins** and static layers were fine for pitch, but **judges and responders** need **consented live profiles** and **auditability**.  
- **Geocoding fragility:** OSM-based flows risked **typos**, **rate limits**, and **policy** friction.  
- **No bounded AI story:** A generic chat widget cannot demonstrate **grounded**, **agentic** behavior aligned with **Watch Duty–style accuracy** principles.  
- **Maintenance cost:** Python research stack and TS web stack **diverged**; product needed **one** deployable app (`vercel` + `supabase`).

---

## The Five Key Transformations

### Transformation 1 — From confused roles to a unified consumer hub

**BEFORE**

- Separate **caregiver** and **evacuee** dashboards and routes (`/dashboard/caregiver/*`, `/dashboard/evacuee/*`) with overlapping features.  
- Easy for a stressed user to land on the “wrong” hub.

**AFTER (shipped)**

- **Canonical consumer hub:** **`/dashboard/home`** for everyone in the civilian flow.  
- **`middleware.ts`** redirects legacy **`/dashboard/caregiver/*`** and **`/dashboard/evacuee/*`** → **`/dashboard/home/*`** when profile role is consumer-class.  
- **Migration `20260404_unify_evacuee_role.sql`** backfills **`caregiver` → `evacuee`** at the database layer.  
- **“My People”** (family links + monitored persons) replaces a split **Caregiver vs Evacuee** product story—closer to a **Life360-style** mental model.

**IMPACT**

- One hub to maintain for civilians; clearer demo for stakeholders.  
- Responder and analyst routes stay **separate** (`/dashboard/responder`, `/dashboard/analyst`).

---

### Transformation 2 — From static chat to agentic Flameo

**BEFORE**

- Chat-style UI without a **single structured context object** shared across briefing + chat + responder command.

**AFTER (shipped)**

- **Phase A — `GET /api/flameo/context`:** deterministic **`FlameoContext`** (NIFC, FIRMS, shelters, weather, hazards, anchors). Types in **`lib/flameo-context-types.ts`**.  
- **Phase B — `POST /api/flameo/briefing`:** LLM only when status/threat rules pass; template fallback.  
- **Phase C — `POST /api/ai`:** **`buildFlameoGroundingPrefix`**, tools (`lib/flameo-phase-c-tools.ts`), **rate limits**, **`claude-sonnet-4-6`**.  
- **COMMAND —** `command-context` / `command-briefing` for **dispatch-style** responder copy (`lib/flameo-command.ts`).

**IMPACT**

- **Demonstrable** “acts without being asked” (briefing) while staying **bounded** to JSON context for fire facts.  
- Documented limits in **`docs/RESPONSIBLE_AI.md`** (no second automated judge—**honest** compliance model).

---

### Transformation 3 — From fragile geocoding to Google-backed location intelligence

**BEFORE**

- Reliance on **OSM/Nominatim** patterns caused **quality** and **policy** issues (noted in code comments and transformation work).  
- Poor addresses break **Flameo anchors**, **push**, and **responder maps**.

**AFTER (shipped)**

- **Google Places** (client, `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`) for autocomplete + place types → **building type** heuristics.  
- **Google Geocoding** (server, `GOOGLE_GEOCODING_API_KEY`) via **`/api/geocode/forward`** and **`/api/geocode/reverse`**.  
- **Google Routes** (`GOOGLE_ROUTES_API_KEY`) for **`POST /api/shelter`** with **fire/hazard** avoidance flags.  
- **Verify & Save** UX on onboarding/settings before persisting coordinates.

**IMPACT**

- Higher **address fidelity** for **responders** and **routing**; aligns with **production API** terms of service when keys are configured correctly.

---

### Transformation 4 — From demo pins to consent-first privacy architecture

**BEFORE**

- Responder views could show **hardcoded** or **demo** geography (e.g. Charlotte-centric experiments—see early git subjects).  
- No **versioned responder agreement** or **access log** in the research stack.

**AFTER (shipped)**

- **Three consent booleans** on `profiles`: **`location_sharing_consent`**, **`evacuation_status_consent`**, **`health_data_consent`** (`20260331_consent_flags.sql`) + **`profiles_visible_to_responder()`** RPC.  
- **Two-status model:** **`home_evacuation_status`** (responder-relevant when consented) vs **`person_safety_status`** (family-side; not exposed to responders).  
- **`ResponderDataConsent`** modal + **`responder_consent_*` columns** (`20260409_responder_consent.sql`).  
- **`responder_access_log`** (`20260410_responder_access_log.sql`).  
- **Push escalation** to mitigate alert fatigue (`lib/flameo-push-escalation.ts`, **`/api/push/check`** cron).

**IMPACT**

- Credible **privacy + responsible-AI** story: **consent**, **RLS**, **audit**, and **explicit failure modes** (e.g. target not consented on `clear-house` API).

---

### Transformation 5 — From generic UI to an emergency-grade web experience

**BEFORE**

- Streamlit **research chrome**; early web iterations mixed **light/dark** tokens and **low-contrast** panels.

**AFTER (shipped)**

- **Consumer hub** structured **Flameo Situation Room** (`components/flameo/FlameoSituationRoom.tsx`) instead of long unstructured JSX blocks.  
- **Responder** command hub + **light-theme contrast fixes** (git history: `320f6ff`, `ae4f5ef`, etc.).  
- **Analyst hub** reorganized into **categorized** research areas (`8a84be4` et al.).  
- **Shelter labeling** distinguishes **FEMA-verified** vs **pre-identified** (`FlameoSheltersMeta`, live NSS route).  
- **Data Access Agreement** modal updated for **WCAG-style contrast** (`383bc04`).

**IMPACT**

- UI matches **stressed-user** readability goals and **judge-ready** polish without hiding the **research** lineage.

---

## The Result — Before / After

| Dimension | Before (datathon / early web) | After (this repo) |
|-----------|------------------------------|-------------------|
| User roles (consumer) | Caregiver + Evacuee split | **Unified `/dashboard/home`** + `evacuee` role migration |
| AI | Generic chat / none | **FlameoContext → briefing → grounded chat + COMMAND** |
| Geocoding | OSM-era issues | **Google Places + Geocoding + Routes** |
| Shelter labels | Research/static | **FEMA NSS live** + **pre-identified** tier |
| Privacy | Limited | **Consent flags + RLS + responder RPC + audit log** |
| Responder map | Demo geography | **Consented profile-driven** map + station roster |
| UI | Streamlit / mixed | **Next.js** hub + Situation Room + analyst categories |
| Check-in | Simple / legacy | **Two-status** on `profiles` |
| Notifications | Minimal | **Web push + L1–L4 escalation + cron check** |
| Analyst tools | Python pages | **Next analyst routes** + CSV/API hybrid |
| Documentation | Scattered | **`docs/*` + `anishadocs/ANISHA_*` + this file** |
| iOS app | Not in this repo | **Companion product** (join codes designed for mobile) |

---

## Development Methodology

### AI-assisted agile (Cursor + Claude)

- **Structured prompts** with **scope fences** (“do not change X”).  
- **File plans** before edits (same discipline as this documentation request).  
- **`npx tsc --noEmit`** after risky refactors.  
- **Human review** at merge boundaries.

### Typical sprint loop

1. **Audit** current code (read-only).  
2. **Lock** product decision (ANISHA markdown when large).  
3. **Implement** in small commits (see `git log` themes: responder hub, station RLS, Flameo command).  
4. **Deploy** to **Vercel**; validate **Supabase migrations** in SQL Editor when auto-migrate is off.  
5. **Iterate** from production errors (e.g. **stations RLS recursion** → migrations **`20260415`–`20260417`** + service role pattern).

### Prompt engineering principles (team norms)

- Explicit **non-goals** and **file boundaries**.  
- Prefer **extending** existing types (`FlameoContext`) over parallel ad-hoc JSON.  
- **Never** commit **secrets** (`.env.local`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## Git history snapshot (recent themes)

Recent commits (abridged from `git log --oneline -25`) show concentrated work on:

- **Responder command hub**, evacuation map, NIFC layers, hazard defaults.  
- **Station invites**, roster, **Flameo Command Room**, geocode fixes.  
- **Analyst hub** navigation + titles.  
- **RLS recursion fixes** and **service-role / RPC** roster path.  
- **Station hub** UX + **Data Access Agreement** accessibility.  
- **ANISHA documentation** for the ER track.

---

## Honesty statement

This story mixes **verifiable repository facts** (files, migrations, commit messages) with **product narrative** (user stress, judge readiness). Where the codebase does not implement a claim (e.g. **native iOS source**), this doc **says so explicitly**. For **tabular schema** not defined in `supabase/migrations/` (e.g. some **`fire_events`** deployments), see **`docs/DATA_SOURCES_AND_FLOWS.md`**.

---

## Related files

| Path | Why read it |
|------|-------------|
| `docs/MINUTES_MATTER_FULL_DOCS.md` | Full technical + product reference |
| `docs/HOW_WE_BUILT_THIS.md` | Earlier high-level build notes |
| `archive/widsdatathon/README.md` | Original WiDS problem statement |
| `anishadocs/ANISHA_implementation-record.md` | Migration-centric as-built |
| `anishadocs/ANISHA_emergency-responder-station-and-consent.md` | ER station + RLS deep dive |
