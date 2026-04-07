# app/

Next.js App Router source — pages, layouts, and API route handlers.

## Structure

| Path | What it contains |
|------|-----------------|
| `page.tsx` / `layout.tsx` | Marketing homepage and root layout |
| `auth/` | Authentication pages: sign-in, sign-up, onboarding, callback, family invite |
| `dashboard/home/` | Consumer hub (alerts, Flameo AI chat, check-in, evacuation map, My People) |
| `dashboard/responder/` | Emergency responder command hub and station management |
| `dashboard/analyst/` | Research and data analyst tools |
| `dashboard/caregiver/` | Caregiver-specific views |
| `dashboard/settings/` | User profile and notification settings |
| `api/` | Server-side Route Handlers (see below) |
| `m/` | Mobile redirect routes |

## Key API routes (`app/api/`)

| Route | Purpose |
|-------|---------|
| `ai/` | Flameo AI chat (Anthropic Claude) |
| `flameo/` | Proactive briefing context and command briefings |
| `fires/` | Active fire data (NIFC, NASA FIRMS) |
| `geocode/` | Google geocoding |
| `shelters/live/` | Live FEMA NSS shelter feed |
| `push/` | Web push notification subscribe/check |
| `ml/` | ML model integration |
| `nri/` | FEMA National Risk Index data |
| `weather/` | Weather data (Open-Meteo) |
| `family/` | Family/My People management (invite, accept, add by email) |
| `responder/` | Responder roster, station, access log |

## Related

- [`docs/MINUTES_MATTER_FULL_DOCS.md`](../docs/MINUTES_MATTER_FULL_DOCS.md) — Section 8 documents all API routes in detail
- [`lib/`](../lib/) — Utility modules called by these route handlers
- [`components/`](../components/) — React components used in these pages
