# ANISHA — Locked product spec: Phases 1–4 (implementation reference)

**Purpose:** Single reference for the **four shipped phases** of the locked consumer/responder product model: role exclusivity, two-status check-in, verified address, hub split, and responder map semantics.

**Related:** [ANISHA_00_INDEX.md](./ANISHA_00_INDEX.md) · [ANISHA_wildfire-transformation-implementation-plan.md](./ANISHA_wildfire-transformation-implementation-plan.md)

**Last updated:** 2026-03-27

---

## Overview

| Phase | Theme | Summary |
|-------|--------|---------|
| **1** | Lock the role model | Caregiver and evacuee are mutually exclusive at signup and in API; middleware enforces hub URLs; settings hides consumer↔consumer role switching. |
| **2** | Two-status data model | Home evacuation vs personal safety on `profiles`; shared enums in `lib/checkin-status.ts`; Safety Check-In UI; check-in API aligns to home statuses. |
| **3** | Address “Verify & Save” | Onboarding + settings: autocomplete → reverse geocode → confirm → explicit save to `profiles.address` only; Flameo context refresh event. |
| **4** | Hub split + responder map | Evacuee vs caregiver hubs, My Family copy/invite, add-by-email family links, responder map pins/tooltips without changing demo pin data. |

**Explicitly out of scope for these phases:** FlameoChat internals, `/api/ai`, push escalation logic (do not modify those for Phases 1–4).

---

## Phase 1 — Lock the role model

### Goals

- **Caregiver** and **evacuee** are **mutually exclusive** for a single account’s consumer role.
- **`emergency_responder`** and **`data_analyst`** remain invite-code / separate flows; do not merge a second **consumer** role onto an account that already has one.
- **Active hub URL** matches `profiles.role` for consumers (evacuee cannot use caregiver routes and vice versa).

### Implemented behavior

1. **Signup / OAuth (`app/auth/login/page.tsx`, `app/auth/onboarding/page.tsx`, `app/auth/post-login/page.tsx`)**  
   - Profile payload uses a single consumer role in `roles` (e.g. `[ob.role]`).  
   - Post-login: if the user already has `caregiver` or `evacuee`, do not add the other consumer role from `intendedRole`; keep existing active consumer role and redirect to the matching dashboard.

2. **API (`app/api/profile/role/route.ts`)**  
   - If `profiles.roles` already contains `caregiver` or `evacuee`, reject POST that adds the **other** consumer role with **409** and message: *Consumer role already assigned. Create a separate account to use a different role.*  
   - Merging `emergency_responder` / `data_analyst` unchanged.

3. **Settings (`app/dashboard/settings/page.tsx`)**  
   - “Switch to this” only for **`emergency_responder`** / **`data_analyst`** when present.  
   - No UI to switch between caregiver ↔ evacuee.  
   - “Request access” list excludes offering the other consumer role if one is already held.

4. **Middleware (`middleware.ts`)**  
   - If `profiles.role === 'evacuee'` and path is under `/dashboard/caregiver` or `/m/dashboard/caregiver` → redirect to the evacuee equivalent path.  
   - If `profiles.role === 'caregiver'` and path is under `/dashboard/evacuee` or `/m/dashboard/evacuee` → redirect to the caregiver equivalent path.  
   - Does **not** block `/dashboard/responder` or `/dashboard/analyst`.

### Key files

- `app/auth/login/page.tsx`, `app/auth/onboarding/page.tsx`, `app/auth/post-login/page.tsx`  
- `app/api/profile/role/route.ts`  
- `app/dashboard/settings/page.tsx` (role config includes `evacuee` for display)  
- `middleware.ts`

---

## Phase 2 — Two-status data model

### Goals

- Split **home evacuation** (responders + family) from **personal safety** (family-oriented).
- Persist on **`profiles`** with CHECK constraints and timestamps; legacy single-status rows map to the new pair.

### Database

- **Migration:** `supabase/migrations/20260329_two_status_model.sql` (**apply manually in Supabase** if not already applied).  
  - Columns: `home_evacuation_status`, `person_safety_status`, `safety_shelter_name`, `safety_location_note`, `home_status_updated_at`, `safety_status_updated_at`.  
  - Backfill from `evacuee_records` / normalization; `profiles_visible_to_responder()` RPC for limited responder reads.  
- **`monitored_person_checkins.status`** normalized to home-evacuation values where applicable.

### Code

- **`lib/checkin-status.ts`**  
  - `HomeEvacuationStatus`, `PersonSafetyStatus`, `HOME_CHECKIN_STATUS_OPTIONS`, `PERSON_SAFETY_CHECKIN_STATUS_OPTIONS`, `mapLegacyCheckinToDual()`, guards, labels.

- **`components/check-in/SafetyCheckIn.tsx`**  
  - Section 1: **My Home Status** → `profiles.home_evacuation_status`.  
  - Section 2: **My Personal Safety** → `profiles.person_safety_status` (+ shelter / elsewhere notes).  
  - Separate **Save** buttons; self vs monitored flows as implemented.

- **`app/api/evacuee-records/dashboard/route.ts`**  
  - Validates status against home evacuation enum only.

- **`app/api/checkin/route.ts`**  
  - Token ping: `VALID_STATUSES` = `not_evacuated`, `evacuated`, `cannot_evacuate` (aligned with `HomeEvacuationStatus`).

### Key files

