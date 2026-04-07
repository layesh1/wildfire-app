# lib/

60 utility modules — the core logic layer shared across the Next.js application. Not UI components, not route handlers; this is where business logic lives.

## Key modules

| File | Purpose |
|------|---------|
| `flameo-ai-prompt.ts` | Flameo system prompts, guardrail definitions (consumer + COMMAND modes) |
| `flameo-context-types.ts` | TypeScript types for `FlameoContext` — the structured data packet fed to the AI |
| `flameo-phase-c-tools.ts` | Flameo Phase C tool definitions for grounded chat actions |
| `flameo-briefing.ts` | Proactive briefing logic (Phase B) |
| `flameo-push-escalation.ts` | Push notification escalation logic |
| `geocoding.ts` | Server-side Google geocoding wrapper |
| `fire-risk-zone.ts` | Fire risk zone classification |
| `hazard-facilities.ts` | Static hazardous facility data (nuclear, chemical, LNG) |
| `supabase.ts` | Browser Supabase client (`createClient`) |
| `supabase-server.ts` | Server Supabase client (`createServerSupabaseClient`) |
| `nifc-fire-*.ts` | NIFC fire data fetching and parsing |
| `responder-*.ts` | Responder station and roster logic |
| `shelter-ranking.ts` | Shelter ranking and routing |

## Related

- [`app/api/`](../app/api/) — Route handlers that call these utilities
- [`docs/DATA_SOURCES_AND_FLOWS.md`](../docs/DATA_SOURCES_AND_FLOWS.md) — Data pipeline documentation
- [`docs/RESPONSIBLE_AI.md`](../docs/RESPONSIBLE_AI.md) — Flameo guardrails (implemented in `flameo-ai-prompt.ts`)
