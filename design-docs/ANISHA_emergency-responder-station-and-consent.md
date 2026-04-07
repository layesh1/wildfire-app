# ANISHA — Emergency responder: station hub, RLS, Command hub, consent

**Purpose:** Single narrative of everything shipped for the **emergency responder (`emergency_responder`)** side: **station + iOS join codes**, **roster**, **Supabase RLS** fixes, **Next.js APIs**, **environment variables**, **Station hub** vs **Command hub** UX, and the **Data Access Agreement** (consent) modal.

**Related:** [ANISHA_00_INDEX.md](./ANISHA_00_INDEX.md) · [ANISHA_implementation-record.md](./ANISHA_implementation-record.md) · [ANISHA_locked-product-phases-1-4.md](./ANISHA_locked-product-phases-1-4.md) (responder map semantics, historical)

**Last updated:** 2026-04-02

---

## 1. Scope

This document covers:

| Area | What |
|------|------|
| **Identity** | `profiles.role` / `profiles.roles[]` includes **`emergency_responder`** (invite-gated signup per `20260311_invite_codes_and_roles.sql`). |
| **Station command** | One **station** per commander (`stations.created_by`), **roster** (`station_firefighters`), **single active-style iOS join code** (`station_invite_codes`). |
| **Dashboards** | **`/dashboard/responder`** Command hub, **`/dashboard/responder/station`** Station hub, analytics / Flameo field routes as wired in `components/Sidebar.tsx`. |
| **Consent** | Versioned **responder data access** agreement before viewing sensitive evacuee map data; profile columns + modal UI. |
| **Infrastructure** | Migrations **`20260402_station_invite_system`** through **`20260417_stations_select_no_recursion`**, **`SUPABASE_SERVICE_ROLE_KEY`** on the server, optional **SECURITY DEFINER RPCs** when the service role key is absent (local dev). |

It does **not** re-spec every responder map tile or analytics screen; it focuses on **station lifecycle**, **RLS**, and **agreement UX** that were iterated in this track.

---

## 2. Routes and navigation

| Path | Role |
|------|------|
| **`/dashboard/responder`** | Primary **Command hub** (map, Flameo command panel, etc.). |
| **`/dashboard/responder/station`** | **Station hub** — station name (commanders), roster, regenerate iOS join code; **no** “create station” button (creation is signup-driven). |
| **`/dashboard/responder/analytics`** | Command analytics (sidebar). |
| **`/auth/onboarding`** | Responder branch: station/org name, phone, **verified command post address**, consents; triggers **`/api/station/create`** after profile save when appropriate. |

**Sidebar label:** “**Station hub**” (not “Station & setup”). Links from **Flameo** (`components/flameo/FlameoCommandRoom.tsx`) point to the same URL.

---

## 3. Data model (Supabase)

Defined in **`supabase/migrations/20260402_station_invite_system.sql`** (and later policies/RPCs):

| Table | Purpose |
|-------|---------|
| **`stations`** | Incident command post: `id`, `created_by` → `profiles.id`, `station_name`, `incident_name`, `incident_zone`, `created_at`, `is_active`. |
| **`station_invite_codes`** | Join codes for iOS: `station_id`, `code`, `expires_at`, `max_uses`, `uses_count`, `is_active`, etc. |
| **`station_firefighters`** | Roster: `station_id`, `firefighter_id` → `profiles.id`, location/assignment/status fields for command view. |

**Commander** = user who owns the row in **`stations`** (`created_by = auth.uid()`). **Field units** appear in **`station_firefighters`** after validating a code via the invite **accept** API flow.

---

## 4. Product flow: where the station and code come from

1. **Responder onboarding** (`app/auth/onboarding/page.tsx`): On successful save for **`emergency_responder`**, the client calls **`POST /api/station/create`** with **`station_name`** derived from the org/station name field. That creates the **`stations`** row and an initial **`station_invite_codes`** row (with retry for unique code).
2. **`useEnsureResponderStationFromProfile`** (`hooks/useEnsureResponderStationFromProfile.ts`): On first load of the hub, if the user is a responder with **`org_name`** but **`GET /api/station/roster`** returns no station, it **POSTs `/api/station/create`** once (handles late session after email confirmation, etc.).
3. **Station hub** does **not** expose a primary “Create station & join code” action; copy directs users to **signup** and fixing infra if the roster API fails.