- `supabase/migrations/20260329_two_status_model.sql`  
- `lib/checkin-status.ts`  
- `components/check-in/SafetyCheckIn.tsx`  
- `app/api/checkin/route.ts`, `app/api/evacuee-records/dashboard/route.ts`  
- `app/checkin/[token]/page.tsx` (maps UI actions to home statuses for API)

---

## Phase 3 — Address “Verify & Save”

### Goals

- **No** persist on keystroke or on autocomplete pick alone.  
- **Persist `profiles.address` only** after: pick → **reverse geocode succeeds** → user clicks **Verify & Save**.  
- Show confirmation line and errors per spec; **always-on helper** under the field.  
- After save, **`wfa-flameo-context-refresh`** so `useFlameoContext()` reloads on hubs.

### Implemented behavior

1. **`lib/geocoding.ts`** — server geocoding and reverse geocoding via Google Geocoding API.  
2. **`components/AddressAutocomplete.tsx`** — optional `onPickSuggestion(hit)` when a suggestion is chosen.  
3. **`components/AddressVerifySave.tsx`** — wires draft input, geocode, disabled **Verify & Save** until geocode OK, success line, **✅ Address saved**, event dispatch.  
4. **`hooks/useFlameoContext.ts`** — listens for `wfa-flameo-context-refresh` and refetches context.  
5. **`app/auth/onboarding/page.tsx`** — consumers must complete verify before Continue/step 3; `finish()` uses verified address.  
6. **`app/dashboard/settings/page.tsx`** — consumer profile tab: `addressDraft` + `AddressVerifySave`; address in DB updated only through verify callback.

### Helper text (fixed)

> Enter your home address. Emergency responders use this for door-to-door safety checks.

### Key files

- `lib/geocoding.ts`  
- `components/AddressAutocomplete.tsx`, `components/AddressVerifySave.tsx`  
- `hooks/useFlameoContext.ts`  
- `app/auth/onboarding/page.tsx`, `app/dashboard/settings/page.tsx`

---

## Phase 4 — Hub split + responder map + My Family

### 4A — Evacuee hub

- **`components/MainWrapper.tsx`** — `RoleContextBar` **hidden** for `/dashboard/evacuee/*` and `/m/dashboard/evacuee/*`.  
- **`app/dashboard/caregiver/page.tsx`** (`ConsumerHubDashboard` with `consumerRole="evacuee"`):  
  - Shows self hub, Flameo briefing, check-in entry points as before.  
  - **My Family** block: copy + **Invite Family Member** disabled, labeled **Coming soon**.  
  - No caregiver-only person list / “Monitored Persons” block on evacuee path.

### 4B — Caregiver hub

- Same **`ConsumerHubDashboard`** with `consumerRole="caregiver"`:**  
  - UI strings **My Family** / **Manage family** (not DB renames).  
  - Per monitored person (excluding self row where applicable): **home** + **personal safety** labels/timestamps — **profiles first** when `monitored_person_id` is a real user UUID, else fall back to **`monitored_person_checkins`** + `mapLegacyCheckinToDual`.  
  - **Add Family Member** by email → **`POST /api/family/add-by-email`**; inserts into **`caregiver_family_links`** and merges into **`profiles.monitored_persons`** via `savePersons`.  
  - Errors: *No account found with that email…* (404); success shows name + *Added to My Family*.

### Database (family links)

- **Migration:** `supabase/migrations/20260330_caregiver_family_links.sql` (**manual apply in Supabase**).  
  - Table `caregiver_family_links (caregiver_user_id, evacuee_user_id, …)` + RLS.

### 4C — Responder map

- **`app/dashboard/responder/page.tsx`** — **`DEMO_PINS` must not be edited** (demo data frozen).  
- **`components/EvacueeStatusMap.tsx`** — derives **display** home status from each pin’s legacy `status` via `mapLegacyCheckinToDual` (no mutation of props).  
  - **Colors:** `not_evacuated` → gray, `evacuated` → green, `cannot_evacuate` → red.  
  - **Popup:** name, address, home status label; **mobility / needs** prominent when home is `cannot_evacuate` and `special_needs` is set.

### Other UI touchpoints

- **`app/dashboard/caregiver/persons/page.tsx`**, **`app/m/dashboard/caregiver/page.tsx`**, **`components/check-in/SafetyCheckIn.tsx`**, **`app/dashboard/settings/page.tsx`** — caregiver-facing **My Family** / **Manage family** copy where applicable.

### Key files

- `components/MainWrapper.tsx`  
- `app/dashboard/caregiver/page.tsx` (shared `ConsumerHubDashboard`)  
- `app/dashboard/evacuee/page.tsx`, `app/m/dashboard/evacuee/page.tsx` (re-export hub)  
- `supabase/migrations/20260330_caregiver_family_links.sql`  
- `app/api/family/add-by-email/route.ts`  
- `components/EvacueeStatusMap.tsx`  
- `app/dashboard/caregiver/persons/page.tsx`, `app/m/dashboard/caregiver/page.tsx`

---

## Manual Supabase migrations

Apply in **Supabase Dashboard → SQL** when deploying:

1. `supabase/migrations/20260329_two_status_model.sql` — two-status columns + responder RPC / policies as defined in file.  
2. `supabase/migrations/20260330_caregiver_family_links.sql` — `caregiver_family_links` + RLS.

---

## Verification checklist (local)

- `npx tsc --noEmit` — expected clean after changes touching these phases.  
- Smoke: signup as evacuee vs caregiver; confirm middleware redirects; settings role switching for analyst/responder only; verify address flow; caregiver add-by-email (after migration); responder map legend + pin colors.
