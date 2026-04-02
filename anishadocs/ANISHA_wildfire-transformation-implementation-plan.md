# ANISHA — Wildfire App Transformation: Full Implementation Plan

**Owner narrative:** This document is the single source of truth for transforming the app into a **clear, automated story** with **two distinct consumer roles** (Caregiver vs Evacuee), **family groups** (Life360-style invites), a **Command Center** for emergency responders, and a path for **field → command** communication from iOS.

**Related:** [ANISHA_00_INDEX.md](./ANISHA_00_INDEX.md) · [**ANISHA_implementation-record.md**](./ANISHA_implementation-record.md) (**as-built: migrations, API/FE, high-level app — use this for what shipped**) · [**ANISHA_emergency-responder-station-and-consent.md**](./ANISHA_emergency-responder-station-and-consent.md) (**ER: station hub, RLS, roster APIs, consent**) · [**ANISHA_locked-product-phases-1-4.md**](./ANISHA_locked-product-phases-1-4.md) (**Phases 1–4 reference**) · [ANISHA_ui-hub-map-redesign.md](./ANISHA_ui-hub-map-redesign.md) · [ANISHA_automation-evacmap-checkin-agentic-alerts.md](./ANISHA_automation-evacmap-checkin-agentic-alerts.md)

**Implementation note:** The codebase has moved toward a **single consumer role (`evacuee`)** and **My People** instead of a separate caregiver product role; Section 1 goals below reflect an earlier two-role UX target. See **ANISHA_implementation-record.md** for the current model.

---

## 1. Goals (What “Done” Means)

1. **No combined “Caregiver/Evacuee” signup** — user signs up as **either** Caregiver **or** Evacuee. One primary dashboard story per role; **no** “My Safety vs Caring For” mode switching as the main mental model.
2. **Evacuee** can create a **family group** and invite members; **in-family alerts** (safety, fire proximity, check-ins) are scoped to that group.
3. **Caregiver** joins a family **by invite** or is **linked to an evacuee/family** they support; they see **monitored people** and their locations on the map (within privacy rules).
4. **Emergency Responder** has a **Command Center** dashboard distinct from consumer apps.
5. **Firefighters (field)** send status/updates to Command Center via an **iOS app** (or phased: API + minimal client).
6. **Email verification + address** are first-class gates for **automating** “near me” hub behavior (fires, shelters, hazards, notifications).
7. **Hub UI** is simplified: **map-first**, with a **side panel** for list-style insights and actions; **Early Fire Alert** is either **fully automated** from address + APIs or **removed** from the primary journey.

---

## 2. Current State (Baseline to Transform)

- Roles in code overlap: `caregiver` often bundled with evacuee; `evacuee` exists in types/API but UI treats many flows as “Caregiver / Evacuee.”
- `RoleContext` toggles “My Safety” vs “Caring For” — target is to **remove** this as the core pattern for v2 consumer UX.
- Person data split: `profiles`, `monitored_persons` / localStorage, emergency card — needs **family** as the organizing unit.
- Hub today: large hero + embedded map + many tiles; **Evacuation Map** is a separate tab with richer map — **consolidation** is required.
- Check-in API/UI status mismatch documented in prior audits — must be fixed when check-in is part of family alerts.

*Implementation should assume incremental migration (feature flags, parallel routes) to avoid freezing the team.*

---

## 3. Role & Product Surfaces

| Surface | Users | Notes |
|--------|--------|--------|
| **Consumer Web (Caregiver)** | Caregiver | Family membership, monitor evacuees, map + side panel, notifications |
| **Consumer Web (Evacuee)** | Evacuee | Family creation/invites, own address, check-in, map + alerts |
| **Command Center Web** | Emergency Responder / Command | Incident overview, resources, feeds from field |
| **Field iOS** | Firefighter / field unit | Structured messages, location optional, sync to Command Center APIs |

**Out of scope for first slice:** full native Android; analyst/research dashboards can remain behind separate login or `/analyst` until story is stable.

---

## 4. Data Model (Target)

### 4.1 Core entities

- **`families`** (or `households`)
  - `id`, `name`, `created_by_user_id`, `created_at`
- **`family_members`**
  - `family_id`, `user_id`, `role_in_family`: `evacuee` | `caregiver` | `dependent` (optional)
  - `status`: `invited` | `active` | `removed`
  - `invited_email`, `invite_token`, `expires_at`
- **`profiles`** (extend)
  - `app_role`: **`caregiver` | `evacuee`** (single primary; no dual registration)
  - `email_verified_at` (mirror or trust Supabase auth)
  - `home_address` (text), `home_lat`, `home_lng`, `address_updated_at` (geocoded server-side)
  - Deprecate ambiguous `role` + `roles[]` for consumers **or** map `app_role` as source of truth with migration path
- **`family_caregiver_links`** (if caregiver supports multiple families later)
  - Optional v2: caregiver ↔ family with permissions

### 4.2 Invitations (Life360-style)

- **`family_invites`**: token, family_id, inviter_id, invitee_email, role_hint (`caregiver`|`evacuee`), expires_at, consumed_at
- Flow: Evacuee creates family → “Invite caregiver” / “Invite family” → email with deep link → accept → join `family_members`

### 4.3 Field → Command (for iOS + dashboard)

- **`field_reports`** or **`incident_updates`**
  - `id`, `incident_id` (optional), `author_user_id` (responder), `body` or structured fields, `lat`, `lng`, `created_at`, `visibility`
- **`devices`** / **`push_subscriptions`** already partially exist — extend for iOS app keys

---

## 5. Authentication & Verification

### 5.1 Separate entry points

