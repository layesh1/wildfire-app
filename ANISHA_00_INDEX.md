# ANISHA — Documentation Index

This folder tracks transformation work for **Minutes Matter / WildfireAlert**: family / My People, **unified evacuee** consumer model (canonical hub `/dashboard/home`), Flameo context, check-in, map, and responder command surfaces. Older specs may still mention separate Caregiver vs Evacuee **product** roles; **current shipped behavior** is summarized in the implementation record below.

| Document | Purpose |
|----------|---------|
| [**ANISHA_implementation-record.md**](./ANISHA_implementation-record.md) | **As-built reference**: every **Supabase migration** explained, **API/backend** and **frontend** overview, **high-level app** behavior, follow-ups |
| [ANISHA_locked-product-phases-1-4.md](./ANISHA_locked-product-phases-1-4.md) | **Shipped phases 1–4**: two-status check-in, Verify & Save address, hub split, My Family + family links API, responder map semantics (**historical implementation reference** — align with implementation record for role naming) |
| [ANISHA_wildfire-transformation-implementation-plan.md](./ANISHA_wildfire-transformation-implementation-plan.md) | **Master plan** (vision, phases, target data model, risks) — cross-check **implementation record** for what actually landed |
| [ANISHA_product-decision.md](./ANISHA_product-decision.md) | Product decisions |
| [ANISHA_ui-hub-map-redesign.md](./ANISHA_ui-hub-map-redesign.md) | **UI spec**: Hub tab layout, map + side panel, alerts, deprecations |
| [ANISHA_automation-evacmap-checkin-agentic-alerts.md](./ANISHA_automation-evacmap-checkin-agentic-alerts.md) | **Phase continuation**: multi-address automation, check-in, evacuation map, agentic alerts, nav IA |
| [ANISHA_flameo-agentic-transformation.md](./ANISHA_flameo-agentic-transformation.md) | **Flameo / agentic** AI — triggers, bounded actions, API phases |

**Naming convention:** All transformation docs use the prefix `ANISHA_` so they are easy to find and grep.

**Last updated:** 2026-03-27 (implementation record + unified evacuee index note)
