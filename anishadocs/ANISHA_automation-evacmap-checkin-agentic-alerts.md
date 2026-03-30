# ANISHA — Automation, Full Evacuation Map, Check-In for Family, Agentic Early-Fire Alerts

**Status:** Implementation plan (not yet fully built).  
**Continues:** [ANISHA_wildfire-transformation-implementation-plan.md](./ANISHA_wildfire-transformation-implementation-plan.md) · [ANISHA_ui-hub-map-redesign.md](./ANISHA_ui-hub-map-redesign.md)  
**Shipped baseline:** [ANISHA_locked-product-phases-1-4.md](./ANISHA_locked-product-phases-1-4.md) (roles, two-status check-in, verify address, hub split)  
**Index:** [ANISHA_00_INDEX.md](./ANISHA_00_INDEX.md)

**Purpose:** Lock product and engineering decisions for: (1) **caregiver + evacuee** automation anchored on **multiple addresses** (self + family/assigned evacuees), (2) **Check-in** as the primary place to mark **self or others** safe—with **return navigation to My Hub**, (3) a dedicated **Evacuation Map** route for **full-screen** situational awareness with a **side rail** (shelters, hazards, early-fire intelligence), (4) **removal of the standalone Early Fire Alert tab** by **integrating** that capability into **My Alerts** + map via an **agentic / scheduled AI-assisted** pipeline when fire risk is within radius **X** of a monitored address.

---

## 1. Product goals (this phase)