- **`/auth/signup/caregiver`** and **`/auth/signup/evacuee`** (or query `?type=`) — **one** choice per account; copy and steps differ (evacuee: family name; caregiver: who you support later).
- **Enforce** Supabase **email confirmation** for consumer accounts (project setting + UI: block hub until verified **or** show limited “verify email” screen — product choice).

### 5.2 Address gate for automation

- After verify (or in same session post-verify), **required** step: **home address** (with map pin or autocomplete).
- Server: **geocode once** (Nominatim or Mapbox/Google if added), store `lat/lng` + normalized label.
- All “near you” features read from **profile home** (evacuee) or **per-monitored-person** addresses (caregiver) stored in DB, not only localStorage.

---

## 6. User Journeys (Narrative)

### 6.1 Evacuee

1. Sign up as Evacuee → verify email → enter address → land on **Hub (map-first)**.
2. Create **Family** → invite spouse/caregiver by email.
3. Receive **family-scoped alerts** (fire proximity, red flag, check-in requests).
4. **Check-in** safe / need help → notifies family (in-app + push).

### 6.2 Caregiver

1. Sign up as Caregiver → verify email → address (optional “base” home; monitoring addresses primary).
2. **Join family** via invite **or** accept link from evacuee.
3. Hub shows **family members** in **Monitor** side tab + **pins on map** (with consent).
4. Same map + side panel as evacuee; extra affordances: ping check-in, view dependent status.

### 6.3 Emergency Responder / Command

1. Invite-only or org SSO (future); lands on **Command Center** (existing responder area refocused).
2. Views aggregated incidents, field updates, resource status.

### 6.4 Firefighter (iOS)

1. Authenticated as **emergency_responder** (or sub-role `field_unit`).
2. Posts updates → **`field_reports`** API → real-time or poll on Command Center.

---

## 7. Hub & Map — Implementation Strategy

**Single primary view:** **Evacuation Map** capabilities embedded in **Hub** (not a separate mental “tab” for core value). Details in [ANISHA_ui-hub-map-redesign.md](./ANISHA_ui-hub-map-redesign.md).

**Automation:**

- **Fires near you:** filter NIFC/FIRMS/active fires by radius of **home** or **selected monitored person**.
- **Shelters:** nearest *n* from static or API-backed list (current code uses static `EVAC_SHELTERS` — phase 1 keep static + distance sort; phase 2 real shelter API if available).
- **Hazards:** existing `HAZARD_FACILITIES` + distance + alert if within threshold.
- **Early Fire Alert page:**  
  - **Option A (preferred):** Remove standalone tab; run same logic in background → push **“My Alerts”** + badge on hub.  
  - **Option B:** Keep one screen but auto-run on load (no manual “check” as primary action).

**Side panel:** List **Fires near you**, **Nearest shelters**, **Hazard proximity**, **Family alerts**, quick **Check-in** — replaces the large central non-map block on current hub.

---

## 8. Phased Roadmap

### Phase 0 — Documentation & flags

- [x] ANISHA docs (this set)
- [ ] Feature flag: `NEXT_PUBLIC_CONSUMER_V2_HUB` (or similar)

### Phase 1 — Identity split

- [ ] DB: `app_role` + migration from `profiles.role`
- [ ] New signup routes: caregiver-only vs evacuee-only
- [ ] Remove consumer use of `RoleContext` mode switch (or hide behind flag)
- [ ] Enforce email verification UX parity with Supabase settings

### Phase 2 — Families & invites

- [ ] Tables: `families`, `family_members`, `family_invites`
- [ ] APIs: create family, invite, accept, list members
- [ ] Email templates / deep links for invites

### Phase 3 — Address automation

- [ ] Geocode service (server route) + persist lat/lng on profile
- [ ] Hub queries: radius filter for fires; sort shelters/hazards

### Phase 4 — Hub UI v2

- [ ] Layout: map (from evacuation map) + monitor side tab + side panel lists
- [ ] Deprecate or merge Early Fire Alert per decision (A/B)
- [ ] Notification panel wired to same alert engine

### Phase 5 — Check-in & family notifications

- [ ] Fix check-in API/client status contract
- [ ] Family-scoped notifications (DB + realtime optional)

### Phase 6 — Command Center & iOS

- [ ] `field_reports` API + RLS
- [ ] Command Center UI consumes stream
- [ ] iOS minimal client: login + send update + optional GPS

---

## 9. Files Likely to Change (Reference)

| Area | Files (current) |
|------|------------------|
| Signup | `app/auth/login/page.tsx`, new `app/auth/signup/**` |
| Profile | `app/dashboard/settings/page.tsx`, `lib/user-data.ts` |
| Hub | `app/dashboard/caregiver/page.tsx`, `app/dashboard/caregiver/map/**` |
| Role nav | `components/Sidebar.tsx`, `middleware.ts` |
| APIs | `app/api/**`, new `app/api/families/**`, `app/api/field-reports/**` |
| Types | `types/index.ts` |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing users | Migration script: map old `caregiver` → choose default `app_role`; soft launch with flag |
| Privacy (location) | Consent on invite; blur exact address in some views; audit RLS |
| Scope creep | Ship Phase 1–4 before heavy iOS features |
| Nominatim rate limits | Cache geocodes server-side; throttle |

---

## 11. Open Decisions (Product)

1. Can one email be **both** caregiver and evacuee? **Recommendation:** No — two accounts or single account with **one** `app_role`; family links bridge them.
2. Dependents without email: **Evacuee** adds “household member” without login? (v2: dependent profile under family.)
3. Analyst dashboard: keep separate URL vs merge under command — **defer**.

---

*This document is living. Update it when phases complete or scope shifts.*
