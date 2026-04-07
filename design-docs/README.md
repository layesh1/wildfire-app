# design-docs/

Engineering design notes, product decisions, and implementation record for Minutes Matter / WildfireAlert.

These documents capture the planning and decision-making behind every shipped feature. **"ANISHA" is an internal tracking prefix** used throughout the project for transformation and implementation documents — not a person's private notes. These are the authoritative engineering record of product decisions.

## Contents

| File | What it is |
|------|-----------|
| [`ANISHA_00_INDEX.md`](./ANISHA_00_INDEX.md) | Index of this folder with document purposes and reading order. |
| [`ANISHA_implementation-record.md`](./ANISHA_implementation-record.md) | **Most useful for judges.** As-built reference: every Supabase migration explained in plain language, backend API and frontend route overview, app behavior summary. |
| [`ANISHA_locked-product-phases-1-4.md`](./ANISHA_locked-product-phases-1-4.md) | Shipped phase specs: two-status check-in, address verification, hub split, My People / family links, responder map. |
| [`ANISHA_wildfire-transformation-implementation-plan.md`](./ANISHA_wildfire-transformation-implementation-plan.md) | Master plan: vision, phases, target data model, risks. Cross-check with the implementation record for actual final state. |
| [`ANISHA_product-decision.md`](./ANISHA_product-decision.md) | Product decisions log — key choices and rationale. |
| [`ANISHA_ui-hub-map-redesign.md`](./ANISHA_ui-hub-map-redesign.md) | UI spec for the hub tab layout, map and side panel, and alert surfaces. |
| [`ANISHA_automation-evacmap-checkin-agentic-alerts.md`](./ANISHA_automation-evacmap-checkin-agentic-alerts.md) | Phase continuation: multi-address, check-in flows, evacuation map, agentic alert specs. |
| [`ANISHA_flameo-agentic-transformation.md`](./ANISHA_flameo-agentic-transformation.md) | Flameo AI design: trigger conditions, bounded actions, API phases A/B/C. |
| [`ANISHA_emergency-responder-station-and-consent.md`](./ANISHA_emergency-responder-station-and-consent.md) | Emergency responder flow as-built: station system, iOS join codes, RLS recursion fixes, Data Access Agreement consent UI. |

## Related

- [`docs/`](../docs/) — Outward-facing product and engineering documentation
- [`supabase/migrations/`](../supabase/migrations/) — Database schema (each migration is explained in `ANISHA_implementation-record.md`)
