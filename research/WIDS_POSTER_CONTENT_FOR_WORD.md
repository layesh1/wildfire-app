# WiDS AI Forum — Scientific poster content (paste into Word)

**Source requirements (WiDS Apprenticeship — Final Deliverables):** Landscape poster **36″ H × 48″ W**; submit **.docx** only; **800–1,000 words** body text **excluding references**; **4–10** figures/tables with **numbered captions**; images **≥300 DPI**; reading order **left → right, top → bottom**. **Abstract:** one paragraph, **200–300 words**, no figures. **Font guide:** Title 60–120 pt bold; Authors 40–60 pt; Headings 30–40 pt bold; Body 24–30 pt; Captions 20–26 pt; References 16–20 pt.

**Track (WiDS Datathon 2026):** *Accelerating Equitable Evacuations*

**Project:** Minutes Matter (WildfireAlert) — `https://github.com/layesh1/wildfire-app` · iOS: `https://github.com/anishan3213-design/minutes-matter-ios`

---

## Title, authors, and affiliations

**Title**

Minutes Matter: An Agentic, Equity-Aware Wildfire Evacuation Platform for Faster Protective Action

**Authors**

Braden Carlson, Lena Ayesh, Katie Leedom, Anisha Nannapaneni, Nadia Narayanan

**Affiliations**

University of North Carolina at Charlotte · WiDS Apprenticeship Pod · Accenture Song (industry partner)

*(Add: WiDS logo, university logo, Accenture Song logo per program instructions.)*

---

## Abstract

*(200–300 words · text only · no figures)*

Wildfire evacuations fail when alerts arrive late, messages lack context, and vulnerable households are left out of opt-in systems. This work focuses on **high Social Vulnerability Index (SVI) communities**, where evacuation order rates are **3.4× lower** than less vulnerable counties — structural exclusion, not just delay. We present **Minutes Matter**, a wildfire evacuation platform serving two audiences: **emergency responders** via an agency-ready API layer and AI briefing system, and **evacuees and caregivers** via a Life360-style family safety dashboard.

The platform combines a **Next.js** app on **Vercel**, a **Supabase** backend, and **Flameo** — a three-phase **agentic AI** stack powered by **Anthropic Claude**. Flameo personalizes alerts by fusing verified home location, live fire perimeter proximity, nearest open shelter routes (with hazard-buffer avoidance), real-time weather, household evacuation status, and NRI/SVI equity context, with guardrails for life-safety message clarity. Live data feeds include **NIFC**, **NASA FIRMS**, **FEMA National Shelter System**, **Open-Meteo**, and curated **hazard facilities** (nuclear, chemical, LNG).

Analysis of a **62,696-incident WatchDuty-style dataset** found **73.5%** of fires produced no public alert; among fires with early credible signal, **99.74%** still saw no evacuation action. These gaps are not random — high-SVI counties bear disproportionate risk while receiving the fewest protective actions. Minutes Matter translates these findings into a deployable system that agencies could pilot for earlier, clearer, and more equitable evacuation outcomes.

---

## Introduction

*(100–200 words · include 1–2 figures)*

In a **2021–2025 WatchDuty-style WiDS analytic frame** (62,696 U.S. fire incidents), **73.5%** produced no public alert, and **99.74%** of fires with early credible signal still saw no evacuation action. Median time to order was **1.1 hours** (90th percentile **32.1 hours**). Fires in **high-SVI counties** grew ~17% faster than average yet received evacuation orders at **one-third the rate** of lower-SVI counties.

**Minutes Matter** responds with two product tracks:

- **Emergency Responders:** an API layer giving agencies AI-grounded briefings, live incident context, and household evacuation rollups for smarter resource allocation.
- **Evacuees & Caregivers:** a Life360-style dashboard where caregivers monitor linked family members' check-in status with push notifications.

**Figure 1.** **The alerting gap.** Funnel chart: 62,696 total U.S. wildfire incidents (2021–2025) → 16,643 with any public alert (26.5%) → fewer than 200 with a formal evacuation order among those with early signal (0.26%). Annotate peak month (July, 13,650 fires) and median hours-to-order (1.1 h). Dark background, ember-red bars. **Print ≥300 DPI, ~10 in wide.**

**Figure 2.** **Two-audience product model.** Split diagram: left side — Emergency Responders (API layer → Flameo COMMAND briefing → household rollup → resource decision); right side — Evacuees & Caregivers (evacuee check-in → caregiver dashboard → push notification). Data analyst findings feed both tracks from the center. **Print ≥300 DPI, ~8–10 in wide.**

---

## Data and methods

*(100–200 words · include 1–2 figures)*

**Data:** WatchDuty / WiDS tabular dataset (primary analytic frame); live **NIFC EGP** and **NASA FIRMS VIIRS**; **FEMA NSS** open shelters; **Open-Meteo** fire-weather; **FEMA NRI** county SVI and wildfire risk; 30 static hazard facilities (nuclear, chemical, LNG); optional **Google** geocoding and routes. **Methods:** Python (pandas, scikit-learn, plotly) in `notebooks/kaggle_wids_2026_minutes_matter.ipynb`; haversine proximity, feature engineering, RandomForest baselines.

**Table 1. Key data sources**

| # | Source | Role |
|---|--------|------|
| 1 | WatchDuty / WiDS | Primary incident analytics |
| 2 | NASA FIRMS (VIIRS) | Live fire hotspots |
| 3 | NIFC (EGP / WFIGS) | Active incidents |
| 4 | FEMA NSS | Open shelters |
| 5 | FEMA NRI | County SVI and wildfire risk |
| 6 | Open-Meteo | Weather / fire-weather |
| 7 | Hazard facilities | Routing and context |
| 8 | Google Places / Routes | Geocoding and shelter routing |

