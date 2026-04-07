# WiDS AI Forum — Scientific poster content (paste into Word)

**Source requirements (WiDS Apprenticeship — Final Deliverables):** Landscape poster **36″ H × 48″ W**; submit **.docx** only; **800–1,000 words** for body text **excluding references**; **4–10** figures/tables with **numbered captions**; images **≥300 DPI**; reading order **left → right, top → bottom**. **Abstract:** one paragraph, **200–300 words**, **no figures**. **Font guide:** Title 60–120 pt bold; Authors 40–60 pt; Headings 30–40 pt bold; Body 24–30 pt; Captions 20–26 pt; References 16–20 pt.

**Track (WiDS Datathon 2026):** *Accelerating Equitable Evacuations* — shorten time from first credible signal to protective action; improve message clarity; improve evacuation completion for vulnerable groups.

**Project:** Minutes Matter (WildfireAlert) — `https://github.com/layesh1/wildfire-app` · iOS: `https://github.com/anishan3213-design/minutes-matter-ios`

---

## Title, authors, and affiliations

**Title**

Minutes Matter: An Agentic, Equity-Aware Wildfire Evacuation Platform for Faster Protective Action

**Authors** *(alphabetical by last name)*

Lena Ayesh, Katie Leedom, Anisha Nannapaneni, Nadia Narayanan

**Affiliations**

University of North Carolina at Charlotte · WiDS Apprenticeship Pod · Accenture Song (industry partner)

*(Add: team name if required, WiDS logo, university logo, Accenture Song logo per program instructions.)*

---

## Abstract

*(200–300 words · text only · no figures or tables)*

Wildfire evacuations fail when alerts arrive late, messages lack actionable context, and vulnerable households are underrepresented in opt-in systems. WiDS Datathon 2026 **Track 1 — Accelerating Equitable Evacuations** asks how to shorten the path from first credible signal to protective action while improving clarity and completion among at-risk communities. We present **Minutes Matter**, an operational web and mobile ecosystem that unifies WatchDuty-scale incident analytics with live operational data. The platform combines a **Next.js** application on **Vercel**, a **Supabase** backend with row-level security, and **Flameo**, a three-phase **agentic AI** stack (structured context without an LLM, proactive briefing, grounded chat with guardrails) powered by **Anthropic Claude**. Live feeds include **NIFC** and **NASA FIRMS**, **FEMA National Shelter System** shelters, **Open-Meteo** weather, **FEMA National Risk Index**–style equity layers, and curated **hazard facilities** (nuclear, chemical, LNG) for routing awareness; **Google** geocoding and routes support shelter ranking with fire- and hazard-avoidance flags. We implement a **two-status** evacuation model (home vs personal safety) for clearer household rollups for responders, **Life360-style family linking**, station-based **responder** workflows with **Flameo COMMAND**, and a native **SwiftUI iOS** client. A **Kaggle companion notebook** explores WatchDuty-style data, feature engineering, proximity to hazards, shelter coverage, and equity metrics. We address datathon pitfalls—inconsistent reporting, geographic bias, and weak ground truth—by stating assumptions explicitly and grounding user-facing outputs in reproducible pipelines. **Significance:** a tangible path from research on alert delay and silent incidents to a consent-aware, multi-role system agencies could pilot for earlier, clearer, and more equitable evacuation support.

---

## Introduction

*(100–200 words · include 1–2 figures)*

Wildfires are increasing in frequency and intensity; public demand for trusted, hyperlocal intelligence spikes during major events. In a **2021–2025 WatchDuty-style WiDS analytic frame** (62,696 U.S. fire incidents), **73.5%** had **no public alert** (46,053 “silent” events); among silent fires, only **one** received an evacuation order, and **median time to order** when orders exist was **1.1 hours** (90th percentile **32.1 hours**). **WatchDuty** and related data also show **geographic and volunteer-coverage bias**, so naive risk maps can mis-rank counties. **Track 1** challenges teams to reduce alert lag, improve message clarity, and raise evacuation completion for vulnerable groups. We address this gap with **Minutes Matter**: a **deployable prototype** that fuses these statistics with production-style APIs, maps, and AI grounded in live context. Our design emphasizes **equitable evacuation**: surfacing signal gaps, clarifying next actions, and pairing household status with **responder visibility under explicit consent**. **Figure 1** anchors national scale (incident burden, silent fraction, delay order-of-magnitude). **Figure 2** summarizes user roles (evacuee, caregiver, responder) and the **signal → context → action** loop the product enforces.

