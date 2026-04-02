# Data sources and product flows

This document describes **what data powers** the evac map, **Flameo Situation Room**, **AI/Flameo**, **analyst tools**, and anything labeled “ML” in the app. It reflects the **wildfire-app** codebase as of the last update to this file.

---

## 1. Executive summary

| Area | Primary data | Not from |
|------|----------------|----------|
| **Evac map (consumer)** | NIFC (via `/api/fires/nifc`), Open-Meteo (wind), static shelter/hazard lists, Google geocoding (client) | Supabase does **not** supply fire dots |
| **Flameo Situation Room** | Same as context API: `GET /api/flameo/context` (NIFC, FIRMS, shelters, hazards, optional routes + weather) | No separate DB table for “situation” |
| **Trained ML models in DB** | **None** — no model weights or training pipelines stored in Supabase | — |
| **“ML” / spread demo (responder)** | `fire_events` from Supabase + **heuristic** housing/evac estimates (`PredictionMap`) | Not a trained neural model |
| **Analyst map** | Live NIFC EGP (`/api/active-fires`), static **WiDS sample** array in code, optional Supabase `fire_events` elsewhere | Full 62k-row WiDS set is not shipped in this bundle as one file |
| **Flameo / AI chat** | Anthropic LLM + optional structured `flameoContext` from `/api/flameo/context` | LLM is not “trained” on your DB in-app |

---

## 2. All data sources (catalog)

### 2.1 External APIs (live)

| Source | Env / route | Used for |
|--------|-------------|----------|
| **NIFC / Esri ArcGIS** | `/api/fires/nifc` → `Current_WildlandFire_Perimeters`, `WFIGS_Incident_Locations_Current` | Fire polygons/points, names, acres, containment; evac map; hub; Flameo context |
| **NIFC EGP Active Incidents** | `/api/active-fires` | Analyst “Live Active Fires” layer |
| **NASA FIRMS (VIIRS SNPP NRT)** | `NASA_FIRMS_API_KEY` → `/api/fires/firms` | Hotspot points; Flameo context; push cron (with `fire_events`) |
| **Open-Meteo** | No key → `/api/weather`, direct in `EvacuationMapExperience` | Current temp/wind/humidity-derived **fire risk** label; map wind compass |
| **Google Maps Geocoding** | `GOOGLE_GEOCODING_API_KEY` (`lib/geocoding.ts`) | Server: Flameo context, weather geocode, shelter flows |
| **Google Geocoding (client)** | `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` (`lib/geocoding-client.ts`) | Browser: monitored people addresses, evac map anchor |
| **Google Distance Matrix** | `GOOGLE_ROUTES_API_KEY` (`lib/shelter-ranking.ts`) | Shelter ranking by drive time |
| **Google Routes API** | `GOOGLE_ROUTES_API_KEY` → `POST /api/shelter` | Turn-by-turn summaries, fire/hazard proximity flags for ranked shelters |
| **Anthropic** | `ANTHROPIC_API_KEY` → `/api/ai`, `/api/flameo/briefing`, `/api/alerts/ai-summarize`, command intel | Flameo chat, briefings, optional alert headline/bullets |

### 2.2 Map tiles (basemaps)

| Provider | Where |
|----------|--------|
| **OpenStreetMap** | Default street tiles in Leaflet maps |
| **Esri World Imagery** | Satellite option |
| **OpenTopoMap** | Topo option |

### 2.3 Static / in-repo datasets (curated)

| Asset | Location | Used for |
|-------|----------|----------|
| **Human evacuation shelters** | `lib/evac-shelters.ts` (`HUMAN_EVAC_SHELTERS`) | Evac map markers, Flameo context shelter lists |
| **Hazard facilities** | `lib/hazard-facilities.ts` (`HAZARD_FACILITIES`) | Evac map, Flameo context hazard sites |
| **WiDS representative fires (60)** | `app/dashboard/analyst/map/page.tsx` (`WIDS_FIRES`) | Analyst map “sample incidents” tab only |
| **WiDS / geo preprocessing (archive)** | `archive/widsdatathon/preprocess_geo_data.py` | **Offline** ETL for GeoJSON/CSV from raw competition data — not wired to production Next.js routes |

### 2.4 Supabase (database + auth)

| Table / object | Typical use |
|----------------|-------------|
| **`profiles`** | Address, work location, alert radius, mobility/consent, roles, check-in fields, responder notes |
| **`fire_events`** | Historical/analytics-style incident rows: name, county, state, acres, containment, lat/lng, SVI-related fields, evacuation-order flags — used in **hub lists**, **responder/analytics**, **`/api/fires`**, **cron push** proximity |
| **`signal_gap_by_state`** | **View/table** read by analyst Signal Gap UI (schema not in repo migrations; must exist in project) |
| **`evacuee_records`**, **`monitored_person_checkins`**, **`checkin_events`** | Check-in flows |
| **`push_subscriptions`** | Web push |
| **`family_invites`**, **`caregiver_family_links`**, **`invite_codes`** | Family + gated signup |
| **`user_alert_items`** | Persisted output from AI alert summarization (when used) |
| **RPCs** (`profiles_visible_to_responder`, `family_lookup_user_by_email`, `accept_family_invite`, `increment_invite_uses`) | Responder visibility, family flows |

**Note:** `fire_events` and `signal_gap_by_state` are **queried by the app** but their **CREATE** definitions are **not** in `supabase/migrations/` in this repo — they are expected to exist in your Supabase project (import/ETL/manual SQL).

### 2.5 Public static files (optional / legacy)

| File | Role |
|------|------|
| `public/data/fire_events_map.json` | Legacy/geo demo style payload (not the primary path for the Next evac map, which uses NIFC API) |