**Figure 3.** **End-to-end data pipeline.** Flowchart: NIFC / FIRMS / NSS / Open-Meteo / NRI / hazard facilities → Next.js API routes → Supabase → maps + Flameo agentic AI. Highlight the Flameo grounding step where SVI and household context are injected. **Print ≥300 DPI, ~10 in wide.**

**Figure 4.** **Flameo agentic AI — three phases.** Phase **A:** structured JSON context assembled without an LLM (location, fire proximity, shelter options, weather, SVI score, household evacuation status). Phase **B:** proactive briefing generated by Claude. Phase **C:** grounded chat with guardrails preventing unsupported safety claims. **COMMAND mode** delivers the same context layer to responders. **Print ≥300 DPI, ~8 in wide.**

---

## Results

*(100–200 words · include 2–4 figures)*

**Equity gap (core finding):** High-SVI counties (**SVI > 0.70**) received evacuation orders at **~0.7%** vs **~2.4%** in lower-SVI counties — a **3.4× gap** reflecting structural exclusion. Fires in high-SVI counties also grew **~17% faster**, compounding the harm. Among **298** extreme-spread fires, **211** (**70.8%**) had no evacuation action at all.

**Emergency Responder track:** The two-status model (home vs. personal safety) gives commanders a live "X of Y households evacuated" rollup, enabling smarter crew deployment. Flameo COMMAND briefings combine incident data, shelter availability, weather, and hazard proximity in under 30 seconds.

**Evacuee & Caregiver track:** Caregivers link family members by email or invite code; evacuee check-ins flow to the caregiver view; push notifications fire on status changes. The SwiftUI iOS client extends coverage to evacuees without web access.

**Table 2. Key results**

| Theme | Finding |
|--------|---------|
| Alerting gap | 73.5% no public alert; 99.74% no action despite early signal |
| Equity — High-SVI focus | 3.4× lower order rate; +17% faster fire growth |
| Extreme events | 70.8% of extreme-spread fires with no evacuation action |
| Flameo agentic AI | Location + fire + shelter + weather + SVI → personalized alert with guardrails |
| Responder API layer | Household rollup + Flameo COMMAND → human-in-the-loop resource allocation |
| Caregiver / evacuee | Family linking + check-in → push notification pipeline |

**Figure 5.** **Equity gap: SVI vs. evacuation-order rate.** Scatter or bar chart: x-axis = county SVI score (0–1), y-axis = evacuation order rate (%). Highlight the cluster of high-SVI counties (SVI > 0.70) at ~0.7% and lower-SVI counties at ~2.4%. Annotate "3.4× gap." *(Note: higher SVI = more socially vulnerable. High-SVI counties receive fewer orders — structural under-alerting, not that low-SVI areas face greater delay.)* **Print ≥300 DPI, ~9 in wide.**

**Figure 6.** **Silent fires by state (2021–2025).** Choropleth or horizontal bar: states ranked by count of fires with no public alert. Highlights geographic concentration of the alerting gap (e.g., Western states with high fire load). **Print ≥300 DPI, ~9 in wide.**

**Figure 7.** **Evacuation action gap over time.** Line or area chart: monthly fire counts (2021–2025) with separate series for fires with no alert, fires with alert but no order, and fires with an evacuation order. Shows the persistent size of the silent majority across years and seasons. **Print ≥300 DPI, ~9 in wide.**

**Figure 8.** **Minutes Matter UI.** Split screenshot: left — Caregiver dashboard with family member status cards and push alert preview; right — Responder Flameo COMMAND briefing panel with live incident summary. **Print ≥300 DPI, ~12 in wide.**

---

## Discussion

*(100–200 words)*

Minutes Matter maps **Equitable Evacuations** goals to a testable system: earlier awareness through multi-source data fusion, clearer next actions via Flameo **guardrails**, and equity-aware targeting of **high-SVI communities** most excluded from protective alerts. The platform serves two audiences — an **API layer for emergency responders** that supports human-in-the-loop resource allocation, and a **Life360-style caregiver dashboard** for household safety monitoring — powered by a shared agentic AI pipeline.

**Limitations:** third-party API availability; sparse shelter feeds outside active incidents; generative outputs require human oversight for life-safety decisions; notebook RF metrics on rule-labeled demo data are not claimed as real-world AUC. **Next steps:** calibration to official evacuation orders, multilingual templates with equity-aware targeting, and prospective evaluation through drills or agency pilots. The **GitHub** repository and **Kaggle** notebook support full reproducibility.

---

## References and acknowledgments

*(Smallest font on poster; not counted in 800–1,000 body words.)*

1. Women in Data Science (WiDS) Worldwide. WiDS University Datathon 2026 — Accelerating Equitable Evacuations.
2. WatchDuty. https://www.watchduty.org/
3. NASA FIRMS. https://firms.modaps.eosdis.nasa.gov/
4. National Interagency Fire Center (NIFC) / Esri feature services.
5. FEMA National Risk Index. https://hazards.fema.gov/nri/
6. FEMA National Shelter System (NSS).
7. Open-Meteo. https://open-meteo.com/
8. Anthropic. Claude API.
9. Supabase, Vercel, Next.js.

**Acknowledgments:** WiDS Worldwide; WiDS Apprenticeship Pilot; **Accenture Song**; UNC Charlotte faculty and advisors; open-data providers; WatchDuty and first-responder communities.

---

## Submission checklist

- [ ] `.docx` only — no PDF or PowerPoint.
- [ ] Body 800–1,000 words (Abstract through Discussion, excluding References).
- [ ] Abstract 200–300 words, no figures.
- [ ] 4–10 figures/tables, each with a numbered caption.
- [ ] All images ≥300 DPI.
- [ ] Submit to **WiDS Community Hub** by stated deadline.