**Figure 1.** **National wildfire burden and alerting gap (2021–2025 analytic frame).** Bar or map composite: total incidents (**62,696**), silent share (**73.5%** / 46,053), median and 90th-percentile **hours to evacuation order** (**1.1 h**; **32.1 h**), and peak month (**July**, 13,650) / peak detection hour (**9 p.m. local bucket**, 6,131) where space allows. **Print:** export raster **≥300 DPI** at **~10 in** width for legibility.

**Figure 2.** **User journey and roles.** Diagram: consumers receive proximity-aware context and hazard-aware shelter routing; caregivers see linked households; responders see consented status and **Flameo COMMAND** briefings; analysts use notebook + NRI/SVI layers. **Print:** **≥300 DPI**, **~8–10 in** wide.

---

## Data and methods

*(100–200 words · include 1–2 figures)*

**Data:** WatchDuty / WiDS competition tabular data (primary for notebook exploration); live **NIFC EGP** and **NASA FIRMS VIIRS** via app proxies; **FEMA NSS** open shelters; **Open-Meteo** for fire-weather heuristics; **FEMA NRI** county endpoints for wildfire risk and social vulnerability themes; static **hazard facilities** (30 sites: nuclear, chemical, LNG); optional **Google** Places, Geocoding, and Routes. **Methods:** Python (pandas, scikit-learn, plotly) in **`notebooks/kaggle_wids_2026_minutes_matter.ipynb`** with optional **`minutes_matter_kaggle.py`** for `/kaggle/input` discovery; haversine proximity, feature engineering (fire weather, population exposure), and RandomForest baselines where labels exist. **Application layer:** TypeScript API routes; **FlameoContext** via `GET /api/flameo/context`; briefing and chat endpoints; rate limits and CSP. **Figure 3** shows the data and AI pipeline. **Figure 4** shows Flameo phases (A: structured JSON context; B: briefing; C: grounded chat + COMMAND).

**Table 1. Data sources integrated in Minutes Matter**

| # | Source | Role |
|---|--------|------|
| 1 | WatchDuty / WiDS | Primary tabular incidents and labels (notebook) |
| 2 | NASA FIRMS (VIIRS) | Live hotspots (`/api/fires/firms`) |
| 3 | NIFC (EGP / WFIGS) | Active incidents (`/api/active-fires`, `/api/fires/nifc`) |
| 4 | FEMA NSS | Open shelters (`/api/shelters/live`) |
| 5 | FEMA NRI | County wildfire risk & SVI (`/api/nri`) |
| 6 | Open-Meteo | Weather and fire-weather heuristic (`/api/weather`) |
| 7 | Hazard facilities (30) | Nuclear / chemical / LNG — routing and context |
| 8 | Google Places / Routes | Geocoding and hazard-aware shelter routing |

**Figure 3.** **End-to-end pipeline.** Flowchart: NIFC / FIRMS / NSS / Open-Meteo / NRI / hazards / (optional) Google → Next.js API routes → Supabase + maps + **Flameo** grounding. **Print:** **≥300 DPI**, **~10 in** wide.

**Figure 4.** **Flameo architecture.** Phase **A** structured JSON context (no LLM); **B** proactive briefing; **C** grounded chat + guardrails; **COMMAND** mode for responders. **Print:** **≥300 DPI**, **~8 in** wide.

---

## Results

*(100–200 words · include 2–4 figures)*

**Empirical alert chain (WatchDuty-style WiDS frame, 62,696 fires):** **41,906** fires (**99.74%**) with early external signal still had **no evacuation action**; among **298** extreme-spread fires, **211** (**70.8%**) had **no evacuation action**. Fires in **high-SVI counties** grew **~17% faster** than average. **County SVI vs. orders:** high-SVI counties (**SVI > 0.70**) showed **~0.7%** evacuation-order rate vs **~2.4%** in lower-SVI counties (**SVI < 0.55**) — order-of-magnitude **3.4×** gap — consistent with **structural exclusion**, not only delay. **Product:** the **web app** delivers verified-address anchoring, hazard-aware shelter cards, push escalation, and role dashboards; **iOS** mirrors core field flows. **Notebook:** geographic concentration, missingness, density-stratified signal gaps, **RandomForest** feature ranking (synthetic benchmark: strongest gains from **log acres**, **wind speed**, **containment**; **re-run on competition `train.csv` for held-out metrics** — demo labels are rule-derived, so metrics are for pipeline QA, not external validation). Live **`/api/active-fires`**, **`/api/shelters/live`**, **`/api/weather`** validate the deployed stack.

