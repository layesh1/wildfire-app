# App Store Connect — Step-by-Step Guide
# Do this once your Apple Developer account is active

---

## STEP 1 — Install Xcode (do this now, it's 12GB)
https://apps.apple.com/app/xcode/id497799835
Takes 20-30 min. Start immediately.

---

## STEP 2 — Get your Team ID
1. Go to https://developer.apple.com/account
2. Click **Membership Details**
3. Copy your **Team ID** (looks like: `A1B2C3D4E5`)

Then update `.well-known/apple-app-site-association` in your codebase:
```
Replace: "TEAM_ID.com.minutesmatter.app"
With:    "A1B2C3D4E5.com.minutesmatter.app"   ← your actual Team ID
```
Deploy to Vercel. Apple will check `https://wildfire-app-layesh1s-projects.vercel.app/.well-known/apple-app-site-association` during review.

---

## STEP 3 — Register App ID in Developer Portal
1. https://developer.apple.com/account/resources/identifiers/list
2. Click **+** → **App IDs** → **App**
3. Fill in:
   - **Description:** Minutes Matter
   - **Bundle ID:** `com.minutesmatter.app` (Explicit)
4. Under **Capabilities**, enable:
   - ✅ Associated Domains
5. Click **Continue** → **Register**

---

## STEP 4 — Create the App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Minutes Matter — Wildfire Alerts
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** com.minutesmatter.app ← select from dropdown
   - **SKU:** minutesmatter-ios-001
   - **User Access:** Full Access

---

## STEP 5 — Fill Out App Information

### App Information tab:
- **Name:** Minutes Matter — Wildfire Alerts
- **Subtitle:** Real-time wildfire safety & alerts
- **Category:** Primary → **Weather** / Secondary → **Utilities**
- **Content Rights:** Does not contain, display, or access third-party content → No
- **Age Rating:** click Edit → answer all No → result: **4+**
- **Privacy Policy URL:** https://wildfire-app-layesh1s-projects.vercel.app/privacy

---

## STEP 6 — Prepare the Version (1.0)

### Description (paste this):
```
Minutes Matter is an equity-driven wildfire evacuation intelligence app that helps caregivers, emergency responders, and community members stay informed and act fast when wildfires threaten.

KEY FEATURES:
• Real-time wildfire detection using NASA FIRMS satellite data
• Interactive evacuation maps with live fire perimeters and route planning
• AI-powered safety assistant (SAFE-PATH) for personalized evacuation guidance
• Safety check-in system to track and coordinate evacuee status
• Emergency card with household details for quick reference during evacuations
• Signal gap analysis exposing communities that lack formal evacuation orders
• Incident command tools for emergency responders (COMMAND-INTEL AI)
• Multi-role dashboards for caregivers, responders, and data analysts

WHY MINUTES MATTER:
Our research found that 99.74% of wildfire incidents never receive a formal evacuation order, leaving millions without official guidance. Minutes Matter fills that gap with real-time intelligence and AI-powered safety tools that work for everyone — especially vulnerable populations.

Built with equity at the core, using Social Vulnerability Index (SVI) data to highlight underserved communities most at risk.
```

### Keywords (100 chars max):
```
wildfire,evacuation,alert,fire,safety,emergency,map,caregiver,AI,SVI
```

### Support URL:
```
https://github.com/layesh1/wildfire-app/issues
```

### Marketing URL (optional):
```
https://wildfire-app-layesh1s-projects.vercel.app
```

### What's New in This Version:
```
Initial release of Minutes Matter — real-time wildfire alerts, evacuation maps, AI safety guidance, and safety check-ins for caregivers and emergency responders.
```

---

## STEP 7 — App Review Information

### Sign-In Required: YES
- **Username:** [create a demo account at your app and paste email here]
- **Password:** [paste password here]

### Notes for reviewer:
```
This is a server-driven wildfire emergency app. The native shell loads our web application from https://wildfire-app-layesh1s-projects.vercel.app

Key screens to test:
1. Sign in with the demo credentials above
2. Select "Caregiver" role on the role selector
3. Tap "Evacuation Map" to see live wildfire data on an interactive map
4. Tap "SAFE-PATH AI" to test the AI safety assistant chat
5. Tap "Safety Check-In" to see the evacuee tracking system

Location permission: grant when prompted to see nearby fire data on the map. The app works without it (defaults to a national view).

There are no in-app purchases, subscriptions, or third-party login requirements other than the demo account provided.
```

### Contact Information:
- **First Name:** [your name]
- **Last Name:** [your name]
- **Email:** [your email]
- **Phone:** [your phone number]

---

## STEP 8 — Upload Screenshots

### How to take screenshots:
1. Open Xcode → Xcode menu → Open Developer Tool → Simulator
2. Launch **iPhone 16 Pro** simulator (File → Open Simulator)
3. Navigate to https://wildfire-app-layesh1s-projects.vercel.app in Mobile Safari
   OR open your built app (see Step 9 first)
4. Take screenshot: Cmd+S or Device menu → Screenshot

### Required sizes:
- **6.7" iPhone (required):** iPhone 15 Pro Max, iPhone 16 Plus → 1290×2796
- **6.5" iPhone (recommended):** iPhone 14 Plus → 1242×2688

### 5 screenshots to take:
1. **Landing page** — the role selector / hero screen
2. **Caregiver Hub** — main dashboard cards
3. **Evacuation Map** — map with fire markers visible
4. **SAFE-PATH AI chat** — a sample conversation
5. **Safety Check-In** — the evacuee list

---

## STEP 9 — Build and Upload the App

### In Terminal (after Xcode is installed):
```bash
# Open the Xcode project
npx cap open ios

# In Xcode:
# 1. Select your Apple account: Xcode → Settings → Accounts → + → Apple ID
# 2. Set your Team: click "App" target → Signing & Capabilities → Team dropdown
# 3. The entitlements file (App.entitlements) should auto-link — verify it shows
#    under Signing & Capabilities → Associated Domains:
#    applinks:wildfire-app-layesh1s-projects.vercel.app
# 4. Set destination to "Any iOS Device (arm64)"
# 5. Menu: Product → Archive
# 6. In Organizer window: Distribute App → App Store Connect → Upload
```

---

## STEP 10 — Submit for Review
1. Back in App Store Connect, go to your app → the 1.0 version
2. Select the build you just uploaded
3. Fill in Export Compliance: **No encryption** → select "No"
4. Click **Add for Review** → **Submit to App Review**

Expected review time: 1-3 business days for first submission.

---

## Timeline Summary

| Task | When |
|------|------|
| Install Xcode | **Now** (12GB, starts downloading) |
| Get Team ID | When developer.apple.com account activates |
| Update AASA with Team ID | Immediately after getting Team ID |
| Register App ID + create app in ASC | After account activates |
| Fill in all metadata | Can do anytime — all content is in this guide |
| Take screenshots | After Xcode installs |
| Archive & upload | After Xcode + account both ready |
| Create demo account | Before submitting for review |
