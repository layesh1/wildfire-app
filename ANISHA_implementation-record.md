# ANISHA — Implementation record (stack, migrations, app behavior)

**Purpose:** Single place to see what shipped in code: **Supabase migrations** (what each file does), **backend/API** surfaces, **frontend** routes and UX, and a **high-level app** overview.  
**Companion docs:** [ANISHA_00_INDEX.md](./ANISHA_00_INDEX.md) · [ANISHA_locked-product-phases-1-4.md](./ANISHA_locked-product-phases-1-4.md) · [ANISHA_wildfire-transformation-implementation-plan.md](./ANISHA_wildfire-transformation-implementation-plan.md)

**Last updated:** 2026-03-27

---

## 1. App overview (high level)

**Minutes Matter / WildfireAlert** is a multi-role web app:

| Audience | Experience |
|----------|------------|
| **Consumer (evacuee)** | Unified **evacuee** model: everyone signs up as an evacuee; **My People** is where you add others you watch out for. Canonical hub is **`/dashboard/home`** (map, check-in, Flameo, settings). Middleware redirects legacy `/dashboard/caregiver` and `/dashboard/evacuee` consumer URLs to `/dashboard/home`. |
| **Emergency responder** | Command-style dashboards under **`/dashboard/responder`** (and related analytics/ML/coverage routes). |
| **Data analyst** | Research tooling under **`/dashboard/analyst`**. |

**Core consumer flows:** verified **home address** (geocoding / Nominatim-style usage in app), **Flameo** context from profile + optional live GPS + optional “context address” when a My People row is selected, **Safety Check-In** (home evacuation status + personal safety status on profile; monitored people via `monitored_person_checkins`), **evacuation map** (Leaflet, NIFC fires, shelters, hazards), **family** linking by email (invites + `caregiver_family_links` table — naming is legacy; behavior is “linked accounts” for My People).

**Product note:** Older ANISHA specs described separate **Caregiver vs Evacuee** product roles. The **current codebase** standardizes on **one consumer role (`evacuee`)** and **My People** for “watching someone else,” with DB migration `20260404_unify_evacuee_role.sql` to backfill `caregiver` → `evacuee`. Some RPCs/tables still use the word `caregiver` in column names (`caregiver_user_id`, etc.); see §4 follow-ups.

---

## 2. Supabase migrations (all files, in order)

Apply in chronological order when bootstrapping a fresh project. File names use `YYYYMMDD_` prefixes.

| File | What it does |
|------|----------------|
| **20260310_add_profile_fields.sql** | Extends `profiles` with phone, address, notification channels, dependents/pets JSON, emergency contacts, language / communication needs, etc. |
| **20260311_invite_codes_and_roles.sql** | Creates **`invite_codes`** for gated **data_analyst** / **emergency_responder** signup; adds `profiles.roles[]` and `org_name`; backfills `roles` from `role`; `increment_invite_uses` helper. |
| **20260316_ensure_profile_columns.sql** | Idempotent re-assertion of profile columns (safe if 20260310 already ran). |
| **20260325_indexes.sql** | Indexes on `push_subscriptions`, `invite_codes`, `checkin_events`, `profiles` for common queries. |
| **20260325_rls_data_isolation.sql** | Enables **RLS** on `profiles`, defines `push_subscriptions` and **token-based** `checkin_events` policies (public insert for check-in links). |
| **20260326_user_sync_data.sql** | Adds **`monitored_persons`**, **`go_bag_checked`**, check-in fields, **`full_name`** on `profiles` for cross-device sync. |
| **20260327_consumer_checkins_alerts.sql** | **`evacuee_records`** (per-user status row); **`monitored_person_checkins`** (caregiver-keyed updates for monitored person IDs); **`user_alert_items`**; profile flags **`alerts_ai_enabled`**, **`alert_radius_miles`**. |
| **20260328_flameo_push_cadence.sql** | Profile columns for Flameo push escalation cadence: **`last_flameo_push_at`**, **`last_flameo_push_level`**, **`last_flameo_status_prompt_at`**. |
| **20260329_two_status_model.sql** | Splits check-in into **home evacuation** vs **person safety** on `profiles` (constraints + timestamps); backfills from **`evacuee_records`** and normalizes legacy status strings in `evacuee_records` / `monitored_person_checkins`. |
| **20260330_caregiver_family_links.sql** | Table **`caregiver_family_links`** linking two auth users (caregiver_user_id ↔ evacuee_user_id) with RLS so each side sees appropriate rows. |
| **20260331_family_lookup_by_email_rpc.sql** | **`family_lookup_user_by_email(email)`** — security definer, returns `user_id`, `full_name`, `role` for one matching login email (for add-family flows without exposing all profiles). |
| **20260401_family_invites.sql** | Table **`family_invites`** (pending email invites, token, inviter role, expiry) with RLS for inviter. |
| **20260402_accept_family_invite_rpc.sql** | **`accept_family_invite(token)`** — validates email match, inserts into **`caregiver_family_links`** depending on inviter role; marks invite accepted. **Note:** RPC still branches on `caregiver` vs `evacuee` profile roles; if every consumer is `evacuee` after **20260404**, this function may need a follow-up SQL change so invites still resolve (product/eng decision). |
| **20260403_profile_mobility_access.sql** | **`mobility_access_needs`** (`text[]`) and **`mobility_access_other`** on `profiles` (signup + settings). |
| **20260404_unify_evacuee_role.sql** | Data migration: `profiles.role` **`caregiver` → `evacuee`**; normalizes **`roles[]`** the same way and dedupes. |