**Table 2. Solution highlights (quantitative + product)**

| Theme | Result / demonstration |
|--------|-------------------------|
| Silent / signal gap | **73.5%** no public alert; **99.74%** no action despite early signal (WiDS frame, above) |
| Equity | **3.4×** order-rate gap high- vs lower-SVI counties; **+17%** faster growth in vulnerable counties |
| Extreme events | **70.8%** of extreme-spread fires with **no** evacuation action |
| Flameo / routing | Phase **A** JSON context; shelter routes with hazard-buffer awareness (Google Routes) |
| Responder rollup | Two-status model (home vs personal safety) for **X / Y** evacuated clarity |
| Reproducibility | GitHub + **`kaggle_wids_2026_minutes_matter.ipynb`** + **`minutes_matter_kaggle.py`** |

**Figure 5.** **Minutes Matter UI.** Screenshot: consumer hub or evacuation map with shelters, fire layers, and hazard context (production or staging). **Print:** **≥300 DPI**, full-width **~12 in** if hero panel.

**Figure 6.** **Incident exploration (notebook).** Plotly chart: incidents by **state** or **time** (histogram or choropleth). **Print:** **≥300 DPI**, **~9 in** wide.

**Figure 7.** **Model interpretability (notebook).** Horizontal bar chart: **RandomForest** feature importance (expect **log acres**, **wind_speed_mph**, **containment_pct** leading on bundled demo; update after competition train run). **Print:** **≥300 DPI**, **~9 in** wide.

**Figure 8.** **Equity / delay analysis (notebook).** Example: alert delay or silent rate by **population-density quintile**; or **SVI vs wildfire risk** scatter by county. **Print:** **≥300 DPI**, **~9 in** wide.

---

## Discussion

*(100–200 words)*

Minutes Matter maps **Track 1** goals to a **testable system**: earlier awareness through multi-source fusion, **clearer** next actions via structured UI and Flameo **guardrails**, and **equity-aware** analytics that acknowledge WatchDuty **coverage bias** and **missing ground truth**. Compared to alert-only baselines, we stress **actionable routing**, household and family aggregation, and **responder visibility under consent**. **Limitations:** reliance on third-party API availability; sparse shelter feeds when no incident is active; generative outputs require **human oversight** for life-safety messaging; notebook **RF** metrics on **synthetic / rule-labeled** rows are **not** claimed as real-world AUC. **Next steps:** tighter calibration to official evacuation orders, multilingual alert templates aligned with WiDS “playbook” concepts, and prospective evaluation with drills or pilots. The **GitHub** repository and **Kaggle** notebook support **reproducibility** for judges and partners. Per WiDS poster instructions, the submitted **.docx** is adapted into a **Figma** print layout; replace gray figure placeholders with **≥300 DPI** exports as needed before or after handoff.

---

## References and acknowledgments

*(Smallest font on poster; not counted in 800–1,000 body words.)*

1. Women in Data Science (WiDS) Worldwide. WiDS University Datathon 2026 materials (Track 1: Accelerating Equitable Evacuations).
2. WatchDuty. Public information and dataset documentation. https://www.watchduty.org/
3. NASA FIRMS. Fire Information for Resource Management System. https://firms.modaps.eosdis.nasa.gov/
4. National Interagency Fire Center (NIFC) / Esri feature services (active incidents).
5. FEMA National Risk Index. https://hazards.fema.gov/nri/
6. FEMA National Shelter System (NSS) / Open Shelters layers.
7. Open-Meteo. Weather API. https://open-meteo.com/
8. Anthropic. Claude API (Flameo; production model per application configuration).
9. Supabase, Vercel, Next.js — product documentation as applicable.

**Acknowledgments:** WiDS Worldwide; WiDS Apprenticeship Pilot; **Accenture Song**; faculty and advisors at the **University of North Carolina at Charlotte**; open-data providers; WatchDuty and first-responder communities.

---

## Word-count note

Re-count **Abstract through Discussion** after any local edits; target **800–1,000** words (excluding References). The abstract above is ~265 words; trim body sections if your program enforces a tighter cap.

---

## Submission checklist (from WiDS poster instructions)

- [ ] `.docx` only (no PDF/PowerPoint as final submission).
- [ ] Body 800–1,000 words (excluding references).
- [ ] Abstract 200–300 words, no figures.
- [ ] 4–10 figures/tables, each with a numbered caption.
- [ ] All images ≥300 DPI.
- [ ] Submit to **WiDS Community Hub** by stated deadline; confirm date on Hub.