---

## 3. Evacuation map (`EvacuationMapExperience` + `LeafletMap`)

**Flow**

1. **Fires:** `fetch('/api/fires/nifc')` → merged NIFC perimeters + incident points (cached ~5 min on server).
2. **User / family anchors:** Supabase `profiles` (address, `alert_radius_miles`); monitored people geocoded via **Google Geocoding (browser key)**.
3. **Device location:** Browser geolocation when permitted.
4. **Wind overlay:** `api.open-meteo.com` from map center.
5. **Shelters:** `HUMAN_EVAC_SHELTERS` (toggle).
6. **Hazards:** `HAZARD_FACILITIES` (toggle).
7. **My Alerts panel (optional):** `useConsumerAlerts` → NIFC within radius → `POST /api/alerts/ai-summarize` (Anthropic) when feature flag + deployment allow.

**Supabase on this screen:** profiles + person list sync — **not** fire geometry.

---

## 4. Flameo Situation Room

**UI:** `components/flameo/FlameoSituationRoom.tsx`

**Inputs (props from parent, e.g. caregiver/home hub):**

- `flameoContext` — JSON from **`GET /api/flameo/context`** (see below).
- `flameoStatus`, `flameoBriefing`, loading/error from the same hub’s Flameo fetch/briefing pipeline.
- `myPeople` — local/UI state from profiles + monitored persons (evacuation status flags).
- `userLat` / `userLng`, `detectedAnchor` (home / work / unknown) — client GPS + logic.

**What `/api/flameo/context` composes**

1. **Supabase `profiles`:** home/work address, alert radius, role, mobility → accessible shelter preference.
2. **Google Geocoding (server):** anchor coordinates; reverse geocode for “unknown” GPS mode.
3. **`/api/fires/nifc`:** incidents within radius (names for NIFC points).
4. **`/api/fires/firms`:** VIIRS hotspots within radius (typically **no** name).
5. **`HUMAN_EVAC_SHELTERS` + `rankSheltersByProximity`:** Google **Distance Matrix**.
6. **`POST /api/shelter`:** Google **Routes API** for ranked shelter rows (duration, summary, near-fire / near-hazard flags).
7. **`HAZARD_FACILITIES`:** sites within radius.
8. **`/api/weather`:** Open-Meteo after geocoding anchor string.

The Situation Room **does not query Supabase for fires**; it only uses the structured context object returned by the API.

---

## 5. “Models” and ML-related surfaces

### 5.1 No in-app trained models in Supabase

There are **no** tables for model checkpoints, embeddings, or batch inference jobs. “AI” is **LLM inference** (Anthropic) with **strict grounding** instructions where context is attached.

### 5.2 Responder prediction map (heuristic, not ML training)

**File:** `app/dashboard/responder/PredictionMap.tsx`

- **Input fires:** Usually from Supabase **`fire_events`** (via parent `page.tsx` load) — real-ish tabular incidents for the demo layer.
- **“At-risk housing” / evacuation %:** **Deterministic heuristics** — state density constants, acres → synthetic radius, **seeded pseudo-random** evac percentage from fire `id`.
- **SVI / signal gap:** Passed through on the fire row when present for display; the **map math** is not a trained model.

### 5.3 Analyst / WiDS narrative

Signal gap pages use **`signal_gap_by_state`** from Supabase plus copy that explains the **WiDS / WatchDuty-style** dataset statistics. The **analyst map** WiDS tab uses **hard-coded representative fires**, not a live query of all 62k rows from the client.

### 5.4 Archive datathon pipeline

**`archive/widsdatathon/preprocess_geo_data.py`** reads large raw CSVs and writes **GeoJSON/CSV** for a separate Streamlit-style workflow. It is **documentation of historical preprocessing**, not an active dependency of the Next.js evac map.

---

## 6. Quick reference: which route hits which source

| API route | Upstream |
|-----------|----------|
| `GET /api/fires/nifc` | Esri NIFC layers |
| `GET /api/fires/firms` | NASA FIRMS |
| `GET /api/active-fires` | NIFC EGP Active Incidents |
| `GET /api/fires` (REST) | Supabase `fire_events` |
| `GET /api/flameo/context` | Supabase `profiles` + NIFC + FIRMS + static lists + Google DM/Routes + `/api/weather` |
| `GET /api/weather` | Google Geocode + Open-Meteo |
| `POST /api/shelter` | Google Routes |
| `POST /api/ai` | Anthropic (+ optional client context) |
| `POST /api/alerts/ai-summarize` | Anthropic + Supabase auth; optional `user_alert_items` insert |

---

## 7. Environment variables (data-related)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/cron (push, admin) |
| `NASA_FIRMS_API_KEY` | FIRMS CSV API |
| `GOOGLE_GEOCODING_API_KEY` | Server geocoding |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | Browser geocoding |
| `GOOGLE_ROUTES_API_KEY` | Distance Matrix + Routes |
| `ANTHROPIC_API_KEY` | Flameo / briefings / alert AI |
| `NEXT_PUBLIC_APP_URL` | Cron/push self-fetch to `/api/fires/firms` |

---

## 8. Maintenance notes

1. **Keep `fire_events` and `signal_gap_by_state` in sync** with your research pipeline if analyst and push features depend on them.
2. **FIRMS** requires a valid `NASA_FIRMS_API_KEY`; without it, Flameo context still works if NIFC succeeds (`feeds_partial`).
3. **Rate limits and terms** apply to Google, NASA, Esri/NIFC, and Anthropic; review each provider’s policies for production use.

---

*Generated from repository analysis. Update this file when adding new APIs, tables, or feature flags.*