| # | Goal |
|---|------|
| G1 | **Caregiver** evacuation intelligence applies to **their own** address **and** every **evacuee/family member** they support (geocoded addresses, pins, per-person “near you” context where privacy allows). |
| G2 | Primary nav uses **Check-in** (not “Monitor”): extend the **existing Safety Check-In** screen ([§6](#6-check-in--canonical-ui--flows-and-return-routing)) so caregivers **check themselves in** and **check in family/evacuees** using the **same four statuses and copy**—do not replace that UX with a new pattern. |
| G3 | **Early Fire Alert** is **not** a top-level tab; it is **automated** into **My Alerts** on **My Hub** for **both** roles, and reinforced on **Evacuation Map**. |
| G4 | **Agentic AI** (bounded): periodically evaluate **fire proximity + optional FIRMS/weather** vs **profile/monitored addresses**; emit **structured alert items** (severity, copy, radius km/mi, sources) into a **single alerts feed** consumed by Hub + map. |
| G5 | **Evacuation Map** returns as a **caregiver** (and optionally **evacuee**) **route**: full-screen map, **collapsible side panel** for nearest shelters, hazard sites, and **early-fire / prediction-style** cards; same data model as Hub alerts where possible. |
| G6 | From **My Hub → Check-in**, user completes check-in and is **routed back to My Hub** (or Evacuation Map if they entered from there—see §6). |

---

## 2. Information architecture — final nav

### 2.1 Caregiver (desktop sidebar + mobile bottom bar)

| Label | Route | Role |
|--------|--------|------|
| **My Hub** | `/dashboard/caregiver` | Map-first summary: embedded map + **My Alerts** + quick actions (narrower map than full evac map). |
| **Ask FlameoAI** | `/dashboard/caregiver/ai` | Unchanged. |
| **Evacuation Map** | `/dashboard/caregiver/map` | **Restore** as real page: full viewport map + **side rail** (shelters, hazards, early-fire / agentic alerts list). No duplicate “alert-only” tab. |
| **Check-in** | `/dashboard/caregiver/checkin` | Self + **each linked evacuee/family member**; mark safe; optional message; **return to Hub** on success. |
| **Settings** | `/dashboard/settings` | Profile, address, notifications, radius preferences (see §5.3). |

**Remove from primary nav:** **Early Fire Alert** (`/dashboard/caregiver/alert` as a tab). The **feature** remains as **automation + deep link** from an alert card (“View details”) if needed, or the route becomes **redirect → Hub with `?highlight=alerts`** until legacy URLs die.

### 2.2 Evacuee

| Label | Route | Notes |
|--------|--------|------|
| **My Hub** | `/dashboard/evacuee` | Same automation: **My Alerts** includes agentic early-fire items for **their** address. |
| **Ask FlameoAI** | `/dashboard/caregiver/ai` | Shared. |
| **Evacuation Map** (optional) | `/dashboard/evacuee/map` | Either **same component** as caregiver with role-appropriate pins, or **redirect** to `/dashboard/caregiver/map` with query `role=evacuee`—product choice; recommend **shared `EvacuationMapPage` with `consumerRole` prop**. |
| **Check-in** | `/dashboard/caregiver/checkin` or `/dashboard/evacuee/checkin` | **Single** check-in implementation with role-aware copy; **return to** `/dashboard/evacuee` for evacuee. |
| **Settings** | `/dashboard/settings` | Include **alert radius** and notification toggles. |

**Mobile:** Align tab sets with desktop (Hub, Evacuation Map, Check-in, Settings—or Hub, Check-in, Settings if map is only on Hub for evacuee v1; **recommend** Map tab for parity with caregiver).

---

## 3. My Hub — what it is (both roles)

**My Hub** remains the **default home**: faster orientation than full-screen map.

- **Caregiver:** Left rail: **family / assigned evacuees** quick select (center map + alerts on **that** address) **or** rename to “People” if Check-in owns the word “family” in marketing—**implementation**: same data as today’s monitor list, **labeling** aligned with Check-in (“Who you can check in”).
- **Center:** Compact **live map** (same `LeafletMap` stack).
- **Right:** **My Alerts** (unified feed: NIFC near you, shelters, hazards, **agentic early-fire**, wind/red-flag when available) + **Open Check-in** / **Open full Evacuation Map**.

**Evacuee:** No multi-person left rail unless **family members** exist in DB; otherwise **You + go-bag** only.

---

## 4. Evacuation Map (full-screen) — specification

### 4.1 Layout

- **Desktop:** `100vh` (minus app chrome): map **fills** main area; **right drawer** (280–360px, collapsible) with tabs or sections: **Shelters** (sorted by distance from **current map anchor**), **Hazard sites**, **Early fire / AI alerts** (same items as My Alerts subset, filterable).
- **Mobile:** Full-screen map; **bottom sheet** for the same three sections; FAB or top chip to toggle sheet.
- **Map anchor** (same rules as Hub): GPS if permitted → else selected person (caregiver) → else profile home.

### 4.2 Data

- Reuse `EVAC_SHELTERS`, `HAZARD_FACILITIES`, NIFC (`/api/fires/nifc`), optional FIRMS (`/api/fires/firms` when key present).
- **Early-fire strip** in drawer: read from **shared alerts store** (§5), not a separate manual page.

### 4.3 Routing

- **Restore** `app/dashboard/caregiver/map/page.tsx` as a **client** page (not redirect-only): compose `EvacuationMapShell` + `LeafletMap`.
- **Extract** shared layout from Hub to avoid drift: e.g. `components/evacuation/EvacuationMapExperience.tsx` used by **Hub** (inset) and **Evacuation Map** (fullscreen + drawer).

---

## 5. Early fire alert — automation + agentic AI

### 5.1 User-visible outcome

- **My Alerts** shows cards such as: *“Early signal: thermal activity / fire perimeter within X mi of [address label]”* with severity badge, timestamp, **sources** (NIFC, FIRMS, optional AI summary), and actions: **View on map**, **Check in**, **Open shelters**.
- **No** separate sidebar tab for “Early Fire Alert.”

### 5.2 Non-AI baseline (always on)

- **Scheduled job or client interval** (e.g. 5–15 min): for each **relevant coordinate** (evacuee: home; caregiver: home + each monitored address with consent), call NIFC + optional FIRMS; compute **min distance** to any incident; if **< radius R** (user or default, e.g. 50 km / configurable mi), **upsert** an alert row or in-memory feed item with stable `dedupe_key` (e.g. `nifc:{fire_id}:anchor:{hash}`).

### 5.3 Agentic AI layer (bounded)

**Definition:** A **server-side** step (API route or background worker) that:

1. Takes **structured inputs** only: list of nearby incidents, weather snippet, SVI/county if available, **addresses as labels** (not raw PII in prompts if avoidable—use “Location A” + hashed id server-side).
2. Calls **Anthropic** (existing `ANTHROPIC_API_KEY`) with a **strict JSON schema** output: `{ severity, headline, rationale_bullets[], recommended_actions[], confidence }`.
3. **Never** invents incidents: model **interprets** already-fetched facts; validator rejects if claims don’t match input incident ids.
4. Writes result to **`user_alert_items`** (or extends existing table) with `type: 'early_fire_ai'`, `expires_at`, `read_at`.

**Triggers:** On new incident inside R; on containment change beyond threshold; optional daily digest.

**Fallback:** If no API key or model failure, show **rule-based** copy from baseline (same as today’s early alert page logic).

### 5.4 Configuration (Settings)

- **Alert radius R** (per user): e.g. 10 / 25 / 50 mi.
- **Enable AI summaries** (toggle): off = rule-based only.

### 5.5 Data model (minimal)

```text
user_alert_items (
  id, user_id,
  type,           -- 'nifc_proximity' | 'firms_proximity' | 'early_fire_ai' | 'hazard_proximity' | ...
  severity,       -- enum
  title, body,    -- display
  metadata jsonb, -- fire ids, distances, lat/lng anchor id
  created_at, expires_at, read_at, dismissed_at
)
```

RLS: user reads own rows. Caregiver **may** need rows scoped to **family_id** or **“on behalf of”** evacuee—**phase 1:** caregiver sees **their** alerts + **merged** alerts for monitored persons (server composes one feed); **phase 2:** family-wide RLS.

---

## 6. Check-in — canonical UI, flows, and return routing

### 6.0 Canonical Safety Check-In (already shipped — do not redesign)

**Source file:** `app/dashboard/caregiver/checkin/page.tsx` (used from both caregiver and evacuee nav today; same route).

**Eyebrow / title / intro (preserve tone and meaning):**

- Eyebrow: `CAREGIVER · CHECK-IN` today — **implementation:** make **role-aware** (`CAREGIVER · CHECK-IN` vs `EVACUEE · CHECK-IN`) when we add `/dashboard/evacuee/checkin` or pass `consumerRole` prop.
- **H1:** `Safety Check-In`
- **Subtitle:** *Let emergency services and loved ones know you're safe. Update your status as your situation changes.*

**Section heading:** `Update your status`

**Four statuses** (values are the DB/API contract today — keep exactly):

| `value` (DB) | Label | Description (user-facing helper text) |
|--------------|--------|--------------------------------------|
| `evacuated` | Evacuated — I am safe | I have left the area and am in a safe location. |
| `sheltering` | Sheltering in place | Staying inside a sturdy building because leaving right now is more dangerous than staying. Close all windows and doors, turn off HVAC, and monitor official alerts. Only use this if you cannot safely evacuate — evacuating early is always preferred. |
| `returning` | Returning home | The immediate danger has passed and I am heading back. |
| `unknown` | Need help / Unknown | I need assistance or my situation is unclear. |

**Optional field**

- Label: `Location / shelter name (optional)`
- Placeholder: `e.g. Red Cross Shelter — Pasadena High School`

**Primary CTA**

- Default: `Update My Status`  
- Loading: `Saving…`  
- Success flash: `✓ Status updated`

**Current persistence (dashboard flow)**

- Table: **`evacuee_records`**
- Upsert keyed by **`user_id`** (one row per signed-in user): `status`, `location_name`, `updated_at`.
- **Recent Community Check-Ins** block: last 10 rows from `evacuee_records` (anonymized list in UI).

**Refactor for reuse (implementation task)**

- Extract `STATUS_OPTIONS`, `Status` type, and label/copy into e.g. `lib/checkin-status.ts` (or `components/check-in/constants.ts`) so **mobile** (`app/m/dashboard/caregiver/checkin/page.tsx`) and any **evacuee route** cannot drift.

**Separate flow — do not conflate**

- **`POST /api/checkin`** (`app/api/checkin/route.ts`) is for **token-based** check-ins (magic link / ping): validates UUID `token`, writes **`checkin_events`**, used by **`/checkin/[token]`**.  
- **Dashboard Safety Check-In** uses **direct Supabase** `evacuee_records` from the client today.  
- **Phase C** may add a **small server route** for caregiver-on-behalf-of (service role or RLS policy) that still writes **the same status enum + `location_name`** into **`evacuee_records`** (or a new `evacuee_records` row keyed by **subject** `user_id` + optional `updated_by_user_id`), but the **UI cards and copy stay as above**.

### 6.1 Evacuee flow

- **My Hub → Check-in** → **Who:** only **Self** (no stepper needed unless family accounts exist later).
- Same **Safety Check-In** UI as §6.0.
- After successful **Update My Status** → **`router.push('/dashboard/evacuee')`** (My Hub) + optional toast / `?checkin=success`.

### 6.2 Caregiver flow (extension, not replacement)

- **Step 1 — Who are you updating?** Segmented control or list: **Me** | **[Each monitored person name]** (from `monitored_persons` / future `family_members` — same source as map pins).
- **Step 2 — Same screen as today:** `Update your status` grid (four options + optional location + **Update My Status**).
- When a **dependent** is selected, show a single line under the H1: *Updating status for **[Name]** (visible to emergency contacts you’ve authorized).*  
- **Me:** keep current behavior (`user_id` = auth user).  
- **Other person:** persist to **`evacuee_records`** for **that person’s `user_id`** if they have an account, **or** to a **`monitored_person_checkins`** table keyed by `monitored_person_id` + `caregiver_user_id` if they are local-only (no login) — **schema decision in Phase C**; UI copy unchanged.

### 6.3 Context from My Alerts / map

- Entry from alert: `?from=alert&fireId=…` (and optional anchor id) → **banner** above the form: *Elevated fire activity reported near your area — updating your status helps loved ones and responders.* + link **View Evacuation Map**.

### 6.4 Return routing (explicit)

- Default after save: **`router.push(hubBase)`** (`/dashboard/caregiver` or `/dashboard/evacuee`).
- If user opened Check-in with `?returnTo=/dashboard/caregiver/map`, honor that after success.

### 6.5 API / server work (Phase C)

- **Do not** overload token `POST /api/checkin` for dashboard caregiver-proxy unless we unify intentionally; prefer **`POST /api/evacuee-records`** or Supabase RPC with RLS: caregiver allowed only for linked `monitored_person_id` / `family_member`.
- Document **same** `status` enum as §6.0 table.

---

## 7. Automation matrix (caregiver)

| Anchor | Map pins | My Alerts | Agentic evaluation |
|--------|----------|-----------|---------------------|
| Caregiver home | Yes | Yes | Yes (if address present) |
| Each assigned evacuee w/ address | Yes | Yes (aggregated or per-person filter) | Yes, per address |
| GPS | Optional override center | Uses same radius logic | Uses current coords |

**Deduping:** One feed UI with **filters**: “All” | “Me” | “[Person name]”.

---

## 8. Implementation phases

### Phase A — Nav & routing (1–2 days)

- [ ] Sidebar / `MobileNav`: caregiver items = Hub, Flameo, **Evacuation Map**, **Check-in**, Settings; remove **Early Fire Alert** tab.
- [ ] Evacuee: add **Check-in** + optional **Evacuation Map** to match.
- [ ] `/dashboard/caregiver/alert`: **redirect** to Hub `?panel=alerts` or keep **orphan** page behind feature flag for debugging only.

### Phase B — Restore Evacuation Map page (2–4 days)

- [ ] New `EvacuationMapExperience` shared component; fullscreen + drawer.
- [ ] Wire `app/dashboard/caregiver/map/page.tsx` (and evacuee variant).
- [ ] Ensure mobile map tab hits same page under `/m/dashboard/...`.

### Phase C — Check-in v2 (3–5 days)

- [ ] **Extend** `app/dashboard/caregiver/checkin/page.tsx` per [§6](#6-check-in--canonical-ui--flows-and-return-routing): person picker (caregiver only); **reuse** existing four statuses, descriptions, location field, and **Update My Status** CTA.
- [ ] Extract shared `STATUS_OPTIONS` / types to `lib/checkin-status.ts`; align **mobile** check-in page if it duplicates.
- [ ] Role-aware eyebrow (**EVACUEE · CHECK-IN** vs **CAREGIVER · CHECK-IN**); optional dedicated `/dashboard/evacuee/checkin` that re-exports same component.
- [ ] Persistence: caregiver-on-behalf-of (RLS or API); keep **`evacuee_records`** shape compatible or add linked table for non-user dependents.
- [ ] **Post-submit:** `router.push(hubBase)` or `returnTo` query (§6.4).

### Phase D — Unified alerts feed + persistence (4–7 days)

- [ ] Supabase migration: `user_alert_items` (or equivalent).
- [ ] Server route: `POST /api/alerts/refresh` or cron **Edge Function** to compute proximity alerts.
- [ ] Hub + Evacuation Map drawer read same hook `useMyAlerts(userId)`.
- [ ] Mark read / dismiss in UI.

### Phase E — Agentic early-fire (3–5 days)

- [ ] `app/api/alerts/ai-summarize/route.ts` (auth required): input = structured JSON from Phase D; output validated JSON.
- [ ] Job: when new `nifc_proximity` created, enqueue AI summary; store as `early_fire_ai`.
- [ ] Feature flag `NEXT_PUBLIC_ALERTS_AI=1`; Settings toggle.

### Phase F — Polish & deprecations

- [ ] Remove dead “Monitor” copy; ensure **persons** management still reachable from Settings or Check-in “Manage people” link if not in sidebar.
- [ ] Update `ANISHA_ui-hub-map-redesign.md` **§1** table to match this doc (Monitor → Check-in; Evacuation Map restored).
- [ ] E2E smoke: caregiver multi-address alerts, check-in return, evacuee parity.

---

## 9. Files likely to touch

| Area | Files |
|------|--------|
| Nav | `components/Sidebar.tsx`, `app/m/MobileNav.tsx` |
| Hub | `app/dashboard/caregiver/page.tsx`, `app/dashboard/evacuee/page.tsx` |
| Evac map | `app/dashboard/caregiver/map/page.tsx`, `app/dashboard/evacuee/map/page.tsx`, new `components/evacuation/*` |
| Check-in | `app/dashboard/caregiver/checkin/page.tsx`, `app/m/dashboard/caregiver/checkin/page.tsx`, new `lib/checkin-status.ts`; **optional** new `app/api/evacuee-records/**` for proxy writes; **`app/api/checkin/route.ts`** stays token/ping only unless deliberately merged |
| Alerts | `app/api/alerts/**`, `lib/alerts-engine.ts` (new), Supabase migrations |
| AI | `app/api/alerts/ai-summarize/route.ts` (new), reuse Anthropic pattern from `app/api/ai/route.ts` |
| Early alert legacy | `app/dashboard/caregiver/alert/page.tsx` → thin redirect or compose from shared engine |

---

## 10. Open decisions (resolve before build)

1. **Sidebar “Manage people”:** Is **Check-in** the only entry to add evacuees, or do we keep **Persons** under Settings? **Recommendation:** **Check-in** page footer link **“Manage people you check in on”** → `/dashboard/caregiver/persons` (hidden from main nav or under Settings).
2. **Radius R default** for free vs paid tiers (if ever): start single global default **25 mi**.
3. **Evacuee Evacuation Map:** Same URL tree as caregiver vs shared component only—**recommend shared component**, separate routes for analytics.

---

## 11. Success metrics (qualitative)

- Caregiver completes **check-in for dependent** in **< 30 s** from Hub.
- **Zero** user need to open a separate “Early Fire Alert” tab; alerts appear on Hub within **one refresh cycle** of new nearby fire.
- Evacuation Map used when user needs **full context**; Hub used for **daily glance**.

---

*Last updated: 2026-03-27 (§6 aligned with existing Safety Check-In UI). Revise after Phase A–C ship.*
