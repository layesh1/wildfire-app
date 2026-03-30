# ANISHA — Hub & Map UI Redesign Specification

**Purpose:** Define the simplified **Hub** for **Caregiver** and **Evacuee** so the **evacuation map** is the hero, with a **side panel** for automated lists and actions. Replaces scattered tabs and the large central “My Hub” block that competes with the map.

**Master plan:** [ANISHA_wildfire-transformation-implementation-plan.md](./ANISHA_wildfire-transformation-implementation-plan.md)

**Updated IA (2026-03-27):** Caregiver nav moves from standalone **Early Fire Alert** tab to **automated My Alerts**; **Monitor** → **Check-in** (with proxy check-in for evacuees); **Evacuation Map** returns as a **full-screen** route with side rail. See [ANISHA_automation-evacmap-checkin-agentic-alerts.md](./ANISHA_automation-evacmap-checkin-agentic-alerts.md).

---

## 1. Information Architecture (Consumer)

### 1.1 Primary navigation (simplified)

| Tab / Section | Evacuee | Caregiver |
|---------------|---------|-----------|
| **Hub** | Map + panel + alerts | Same + **Monitor** (family / people) |
| **Messages / Family** (optional) | Invites, members | Join family, members |
| **Settings** | Profile, address, notifications | Same |
| **Flameo** (optional) | FAB/chat | FAB/chat |

**Remove or demote:** Separate **Evacuation Map** tab if Hub embeds the same map (redirect old URL → Hub with `?focus=map`).

**Early Fire Alert (`/dashboard/caregiver/alert`):**

- **Recommendation:** Do not use as a standalone primary journey.
- **Automation:** On Hub load (and every *N* minutes), run the same logic server-side or client-side: address → FIRMS + weather → write to **My Alerts**.
- **If complexity too high for v1:** Hide route; keep code behind flag for power users.

---

## 2. Hub Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Header: greeting · verified badge · notification bell                  │
├──────────────┬───────────────────────────────────────┬───────────────────┤
│              │                                       │  MY ALERTS        │
│  MONITOR     │           MAP (full evacuation        │  (scroll)         │
│  (caregiver  │            map component)             │  · Fire near you  │
│   only)      │                                       │  · Shelter #1   │
│  · Person A  │   Layers: fires · shelters ·         │  · Hazard X       │
│  · Person B  │   hazards · family pins                │  · Red flag       │
│  (evacuee:   │                                       │                   │
│   self only) │                                       │  QUICK ACTIONS    │
│              │                                       │  · Check-in safe  │
│              │                                       │  · Ping family    │
│              │                                       │  · Call 911       │
└──────────────┴───────────────────────────────────────┴───────────────────┘
```

- **Left column (Caregiver only):** “Monitor” — list of evacuees/family members; selecting one **centers map** and updates **My Alerts** for that person’s address (if permitted).
- **Center:** Single **Leaflet** map (reuse `dashboard/caregiver/map` + `LeafletMap.tsx` behavior): fires, shelters toggle, hazard facilities toggle, wind overlay as today.
- **Right column:** **My Alerts** (automated) + **Quick actions** (check-in, ping — family-scoped).

**Mobile:** Stack: map full width → collapsible **Alerts** sheet (bottom) → **Monitor** as bottom sheet or second screen.

---

## 3. Data Driving the Panel (Automation)

| Panel section | Source | Trigger |
|---------------|--------|---------|
| Fire near you | `/api/fires/nifc`, optional FIRMS | On load + interval; radius from **geocoded home** or selected person |
| Nearest shelters | Static list or API | Sort by haversine distance |
| Hazard sites | `lib/hazard-facilities.ts` | Distance threshold (e.g. 25 mi) |
| Weather / red flag | `/api/weather?location=...` | After geocode |
| Family / check-in | Supabase + fixed check-in API | Events |

**Notification bell:** Same items as **My Alerts** + unread state (DB table `user_notifications` or reuse existing notification center component).

---

## 4. Map Behavior by Role

| Role | Default map center | Pins |
|------|-------------------|------|
| Evacuee | User’s **home** from profile | Self + optional family members (if shared) |
| Caregiver | Caregiver home **or** first monitored person | All monitored evacuees with address + same fire/shelter/hazard layers |

---

## 5. What Gets Removed or Hidden

- **Role switcher** (“My Safety” / “Caring For”) from primary sidebar — replaced by **app_role** + **Monitor** list for caregivers.
- **Duplicate map** on Hub vs Evacuation Map — **one** map component, shared props.
- **Manual-only Early Alert** as main CTA — replaced by **automated alerts** in panel.

---

## 6. Implementation Checklist (UI)

- [ ] Extract shared `<EvacuationMapFrame />` from `app/dashboard/caregiver/map/page.tsx` for reuse on Hub.
- [ ] New layout component `HubV2Layout` (grid: optional Monitor | Map | Panel).
- [ ] `useHomeLocation()` hook: profile lat/lng + loading/error.
- [ ] `useNearbyInsights(address)` hook: parallel fetch fires + shelters + hazards + weather.
- [ ] Wire existing `NotificationCenter` to same alert list or unify data source.
- [ ] Feature flag rollback to legacy hub.

---

## 7. Accessibility & Stress UX

- Large tap targets for check-in and alerts.
- High contrast for “CRITICAL” vs “WATCH” states (reuse alert classification from early alert page if kept server-side).
- One primary color system per role (optional subtle brand difference caregiver vs evacuee).

---

*Update this spec when visual designs are attached or after usability testing.*
