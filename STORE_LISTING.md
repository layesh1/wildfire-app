# App Store Listing — Minutes Matter

Use this as a reference when filling out App Store Connect (iOS) and Google Play Console (Android).

---

## App Identity

- **App Name:** Minutes Matter — Wildfire Alerts
- **Bundle ID / Package Name:** `com.minutesmatter.app`
- **Category:** Weather (primary), Utilities (secondary)
- **Content Rating:** 4+ (iOS) / Everyone (Android)

---

## Short Description (80 chars — Google Play)

Real-time wildfire alerts, evacuation maps, and AI safety guidance.

## Full Description (both stores)

Minutes Matter is an equity-driven wildfire evacuation intelligence app that helps caregivers, emergency responders, and community members stay informed and act fast when wildfires threaten.

**Key Features:**

• Real-time wildfire detection using NASA FIRMS satellite data
• Interactive evacuation maps with live fire perimeters and route planning
• AI-powered safety assistant (SAFE-PATH) for personalized evacuation guidance
• Safety check-in system to track and coordinate evacuee status
• Emergency card with household details for quick reference during evacuations
• Signal gap analysis exposing communities that lack formal evacuation orders
• Incident command tools for emergency responders (COMMAND-INTEL AI)
• Multi-role dashboards for caregivers, responders, and data analysts

**Why Minutes Matter:**

Our research found that 99.74% of wildfire incidents never receive a formal evacuation order, leaving millions without official guidance. Minutes Matter fills that gap with real-time intelligence and AI-powered safety tools that work for everyone — especially vulnerable populations.

Built with equity at the core, using Social Vulnerability Index (SVI) data to highlight underserved communities most at risk.

---

## Keywords (iOS — 100 chars max)

wildfire,evacuation,alert,fire,safety,emergency,map,caregiver,AI,SVI

---

## Privacy Policy URL

https://wildfire-app-layesh1s-projects.vercel.app/privacy

---

## App Review Notes (iOS — for Apple reviewers)

This is a server-driven wildfire emergency alert app. The native shell loads our web application which provides real-time wildfire data, interactive maps, and AI safety assistance.

**Demo account for testing:**
- URL: Sign in with email/password on the login screen
- Email: [CREATE A DEMO ACCOUNT AND ADD CREDENTIALS HERE]
- Password: [ADD PASSWORD HERE]

The app uses location services to show nearby wildfires. You can test map features by allowing location access or by browsing the dashboard without it.

Key screens to test:
1. Caregiver Hub → Evacuation Map (live fire data on map)
2. Caregiver Hub → SAFE-PATH AI (chat with AI assistant)
3. Caregiver Hub → Safety Check-In (evacuee tracking)

---

## Screenshots Needed

### iPhone (6.7" — required)
1. Landing page / role selector
2. Caregiver dashboard hub
3. Evacuation map with fire markers
4. SAFE-PATH AI chat
5. Safety check-in list

### iPhone (6.5" — recommended)
Same 5 screens at 1242 × 2688

### iPad (12.9" — if supporting iPad)
Same screens at 2048 × 2732

### Android Phone
Same 5 screens — minimum 2, recommended 4-8
Feature graphic: 1024 × 500 (banner image for Play Store)

---

## Icon Checklist

- [x] 512×512 PNG (already at `public/icons/icon-512x512.png`)
- [ ] 1024×1024 PNG, no alpha, no rounded corners (for Apple — upscale from 512 or regenerate)
- [ ] Android adaptive icon foreground layer (432×432 centered on 108dp)
- [ ] Feature graphic 1024×500 (Google Play banner)

---

## Apple Privacy Nutrition Labels

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|----------------|-------------------|
| Email Address | Yes | Yes | No |
| Name | Yes | Yes | No |
| Coarse Location | Yes | No | No |
| User Content (check-ins) | Yes | Yes | No |
| Usage Data | Yes | No | No |

---

## Submission Checklist

### Before submitting iOS:
- [ ] Apple Developer account enrolled and active
- [ ] Replace `TEAM_ID` in `public/.well-known/apple-app-site-association` with your actual Apple Team ID
- [ ] Add entitlements file to Xcode target (App.entitlements is created, needs to be linked in Xcode Build Settings > Code Signing Entitlements)
- [ ] Create a demo account for Apple reviewers
- [ ] Take screenshots on iPhone 15 Pro Max simulator (6.7")
- [ ] Generate 1024×1024 app icon
- [ ] Archive and upload via Xcode

### Before submitting Android:
- [ ] Google Play Console account created
- [ ] Generate signing keystore: `keytool -genkey -v -keystore minutesmatter.jks -alias minutesmatter -keyalg RSA -keysize 2048 -validity 10000`
- [ ] Extract SHA-256: `keytool -list -v -keystore minutesmatter.jks -alias minutesmatter` and update `public/.well-known/assetlinks.json`
- [ ] Create feature graphic (1024×500)
- [ ] Take screenshots on Pixel emulator
- [ ] Build AAB: In Android Studio, Build > Generate Signed Bundle
- [ ] Upload to Play Console internal testing track first