**Join code display:** Command hub **Flameo** panel loads roster via **`/api/station/roster`** and shows the active code (commanders can **regenerate** from Station hub or from Flameo where implemented).

---

## 5. Backend APIs (Next.js)

Server routes under **`app/api/station/`** (representative):

| Route | Method | Behavior |
|-------|--------|----------|
| **`/api/station/roster`** | GET | Returns `{ station, active_invite, members }` for the current responder. Uses **`createServiceRoleClient()`** when **`SUPABASE_SERVICE_ROLE_KEY`** is set (bypasses RLS for reads). If the key is missing, uses RPCs from **`20260416_responder_roster_rpc_bypass_rls.sql`**. Returns explicit error payloads (e.g. **`STATIONS_RLS_RECURSION`**, **`STATION_ROSTER_RPC_MISSING`**) instead of **200 + empty station** on failure. Invite details are only included for **commanders** when using the service role path (parity with RLS). |
| **`/api/station/create`** | POST | Creates station + invite; uses service role DB client when configured. |
| **`/api/station/update`** | PATCH | Commander updates station fields (e.g. name). Uses service role when configured. |
| **`/api/station/invite/regenerate`** | POST | Commander: deactivates old codes, inserts new one. Uses service role when configured. |
| **`/api/station/invite/validate`**, **`accept`** | — | Validate code and accept into roster (iOS / web flows). |

**Library:** **`lib/supabase-service-role.ts`** — returns `null` if URL or **`SUPABASE_SERVICE_ROLE_KEY`** is missing; APIs must fall back to user client or RPCs where implemented.

---

## 6. Row Level Security: why recursion happened and how we fixed it

### 6.1 Original pattern

- **`stations` SELECT** policy referenced **`station_firefighters`** (e.g. `EXISTS (SELECT … FROM station_firefighters …)`).
- **`station_firefighters`** policies (especially after **`20260413_station_scope_rls_for_roster.sql`**) used **`station_ids_for_user()`**, which **read `stations` again** under the caller’s RLS → **infinite recursion** on relation **`stations`**.

### 6.2 Fixes (apply to the **same** Supabase project as `NEXT_PUBLIC_SUPABASE_URL`)

Run in order in **SQL Editor** (or your migration pipeline):

| Migration | Role |
|-----------|------|
| **`20260413_station_scope_rls_for_roster.sql`** | Introduces **`station_ids_for_user()`** and same-station SELECT policies for roster/invite reads. |
| **`20260414_station_ids_for_user_bypass_rls.sql`** | Adds **`SET row_security = off`** to **`station_ids_for_user()`** so the function’s internal reads do not re-enter RLS. |
| **`20260415_station_rls_recursion_fix_reapply.sql`** | **Drops** dependent policies, **replaces** function with `row_security = off`, **recreates** policies (safe if 13/14 partially applied). |
| **`20260416_responder_roster_rpc_bypass_rls.sql`** | Re-applies **`station_ids_for_user`** + adds **`resolve_responder_station_id`**, **`fetch_responder_station`**, **`list_station_firefighters_for_responder`**, **`fetch_active_station_invite_for_responder`** for **PostgREST RPC** use when the app cannot use the service role. |
| **`20260417_stations_select_no_recursion.sql`** | **Replaces** policy **`stations_select`** with **`USING (user_can_read_station(id))`** where **`user_can_read_station`** is **SECURITY DEFINER** and **`SET row_security = off`**. This breaks the **stations ↔ station_firefighters** cycle that could still occur even with a fixed **`station_ids_for_user`**, because the old **`stations`** policy subqueried **`station_firefighters`** under RLS. |

**Note:** **`20260412_responder_update_evacuee_home_status_rpc.sql`** is unrelated to station RLS; running it does not fix station recursion.

### 6.3 Related: `profiles` RLS (responders)

