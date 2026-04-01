# How WildfireAlert Was Built

## Development Methodology

WildfireAlert was built using an **AI-assisted agile** process:

- **Cursor** as the primary IDE for editing, refactors, and multi-file changes.
- **Claude (Anthropic)** for architecture, prompts, and implementation support via structured instructions (file plans, phased work, typecheck gates).
- **Sprint shape:** audit existing behavior → lock decisions → implement in scoped phases → **`npx tsc --noEmit`** (and lint where configured) → deploy / smoke test.
- **Human review** of plans and diffs before merging risky changes.

## Tech Stack

| Layer | Choice |
|--------|--------|
| Framework | **Next.js** (App Router) — see `package.json` for exact version (e.g. ^16.x) |
| UI | **React** (^19), **TypeScript** |
| Styling | **Tailwind CSS** |
| Auth & database | **Supabase** (auth, Postgres, RLS) |
| AI | **Anthropic** via `@anthropic-ai/sdk`; model id set in `app/api/ai/route.ts` |
| Maps | **Leaflet** + **react-leaflet**; tiles typically **OpenStreetMap**-compatible sources |
| Geocoding / places | **Google Places** (client) and **Google Geocoding** (server) where integrated |
| Routing | **Google Routes API** where integrated for shelter / evacuation routing |
| Fire data | **NASA FIRMS**, **NIFC**, in-app / **Supabase** `fire_events` and related pipelines |
| Push | **Web Push** + **VAPID** (`web-push`) |
| Hosting | **Vercel** (typical for Next.js; confirm for your org) |

## AI Development Process

1. **Audit** — Read routes, types, and callers before changing behavior.
2. **Lock decisions** — Product docs under `anishadocs/` and migration comments record major choices.
3. **Structured prompts** — Tasks specify file scope, out-of-scope areas, and verification steps.
4. **File plan first** — List files to touch before editing (reduces churn).
5. **Phases** — Large work split (e.g. context API → briefing → chat tools).
6. **Typecheck** — `npx tsc --noEmit` after substantive TS changes.
7. **Smoke test** — Manual checks on auth, hub, Flameo, and maps after deploy.

## Flameo Architecture (agentic pipeline)

| Phase | Route / artifact | Role |
|--------|------------------|------|
| **A** | `GET /api/flameo/context` | Build **structured context** (incidents, anchors, shelters, routing metadata) — **no LLM**. |
| **B** | `POST /api/flameo/briefing` | **Proactive brief** for hub load using context + model (where enabled). |
| **C** | `POST /api/ai` | **Grounded chat**: system prompt + optional `buildFlameoGroundingPrefix(context)` + tools (`lib/flameo-phase-c-tools.ts`). |

Shared prompt utilities and guardrails: **`lib/flameo-ai-prompt.ts`**.

## Key Engineering Decisions (reference)

_Decisions below are summarized from product/implementation docs; confirm against current code when they affect UX._

- **Google Places vs Nominatim:** Places/Geocoding chosen for **autocomplete quality**, **coverage**, and **consistent** commercial SLAs where the team standardized on Google.
- **Two-status model (home vs personal safety):** Separates **household / address risk** from **user check-in status** so caregivers and evacuees see coherent state on the hub.
- **Default alert radius (e.g. 50 mi):** Balances **early awareness** with **notification fatigue**; tuned for western US megafires and sparse cell coverage.
- **Notification cadence (e.g. ~20 min):** Reduces duplicate pushes while keeping evolving incidents visible.
- **Unified user model:** One account can use **caregiver** and **evacuee** experiences via role/onboarding rather than duplicate identity systems.

## Related documentation

- `docs/RESPONSIBLE_AI.md` — Flameo guardrails and limitations
- `docs/FLAMEO_GUARDRAILS_AUDIT.md` — audit log and test cases
- `README.md` — setup and environment variables
