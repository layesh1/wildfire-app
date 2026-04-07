# docs/

Product and engineering documentation for the shipped Next.js + Supabase application.

## Contents

| File | What it is |
|------|-----------|
| [`MINUTES_MATTER_FULL_DOCS.md`](./MINUTES_MATTER_FULL_DOCS.md) | Complete product reference: user journeys, API catalog, database schema summary, Flameo AI pipeline, notification system, security model. **Start here** for a full understanding of the product. |
| [`DATA_SOURCES_AND_FLOWS.md`](./DATA_SOURCES_AND_FLOWS.md) | What powers each feature: NIFC, NASA FIRMS, Open-Meteo, Google geocoding, FEMA NSS shelters, Supabase `fire_events`. |
| [`RESPONSIBLE_AI.md`](./RESPONSIBLE_AI.md) | Flameo AI guardrails — what the AI does and does not do, topic scope enforcement, medical/legal disclaimers. |
| [`FLAMEO_GUARDRAILS_AUDIT.md`](./FLAMEO_GUARDRAILS_AUDIT.md) | Audit log of AI guardrail state before and after the ANISHA transformation; test cases for grounding and scope enforcement. |
| [`HOW_WE_BUILT_THIS.md`](./HOW_WE_BUILT_THIS.md) | Development methodology (AI-assisted agile with Cursor + Claude Code), tech stack, Flameo architecture phases, key engineering decisions. |
| [`ANISHA_transformation-story.md`](./ANISHA_transformation-story.md) | Narrative of the product's evolution from Streamlit/datathon stack to Next.js + Supabase + Flameo — honest about what changed and why. |

## Related

- [`design-docs/`](../design-docs/) — Implementation record, product decisions, and engineering design notes
- [`supabase/migrations/`](../supabase/migrations/) — Full database schema as SQL
- [`app/`](../app/) — Source code (Next.js App Router pages and API routes)