---

## 3. Backend / API (representative)

Not exhaustive; grep `app/api` for the full set.

| Area | Role |
|------|------|
| **`/api/profile/role`** | Switches active role; normalizes legacy **`caregiver` → `evacuee`** when saving. |
| **`/api/flameo/context`** | Server-side Flameo context (incidents near address, weather summary, etc.); supports **`contextAddress`** override for My People selection. |
| **`/api/family/*`** | Send invite, accept invite (often calls RPC **`accept_family_invite`**), related helpers; uses **`lib/family-link.ts`** for mirroring links / monitored list where applicable. |
| **`/api/checkin`**, **`/api/evacuee-records/*`** | Check-in and legacy/simple status paths aligned with two-status model where implemented. |
| **`/api/alerts/*`**, **`/api/push/*`** | Alert and push cadence hooks (see Flameo push columns). |
| **`/api/invite/*`** | Analyst/responder invite verification and consumption. |
| **`middleware.ts`** | Auth gate for `/dashboard` and `/m/dashboard`; **mobile UA** redirect to `/m/...`; **consumer** redirect from `/dashboard/caregiver|evacuee` → **`/dashboard/home`** preserving subpath. |

**Environment:** See **`.env.example`** for `NEXT_PUBLIC_*`, Supabase keys, optional AI keys, email for family invites, etc.

---

## 4. Frontend (representative)

| Area | Notes |
|------|--------|
| **`/dashboard/home`** | Canonical consumer hub (reuses **`ConsumerHubDashboard`** from caregiver page module). Subroutes: **`/map`**, **`/checkin`**, **`/ai`**, **`/persons`**, **`/emergency-card`**. |
| **`/app/auth/login`** | Signup includes **Evacuee** role, **mobility** chips + other text; address flow. |
| **`/app/dashboard/settings`** | Profile, mobility & access, My People section, emergency card link to **`/dashboard/home/emergency-card`**, roles tab (evacuee + gated roles). |
| **`components/Sidebar.tsx`** | Nav by role; consumer nav points at **`/dashboard/home`**; **no** “My Safety vs Caring For” sidebar toggle (selection happens on hub / map / context). |
| **`components/RoleContext.tsx`** | **`self` \| `member`** persisted in `localStorage` (`wfa_role_mode`); legacy stored value **`caregiver`** read as **`member`**. |
| **`components/evacuation/EvacuationMapExperience.tsx`** | Map anchor uses **member** + selected person’s address; loads monitored people for all consumers. |
| **`components/check-in/SafetyCheckIn.tsx`** | Self + monitored subjects; Flameo **`evacuee`** role; links to **`/dashboard/home/map`**. |
| **`/m/dashboard/*`** | Mobile layouts mirroring home and responder paths where present. |

---

## 5. Follow-ups (engineering / product)

1. **`accept_family_invite` + 20260404:** If all consumers are **`evacuee`**, update the RPC (and any invite copy) so email invites still create **`caregiver_family_links`** rows without requiring a `caregiver` profile role.
2. **Rename “caregiver” in DB:** Optional later migration to rename **`caregiver_family_links`** / **`caregiver_user_id`** to neutral names (`household_links`, `observer_user_id`, etc.) for clarity.
3. **ANISHA_wildfire-transformation-implementation-plan.md** still describes a two-consumer-role world in places; treat **this implementation record** as the **current shipped model** for role semantics until that plan is revised.

---

## 6. Git / release

Implementation work for this track is intended to live on branch **`anisha-implementation`** (pushed to `origin`) so `main` can merge via PR when ready.
