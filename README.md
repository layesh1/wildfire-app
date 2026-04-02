# Minutes Matter / WildfireAlert — Web Application (Technical Overview)

**Technical submission summary** for the equity- and safety-focused wildfire web platform. This document describes **what the application is**, **how it is built**, **what data it consumes**, and **which models and tooling shaped engineering**—not environment configuration or runbooks.

---

## 1. Application description

**Minutes Matter** (public-facing name; **WildfireAlert** appears in product copy and AI system prompts) is a **multi-role progressive web application** for wildfire awareness, household evacuation support, and emergency-responder coordination.

| Audience | Experience |
|----------|------------|
| **Consumers** | Unified hub at **`/dashboard/home`**: verified address anchoring, **two-status** check-in (home evacuation vs personal safety), **My People** (family linking), evacuation map, shelter routing with hazard awareness, optional web push with escalation levels, and **Flameo**—a grounded AI layer over live context. |
| **Emergency responders** | **Command hub** with consented evacuee map data, station roster and **iOS join codes**, firefighter location and **clear-house** workflows, and **Flameo COMMAND** (dispatch-oriented briefing). |
| **Data analysts** | Research hub with categorized tools: signal gap, equity, NRI, fire weather, ML-style predictors, density and trend views, and related analytics—many layers informed by the **WiDS-scale fire dataset** lineage in `archive/widsdatathon/`. |

The product narrative bridges **datathon research** (silent alerts, SVI, evacuation timing) and **operational UX** (consent, RLS, audit logging, production geocoding).

---

## 2. Technical architecture

- **Framework:** **Next.js 16** (App Router), **React 19**, **TypeScript 5**.
- **Rendering:** Server and client components; API implemented as **Route Handlers** under `app/api/`.
- **Auth & data plane:** **Supabase** (PostgreSQL, Auth, Realtime) with **row-level security** across user profile, family, check-in, alert, station, and responder-audit tables. Migrations live in `supabase/migrations/` (chronological SQL).
- **Hosting:** **Vercel** (Next.js deployment); scheduled **push proximity checks** via `vercel.json` cron to `GET /api/push/check`.
- **Security surface:** **Content Security Policy** and related headers in `next.config.js`; CORS allowlisting for APIs in `middleware.ts`; rate limiting on sensitive routes (e.g. AI, invite validation).

---

## 3. Tech stack (implementation)

| Layer | Choices |
|-------|---------|
| **UI** | Tailwind CSS, Framer Motion / Motion, Radix-style primitives (`components/ui/`), Lucide icons, Leaflet + react-leaflet for maps, Recharts for analyst charts. |
| **AI (runtime)** | **Anthropic** Messages API via `@anthropic-ai/sdk`. Production chat model identifier in code: **`claude-sonnet-4-6`** (`app/api/ai/route.ts`—confirm when upgrading). |
| **Flameo pipeline** | **Phase A:** `GET /api/flameo/context` builds typed **`FlameoContext`** (no LLM). **Phase B:** `POST /api/flameo/briefing` for proactive briefing when threat rules pass. **Phase C:** grounded chat with tool-style actions (`lib/flameo-phase-c-tools.ts`). **Responder:** `command-context` / `command-briefing` plus `lib/flameo-command.ts`. Types: `lib/flameo-context-types.ts`. |
| **Geocoding & routing** | **Google** Places (client autocomplete), Geocoding and Routes (server): `app/api/geocode/*`, `app/api/shelter` (shelter ranking with fire/hazard avoidance flags). |
| **Email (family invites)** | **Resend** HTTP API when configured (`lib/send-family-invite-email.ts`); otherwise server-side logging fallback. |
| **Push** | **web-push** + VAPID; service worker `public/sw.js`; escalation logic `lib/flameo-push-escalation.ts`. |

---

## 4. Data sources & research lineage

| Category | Role in the web app |
|----------|---------------------|
| **NASA FIRMS (VIIRS SNPP NRT)** | Hotspot detections via `GET /api/fires/firms`; feeds Flameo context and push logic. |
| **NIFC / ArcGIS-style active fire feeds** | Incident geometry and lists (`/api/fires/nifc`, `/api/active-fires`); map and context. |
| **`fire_events` (Supabase)** | Tabular incidents for hubs, push cron, and analyst views when present in the deployed database; full **CREATE** may be maintained outside this repo’s migrations (see `docs/DATA_SOURCES_AND_FLOWS.md`). |
| **FEMA NSS (ArcGIS)** | Live human shelter feed with short TTL cache (`/api/shelters/live`); paired with **pre-identified** static shelters when the feed is sparse. |
| **Open-Meteo** | Weather and fire-weather style inputs (`/api/weather`, `/api/fires/raws`). |
| **FEMA NRI** | County risk layers (`/api/nri`). |
| **Static hazard facilities** | `lib/hazard-facilities.ts` (e.g. nuclear, chemical, LNG) for context and route copy. |
| **WiDS / datathon artifacts** | `archive/widsdatathon/` preserves the original **Streamlit** research app, CSV pipelines, and documentation for **62k+ fire rows**, signal-gap statistics, and equity narratives that inform analyst pages and Flameo system prompts. |

---

## 5. Models used to build the software (engineering methodology)

The **application code** is not trained end-to-end on the fire CSV; instead, **frontier LLMs** and **IDE-native agents** were used as **implementation partners** under human direction:

- **Anthropic Claude (cloud API)** — Powers **Flameo** consumer and responder chat, briefings, and bounded tool calls; grounded by server-built JSON context and explicit guardrails (`lib/flameo-ai-prompt.ts`, `docs/RESPONSIBLE_AI.md`).
- **Cursor + Claude (agent-assisted development)** — Features were specified in structured prompts (scope boundaries, file plans, migration ordering), implemented in **TypeScript/React/SQL**, and validated with **typecheck** and incremental deploys. This workflow is typical of **datathon- and demo-tight timelines**: rapid iteration on responder RLS, station roster RPCs, Flameo COMMAND, consent modals, and analyst hub IA without maintaining a separate “codegen model” fork.
- **No custom fine-tune** of Claude on the WiDS dataset ships inside the repo; the **datathon domain knowledge** is embedded in **prompts**, **copy**, **migrations**, and **analyst UIs** that cite those findings.

For **traditional ML** (e.g. XGBoost-style predictors), the web app exposes **`POST /api/ml`** as an integration point; training artifacts and notebooks live in the research/archive track rather than in the Next.js bundle.

---

## 6. Documentation map

| Document | Contents |
|----------|----------|
| `docs/MINUTES_MATTER_FULL_DOCS.md` | End-to-end product + technical reference (journeys, APIs, schema summary, Flameo, notifications). |
| `docs/ANISHA_transformation-story.md` | Narrative from Streamlit/datathon stack to this Next.js product. |
| `docs/DATA_SOURCES_AND_FLOWS.md` | Pipeline and `fire_events` caveats. |
| `docs/RESPONSIBLE_AI.md` | AI guardrails and disclosure. |
| `anishadocs/ANISHA_*.md` | Transformation specs, implementation record, emergency-responder station + RLS deep dive. |

---

## 7. Repository identity

**npm package name:** `wildfire-alert-system`.  
**Public positioning:** **Minutes Matter** — *Every minute counts* (wildfire safety and evacuation support).  
**Research roots:** WiDS / 49ers Intelligence Lab–style wildfire equity and alert-delay analysis, carried forward in both **archive** materials and **shipping** web features.
