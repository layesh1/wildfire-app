# WildfireAlert Responsible AI Framework

## Overview

WildfireAlert uses **Anthropic Claude** via the Messages API. The production model id is set in `app/api/ai/route.ts` (currently **`claude-sonnet-4-6`**; confirm when upgrading). The model receives **system instructions and structured context**; it does not query fire APIs directly. All fire facts intended for grounding are assembled server-side and injected into the prompt.

## What Flameo Does

- Proactively briefs users on fire threats near saved addresses when the hub loads (via `/api/flameo/briefing` and client flow).
- Grounds operational answers in **structured context** (`flameoContext`) built from app data and integrations (e.g. incident lists, shelters, routing hints) — see `GET /api/flameo/context`.
- Recommends evacuation routes and shelters when that data is present in context.
- Adapts tone and checklist-style guidance using **mobility, medical flags, and location anchor** (home / work / live) when the client supplies them in context.
- Enforces **topic boundaries** for general chat (wildfire / evacuation scope only) in the consumer system prompt in `app/api/ai/route.ts`.

## What Flameo Does Not Do

- Invent or estimate **fire names, distances, or orders** that are not in the provided context (enforced in `lib/flameo-ai-prompt.ts` **ACCURACY GUARDRAIL**).
- Provide **medical diagnosis, dosing, or “is it safe for me to…”** clinical judgments (**MEDICAL INFORMATION GUARDRAIL**).
- Replace **911**, **988**, or **local emergency management**; it directs users there when appropriate.
- Answer **legal, insurance, or “should I ignore an order?”** questions (**SCOPE GUARDRAIL**).

## Guardrail Architecture

| # | Guardrail | Mechanism |
|---|-----------|-----------|
| 1 | **Data grounding** | `buildFlameoGroundingPrefix()` injects JSON `FlameoContext` plus shelter/routing text. Model is instructed to use only that data for fires and distances. |
| 2 | **Medical information boundaries** | `FLAMEO_RESPONSIBLE_AI_GUARDRAILS` — logistics-only use of user-stated health/equipment; mandatory deferral string for medical advice; insulin/oxygen/dialysis equipment script. |
| 3 | **Mental health and distress** | Same constant — grounding language, mandatory **Crisis Text Line (741741)** and **988** when distress is severe; no “logistics-only” cold responses to fear. |
| 4 | **Hallucination prevention** | **ACCURACY GUARDRAIL** — no invented incidents, paths, road status, or orders; Watch Duty / county EM wording for uncertainty; explicit **no fires** wording when the feed is empty. |
| 5 | **Scope limitations** | **SCOPE GUARDRAIL** — allowed vs disallowed advice (legal, insurance, medical treatment, ignoring orders). |
| 6 | **Fallback when LLM fails** | API route returns a short generic reply if the model returns no text (`app/api/ai/route.ts`). |
| 7 | **Rate limiting / abuse** | Per-user (or IP) limits: **10 messages / minute**, **30 / hour** on `POST /api/ai`. |

### Who gets `FLAMEO_RESPONSIBLE_AI_GUARDRAILS` (consumer)

`POST /api/ai` does **not** branch on `flameoRole` for grounding. It prepends **`buildFlameoGroundingPrefix(flameoContext)`** whenever **`flameoContext`** is present and valid — that prefix **includes** `FLAMEO_RESPONSIBLE_AI_GUARDRAILS`.

**How the app wires that today:**

- **Evacuee / home hub Flameo** (including the Flameo surface on `app/dashboard/caregiver/page.tsx`): the hub bridge sets **`flameoRole: 'evacuee'`** and passes **`context`** from `useFlameoContext`. So the **primary grounded** consumer chat path is labeled **evacuee** in the API even when the user is on the unified caregiver hub.
- **Standalone `/dashboard/evacuee/ai` and `/dashboard/home/ai`:** `FlameoAskPage` uses **`variant="evacuee"`** but those requests **do not** currently attach **`flameoContext`** → they get the base consumer system string only (**topic boundaries**), **not** the full medical/mental-health/accuracy/scope blocks in `lib/flameo-ai-prompt.ts`.
- **Standalone `/dashboard/caregiver/ai`:** **`variant="caregiver"`**, same as above — **no** `flameoContext` in the fetch body → **no** `buildFlameoGroundingPrefix` → **no** `FLAMEO_RESPONSIBLE_AI_GUARDRAILS` from that module.

So it is **not** “caregiver vs evacuee” that turns guardrails on; it is **`flameoContext` on the request**. In practice, **grounded + full guardrails** align with the **hub evacuee-role** payload, not with the standalone **caregiver** AI page.

**Responder:** `FLAMEO_RESPONDER_SYSTEM` always includes **`FLAMEO_RESPONSIBLE_AI_GUARDRAILS`** (no `flameoContext` required).

## Human Oversight

- Fire and perimeter data are ingested from **curated pipelines and APIs** (e.g. NIFC, FIRMS, app database) before they reach Flameo context.
- The **LLM is instructed** not to exceed context; there is **no separate automated validator** that re-parses every sentence against JSON (document honestly: compliance is **prompt + product design**, not a second ML judge).
- Users can **ignore Flameo** and follow official channels (Watch Duty, county EM, 911).

## Mental Health Safeguards

- System text requires **validation of fear** and **stepwise grounding**.
- **Severe distress:** always mention **Text HOME to 741741** (Crisis Text Line) and **988**.
- These are **support resources**, not a substitute for emergency services when life is at risk — **911** remains appropriate for immediate danger.

## Data Privacy (high level)

- **Profile and health/mobility fields** (where collected) are stored in **Supabase** with **row-level security** aligned to the authenticated user; see migrations under `supabase/migrations/` (e.g. expanded mobility / consent).
- **Responder visibility** of sensitive fields is gated by **explicit consent** flags where implemented (`responder_data_consent` and related policies).
- **GPS / “live” location** for Flameo is intended for **session or client-assembled context**; do not assume indefinite retention — verify your deployment’s logging and Supabase policies.
- Users should use in-app **account / data deletion** flows where provided; exact deletion scope depends on deployed schema and policies.

## Related code

- `lib/flameo-ai-prompt.ts` — **`FLAMEO_RESPONSIBLE_AI_GUARDRAILS`**, `buildFlameoGroundingPrefix`, `FLAMEO_RESPONDER_SYSTEM`
- `app/api/ai/route.ts` — model call, rate limits, consumer base system string
- `docs/FLAMEO_GUARDRAILS_AUDIT.md` — audit log and suggested test matrix
