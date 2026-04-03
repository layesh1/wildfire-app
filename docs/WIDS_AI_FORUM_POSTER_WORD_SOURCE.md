# WiDS AI Forum — Scientific Poster (Word .docx source)

**Canonical paste-ready poster text (filled authors, results, figure specs):** use **`docs/WIDS_POSTER_CONTENT_FOR_WORD.md`** — keep that file and Word in sync.

**Generated `.docx` (python-docx):** run `python3 scripts/build_wids_poster_docx.py` after `pip install python-docx` (or repo venv: `python3 -m venv .venv-poster && .venv-poster/bin/pip install python-docx`). Output: **`docs/WiDS_Poster_MinutesMatter.docx`** — 48×36″ landscape, 0.5″ margins, 3-column borderless table, nested Tables 1–2, `tblBorders` order post-fixed for OOXML validators. Replace gray figure placeholder cells with **≥300 DPI** exports from the Kaggle notebook or app screenshots.

**Specs (WiDS Apprenticeship Final Deliverables):** 36″ (H) × 48″ (W), landscape; **.docx only**; **800–1,000 words** (body, excluding references); **4–10** figures/tables, each with a **numbered caption**; images **≥300 DPI**; confirm **deadline** on the WiDS Community Hub.

**Layout flow:** left → right, top → bottom (Abstract | Data & Methods | Results | Discussion across top; Introduction below left; References bottom).

**Font guide (Word):** Title 60–120 pt bold; Authors 40–60 pt; Section headings 30–40 pt bold; Body 24–30 pt; Captions 20–26 pt; References 16–20 pt. **High contrast:** dark text on light background.

---

## TITLE BLOCK (largest font — readable ~10 ft away)

**Title:**  
Minutes Matter: An Agentic, Equity-Aware Wildfire Evacuation Platform for Faster Protective Action

**Authors (alphabetical by last name):**  
Lena Ayesh, Katie Leedom, Anisha Nannapaneni, Nadia Narayanan

**Affiliations:**  
University of North Carolina at Charlotte · WiDS Apprenticeship Pod · Accenture Song (industry partner)  
*WiDS + university + Accenture Song logos per program lead.*

**Team / product:** Minutes Matter (WildfireAlert) · GitHub: `https://github.com/layesh1/wildfire-app`

---

## ABSTRACT (200–300 words · text only · no figures)

Wildfire evacuations fail when alerts arrive late, messages lack actionable context, and vulnerable households are underrepresented in opt-in systems. WiDS Datathon 2026 **Track 1 — Accelerating Equitable Evacuations** asks how to shorten the path from first credible signal to protective action while improving clarity and completion among at-risk communities. We present **Minutes Matter**, an operational web and mobile ecosystem that unifies WatchDuty-scale incident analytics with live operational data. The platform combines a **Next.js** application on **Vercel**, a **Supabase** backend with row-level security, and **Flameo**, a three-phase **agentic AI** stack (structured context without an LLM, proactive briefing, grounded chat with guardrails) powered by **Anthropic Claude**. Live feeds include **NIFC** and **NASA FIRMS**, **FEMA National Shelter System** shelters, **Open-Meteo** weather, **FEMA National Risk Index**-style equity layers, and curated **hazard facilities** (nuclear, chemical, LNG) for routing awareness; **Google** geocoding and routes support shelter ranking with fire- and hazard-avoidance flags. We implement a **two-status** evacuation model (home vs personal safety) for clearer household rollups for responders, **Life360-style family linking**, station-based **responder** workflows with **Flameo COMMAND**, and a native **SwiftUI iOS** client. Analysis in our **Kaggle companion notebook** explores WatchDuty-style data, feature engineering, proximity to hazards, shelter coverage, and equity metrics. The work addresses datathon pitfalls (reporting inconsistency, geographic bias, weak ground truth) by stating assumptions explicitly and grounding user-facing outputs in reproducible pipelines. Significance: a tangible path from research on alert delay and silent incidents to a consent-aware, multi-role system that agencies could pilot for earlier, clearer, and more equitable evacuation support.

---

## INTRODUCTION (100–200 words · include 1–2 figures)

Wildfires are increasing in frequency and intensity; in the **2021–2025 WiDS analytic frame** (**62,696** incidents), **73.5%** had no public alert and **median time to evacuation order** was **1.1 hours** (90th percentile **32.1 hours**) when orders exist. **WatchDuty**-style data expose uneven alerting and coverage bias. **Track 1** challenges teams to reduce alert lag, improve clarity, and raise completion for vulnerable groups. **Minutes Matter** is a **deployable prototype** fusing these statistics with live APIs, maps, and grounded AI.