**`20260408_profiles_rls_responder_no_recursion.sql`** introduces **`auth_profile_role()`** (SECURITY DEFINER) so responder **`profiles`** policies do not recurse on **`profiles`**. Separate issue from **`stations`** but part of the same responder hardening period.

---

## 7. Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| **`NEXT_PUBLIC_SUPABASE_URL`** | Client + server | Supabase project URL. |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | Client + server | User-scoped client. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **Server only** (e.g. **Vercel** env, **`.env.local`** locally) | **Service role** secret from **Supabase → Project Settings → API → service_role**. Enables **`createServiceRoleClient()`** for station/roster/create/update/regenerate paths so they **bypass RLS** and avoid depending on RPC-only fallbacks. **Never** expose in the browser or commit to git. |

If **`SUPABASE_SERVICE_ROLE_KEY`** is missing in production, the roster route relies on **RPCs** from **`20260416`**; those must exist in the database.

---

## 8. Frontend surfaces

| Surface | File(s) | Notes |
|---------|---------|--------|
| **Station hub** | `app/dashboard/responder/station/page.tsx` | Roster load, commander rename, regenerate code, roster list; messaging that station + code come from **signup**. |
| **Command hub + Flameo** | `app/dashboard/responder/...`, `components/flameo/FlameoCommandRoom.tsx` | Join code block, errors from roster API, links to **Station hub**. |
| **Onboarding / login / add-role copy** | `app/auth/onboarding/page.tsx`, `login/page.tsx`, `add-role/page.tsx` | Updated strings: **Station hub**, signup creates code. |
| **Data Access Agreement** | `components/responder/ResponderDataConsent.tsx` | Modal before viewing sensitive evacuee data on the responder map path; **high-contrast** light card (`bg-white`), **neutral/near-black** body text, **emerald** links for Terms / Privacy (`dark:` variants for dark mode). |
| **Consent persistence** | **`20260409_responder_consent.sql`** | `profiles.responder_consent_accepted`, `_at`, `_version`; app constant **`REQUIRED_RESPONDER_CONSENT_VERSION`** in `lib/responder-data-consent.ts`. |

**Audit logging (optional product narrative):** **`20260410_responder_access_log.sql`** — **`responder_access_log`** for accountability inserts from responders.

---

## 9. Ops checklist (new environment)

1. Apply **all** migrations from **`20260402_station_invite_system.sql`** through **`20260417_stations_select_no_recursion.sql`** (and **`20260408`**, **`20260409`**, **`20260410`**, **`20260412`** as needed for your responder feature set) on the target Supabase project.
2. Set **`SUPABASE_SERVICE_ROLE_KEY`** on the **Next.js server** host (e.g. Vercel **Environment Variables**, Production + Preview as appropriate).
3. Redeploy so the server picks up the key.
4. Smoke-test: responder login → consent if prompted → Command hub → roster/join code → Station hub.

---

## 10. Quick file index (grep starters)

```
app/api/station/
app/dashboard/responder/station/page.tsx
components/flameo/FlameoCommandRoom.tsx
components/responder/ResponderDataConsent.tsx
components/responder/ResponderCommandHubShell.tsx
hooks/useEnsureResponderStationFromProfile.ts
lib/supabase-service-role.ts
lib/responder-data-consent.ts
supabase/migrations/20260402_station_invite_system.sql
supabase/migrations/20260408_profiles_rls_responder_no_recursion.sql
supabase/migrations/20260409_responder_consent.sql
supabase/migrations/20260410_responder_access_log.sql
supabase/migrations/20260413_station_scope_rls_for_roster.sql
supabase/migrations/20260414_station_ids_for_user_bypass_rls.sql
supabase/migrations/20260415_station_rls_recursion_fix_reapply.sql
supabase/migrations/20260416_responder_roster_rpc_bypass_rls.sql
supabase/migrations/20260417_stations_select_no_recursion.sql
```

---

## 11. Revision history (this doc)

| Date | Change |
|------|--------|
| 2026-04-02 | Initial write: ER station system, RLS migration chain, service role, Station hub vs signup, consent modal accessibility. |
