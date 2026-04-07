# components/

43+ React components used across the Next.js application.

## Notable components

| Component | Purpose |
|-----------|---------|
| `FirePointMap.tsx` | Live fire point map (Leaflet + NASA FIRMS) |
| `EvacueeStatusMap.tsx` | Responder view of evacuee check-in status |
| `AnimatedFireSpread.tsx` | Animated fire spread visualization |
| `FlameoChat.tsx` | Flameo AI chat interface |
| `FlameoHubAgentBridge.tsx` | Connects Flameo AI context to the hub |
| `NotificationCenter.tsx` | Alert notification drawer |
| `AddressAutocomplete.tsx` | Google Places address input |
| `RolePicker.tsx` | Role selection UI (evacuee / caregiver / responder / analyst) |
| `LanguageSwitcher.tsx` | Multi-language support toggle |
| `Sidebar.tsx` | Role-based navigation sidebar |

## Subdirectories

| Folder | Contents |
|--------|---------|
| `ui/` | Primitive UI components (buttons, modals, form elements, animations) |
| `flameo/` | Flameo AI chat subcomponents |
| `responder/` | Responder command hub components |
| `evacuation/` | Evacuation map experience |
| `check-in/` | Safety check-in UI |
| `leaflet/` | Leaflet map utility components |
| `analyst/` | Analyst dashboard chrome |
| `hub/` | Hub tour guide |

## Related

- [`app/`](../app/) — Pages that use these components
- [`hooks/`](../hooks/) — Custom hooks used by components
- [`lib/`](../lib/) — Business logic called by components
