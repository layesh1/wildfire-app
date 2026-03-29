# WildfireAlert — Locked Product Decisions
Last updated: March 29, 2026

## Data Model: Two Separate Status Types

### 1. Home Evacuation Status
Visible to: emergency responders + family
Stored on: profiles.home_evacuation_status

| Value | Label | Icon |
|---|---|---|
| not_evacuated | Home, not evacuated | 🏠 |
| evacuated | Evacuated — I left | 🚗 |
| cannot_evacuate | Cannot evacuate — need help | ⚠️ |

### 2. Person Safety Status
Visible to: family only (never responders)
Stored on: profiles.person_safety_status

| Value | Label | Icon | Optional field |
|---|---|---|---|
| safe | Safe | ✅ | — |
| at_shelter | At shelter | 🏥 | shelter_name |
| safe_elsewhere | Safe elsewhere | 📍 | location_note |
| need_help | Need help | 🆘 | — |

### Responder map shows:
- Home address pin
- home_evacuation_status
- mobility_flag (cannot_evacuate = different pin color)
- Name + contact info (consent-gated)

### Family view shows:
- Both statuses
- Optional live location (consent-gated, family only)
- Last updated timestamp

---

## Role Model
- One role per account: caregiver XOR evacuee at signup
- No role switching after signup
- No multi-role for consumer accounts
- emergency_responder remains invite-code gated separately

## Hub Rules
- Hazard sites: NOT on dash — Flameo surfaces only when relevant
- Go-bag: Keep, collapsed below the fold
- Early fire alert: Automated via Flameo Phase A/B — no manual toggle
- My Alerts section: Hub top — shows Flameo briefing + escalation notifs

## Settings
- Address: home address only
- Save flow: type → geocode validates → "Verify & Save" button confirms
- Copy: "In WildfireAlert → Settings (not iOS Settings)"
- After save: confirmation state shown, hub re-triggers Flameo context

## Notifications
- Cadence: 20-min minimum between same-level alerts
- Pattern: escalating L1→L4 (Monitor → Prepare → Warning → Order)
- L4 mandatory evacuation: bypasses 20-min gate, sends immediately
- Status prompt ("Update your evacuation status"): max every 2hr 
  during active incident only
- Source: WatchDuty guidance — delay better than false alarm fatigue

## Check-in
- Not binary safe/unsafe
- Uses full person_safety_status enum above
- Optional note field for shelter name or location context
- Family vs responder visibility enforced at API level

## Live Location
- Family-only — never shown to responders
- Consent-gated at first use with explicit modal
- User can revoke at any time in Settings
- Battery-aware: only active during declared incident window

## Caregiver vs Evacuee Hubs

### Caregiver hub has:
- My Persons (monitored_persons_v2)
- Assign themselves to an evacuee
- Family group management
- Both statuses for each person they monitor

### Evacuee hub has:
- Self status only (home + safety)
- Family group (Life360-style invite)
- Check-in flow
- No My Persons / RoleContext / RolePicker

## Emergency Responder
- Separate invite-code gated signup
- Sees: map of home address pins + evacuation status + mobility flags
- Does NOT see: person safety status, live location, family data
- Can mark a house as checked/evacuated from their view
- Flameo responder mode: field intel, grounded, action-oriented

---

## Implementation reference (Phases 1–4)

For **file-level** documentation of how Phases 1–4 are implemented in the repo (middleware, migrations, APIs, hubs), see [ANISHA_locked-product-phases-1-4.md](./ANISHA_locked-product-phases-1-4.md) and [ANISHA_00_INDEX.md](./ANISHA_00_INDEX.md).