**Figure 1.** National burden + silent fraction + delay stats (see filled captions in `WIDS_POSTER_CONTENT_FOR_WORD.md`). **Print ≥300 DPI ~10 in wide.**

**Figure 2.** User journey: consumers, caregivers, responders, analysts; signal → context → action. **Print ≥300 DPI ~8–10 in wide.**

---

## DATA AND METHODS (100–200 words · include 1–2 figures)

**Data / methods:** As in **Table 1** of `WIDS_POSTER_CONTENT_FOR_WORD.md` — WatchDuty/WiDS, NIFC, FIRMS, FEMA NSS, Open-Meteo, FEMA NRI, 30 hazard facilities, optional Google; notebook `notebooks/kaggle_wids_2026_minutes_matter.ipynb` + `minutes_matter_kaggle.py`; app APIs including `GET /api/flameo/context`.

**Figure 3.** Pipeline diagram (feeds → Next.js → Supabase / maps / Flameo). **≥300 DPI.**

**Figure 4.** Flameo phases A / B / C + COMMAND. **≥300 DPI.**

---

## RESULTS (100–200 words · include 2–4 figures)

**Key numbers (WatchDuty-style WiDS frame):** **41,906** fires (**99.74%**) with early signal still had **no evacuation action**; **211 / 298** extreme-spread fires (**70.8%**) had **no evacuation action**; **+17%** faster growth in high-SVI counties; **~0.7%** vs **~2.4%** evacuation-order rates in high- vs lower-SVI counties (**~3.4×** gap). **Product:** web + iOS flows as shipped; **notebook:** state/time plots, density-stratified gaps, RandomForest importance (**log acres**, **wind**, **containment** lead on bundled demo — **re-run on competition CSV for real held-out metrics**). APIs **`/api/active-fires`**, **`/api/shelters/live`**, **`/api/weather`** validate integration.

**Table 2** — full quantitative row set: see **`WIDS_POSTER_CONTENT_FOR_WORD.md`.**

**Figures 5–8:** UI screenshot; notebook state/time chart; feature-importance bars; equity/delay chart — **≥300 DPI**, **~9–12 in** wide as needed.

---

## DISCUSSION (100–200 words)

Maps Track 1 to a testable system; acknowledges API limits, sparse shelters, human oversight for GenAI, and that **synthetic / rule-labeled** notebook metrics are **not** claimed as real-world validation. Next steps: official-order calibration, multilingual templates, pilots. GitHub + Kaggle notebook for reproducibility.

---

## REFERENCES AND ACKNOWLEDGMENTS

Same numbered list as **`WIDS_POSTER_CONTENT_FOR_WORD.md`** (WiDS, WatchDuty, FIRMS, NIFC, FEMA NRI/NSS, Open-Meteo, Anthropic, Supabase/Vercel/Next.js).

**Acknowledgments:** WiDS Worldwide; WiDS Apprenticeship Pilot; Accenture Song; UNC Charlotte faculty/advisors; open-data providers; WatchDuty and first-responder communities.

---

## CHECKLIST BEFORE UPLOAD

- [ ] Total body word count 800–1,000 (Abstract through Discussion only).  
- [ ] Abstract 200–300 words, **no** figures.  
- [ ] **4–10** figures/tables, **numbered captions**, each interpretable alone.  
- [ ] All raster images **≥300 DPI** at print width.  
- [ ] Title + authors + affiliations + logos at top.  
- [ ] File saved as **.docx**.  
- [ ] Confirm **deadline** on **WiDS Community Hub**.

---

## Cursor prompt (optional) — “build the Word layout”

Paste into Cursor (with this repo open):

> Create a landscape Word-oriented layout guide (or HTML print preview) for a 36×48 inch scientific poster. Use the section text from `docs/WIDS_POSTER_CONTENT_FOR_WORD.md`. Apply WiDS font sizes: title 72 pt, authors 48 pt, headings 36 pt, body 28 pt, captions 22 pt, references 18 pt. Use a 3-column grid for the main row (Abstract | Data & Methods | Results | Discussion) and place Introduction below Abstract spanning one column; References full width at bottom. Insert placeholder boxes labeled Figure 1–8. Do not reduce word counts below WiDS minima. Export instructions: user will paste content into Word manually; suggest table-free section blocks for easy copy.
