# supabase/

Supabase PostgreSQL database schema, defined as chronological SQL migration files.

## Structure

The `migrations/` folder contains SQL files named by date (`YYYYMMDDHHMMSS_description.sql`). They run in order and together define the complete database schema.

## Migration summary

| Group | Date range | What it covers |
|-------|-----------|---------------|
| Profiles & auth | Mar 10–16 | Core user profile table, role system (evacuee, caregiver, responder, analyst), invite codes |
| Security & RLS | Mar 25 | Row-level security policies isolating user data |
| Consumer features | Mar 26–31 | Check-in system, family linking (My People), push alert cadence, two-status model, mobility/disability flags, consent flags, expanded mobility v2, family lookup by email RPC |
| Family invites & responder notes | Apr 1 | Family invite system, responder notes table |
| Station & responder system | Apr 2–17 | Emergency responder station system: invite codes, station-scoped RLS, roster RPCs, responder consent + access log, RLS recursion fixes, cascade deletes |

## Related

- [`design-docs/ANISHA_implementation-record.md`](../design-docs/ANISHA_implementation-record.md) — Plain-language explanation of every migration
- [`design-docs/ANISHA_emergency-responder-station-and-consent.md`](../design-docs/ANISHA_emergency-responder-station-and-consent.md) — Deep dive on the responder station RLS architecture
