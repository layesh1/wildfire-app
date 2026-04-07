# WildfireAlert: Closing the 99.3% Signal Gap Through Equity-Driven Caregiver Alerting

**Team:** Lena Ayesh, Katie Leedom, Nadia Narayanan, Anisha Nannapaneni
**Affiliation:** University of North Carolina Charlotte | 49ers Intelligence Lab
**Track:** Track 1 — Accelerating Equitable Evacuations
**WiDS Datathon 2026 | WiDS AI Forum, Salesforce Tower, San Francisco | April 21–22, 2026**

**Links:**
- GitHub Repository: https://github.com/layesh1/wildfire-app
- Kaggle Notebook: [TBD — coworker finalizing]
- Demo: [App screenshots below]

---

## Executive Summary

The United States wildfire alert system has a silent failure mode that kills people. Of 62,696 fire incidents in the WatchDuty dataset (2021–2025), only 653 — barely 1% — ever triggered a formal evacuation order. The remaining 99% burned through communities while the alert system did nothing. More damaging still: among the 33,423 fires that generated detectable external signals (satellite detections, news reports, dispatcher radio logs), 99.3% still received no evacuation action. The detection chain worked. The response chain did not.

WildfireAlert is our response to this gap. It is a role-based, equity-driven alert routing platform built on Next.js and Supabase that detects fires in the pre-order window — the critical hours between a fire's detection and any official action — and routes actionable early warnings to caregivers of vulnerable populations. Caregivers are the right target: for elderly, disabled, non-English-speaking, and mobility-impaired households, self-evacuation is often impossible. The person who can save them is a family member, home health aide, or community organization worker, not a government alert channel they may never receive.

Our central finding reframes the equity problem: social vulnerability does not predict how slowly evacuation orders arrive. It predicts whether orders arrive at all.

---

## Background and Motivation

Every wildfire response protocol in the United States assumes the same basic chain: fire is detected, authorities assess the situation, a formal evacuation order or warning is issued, and residents evacuate. WildfireAlert's core contribution is documenting that this chain breaks at the last step — not occasionally, but for 99% of fires — and that the breakdown is systematically worse in precisely the communities that cannot afford it.

The CDC Social Vulnerability Index (SVI) measures a county's exposure to disaster risk along four dimensions: socioeconomic status, household composition and disability, minority status and language, and housing and transportation. We linked every fire in the WatchDuty dataset to its host county's SVI score. The result is stark: high-SVI counties (SVI > 0.70) have a 0.7% evacuation order rate. Low-SVI counties (SVI < 0.55) have a 2.4% rate. That 3.4× disparity exists not because the system is slow to reach vulnerable communities, but because it largely does not reach them at all.

This distinction matters enormously for policy. If the problem were speed, the solution would be faster processing — more dispatchers, better decision software, streamlined authorization chains. But if the problem is structural exclusion, the solution must route around the existing system rather than attempt to accelerate it. WildfireAlert is designed around the second model.

The human stakes are acute. Forty-four percent of all fire detections in our dataset occur between 8 PM and midnight UTC — the nighttime window when vulnerable households are asleep, when staffing is lowest, and when the time between ignition and life-threatening spread is shortest. Peak detection is at 9 PM UTC (6,131 fires in that single hour). Fires do not wait for business hours.

---

## Data and Methodology

### Data Sources

Our analysis draws on five data sources:

1. **WatchDuty incident dataset** — 62,696 geo_events from 2021 through 2025, including fire name, location, acreage, containment percentage, spread rate, and evacuation zone linkages. A companion table of 1.5 million external signal records captures satellite detections, news mentions, wireless emergency alerts, and dispatcher radio activity for each fire event.

2. **CDC/ATSDR Social Vulnerability Index 2022** — County-level SVI scores (0–1) across four sub-themes: socioeconomic, household composition, minority status/language, and housing/transportation. Joined to fire events by county FIPS code.

3. **NASA FIRMS satellite hotspot data** — Near-real-time fire radiative power and location data used for live detection in the deployed application.

4. **NIFC fire perimeter polygons** — 6,207 perimeter records (4,139 approved) providing geographic boundaries for historical fires and validation of fire size estimates.

5. **WatchDuty geo_event changelog** — 1.03 million timestamped status records used to reconstruct the exact timing of first advisory, first warning, first evacuation order, and first external signal for each fire.

### Data Processing Pipeline

The raw WatchDuty dataset required significant cleaning before analysis. A duplicate upload issue inflated the initial record count to 124,696 rows; deduplication by geo_event_id reduced this to 62,696 true unique incidents. Prescribed burns constitute 17.7% of records (11,115 fires) and were excluded from all analyses using the is_true_wildfire flag, leaving 50,664 true wildfires as the analytic sample.

Delay variables were computed from changelog timestamps for each fire: hours_to_order (fire start to first evacuation order), hours_to_warning, hours_to_advisory, and signal_to_action lag (first external signal detection to first evacuation action). All 38 computed variables are available in fire_events_with_svi_and_delays.csv, the primary analysis artifact.

### Statistical Methods

**Cox Proportional Hazards modeling** characterized time-to-evacuation as a function of SVI sub-themes, fire growth rate, maximum acreage, and geographic region. The model identified SVI minority sub-theme (correlation r = −0.233) as the strongest individual predictor of evacuation alert failure, with SVI housing sub-theme second (r = −0.159). Fire size and growth rate were less predictive of whether an alert occurred than of how quickly it occurred once it did.

**Getis-Ord Gi\* spatial autocorrelation** identified statistically significant county-level clusters of alert failure — regions where low order rates are not random but spatially concentrated. The analysis flagged county corridors in the Southwest and rural Mountain West as the highest-priority intervention targets.

**XGBoost and Random Forest models** provided fire spread rate predictions given SVI, weather inputs, and current fire characteristics. These models power the ML Fire Predictor section of the analyst dashboard.

---

## Key Findings

### Finding 1: The 99.3% Signal Gap

The headline number — 99.3% of fires with external signals receive no evacuation action — understates the problem for extreme-spread fires. Among fires with dispatcher-reported rapid or extreme spread rates, 70.8% (211 of 298) still received no evacuation action. We identified a cohort of exactly 100 fires that combined dispatcher-logged extreme or rapid spread with complete silence from the alert system. Their average SVI score was 0.89 — the extreme end of the vulnerability scale. These fires burned an estimated 839,000 total acres with no public warning of any kind.

### Finding 2: SVI as a Structural Predictor

The conventional framing of evacuation equity focuses on delay: do vulnerable communities wait longer for alerts? Our data suggests the more important question is whether they receive alerts at all.

When we examined fires that did receive evacuation orders (n=653), the median time from fire start to order was 1.1 hours — and this figure was essentially identical across low-SVI, medium-SVI, and high-SVI counties. The 9-fold state-level disparity in delay time (Idaho 19.2h vs California 0.9h) reflects variation within the ordered-fire cohort, not disparity in who gets ordered.

What varies systematically with SVI is the probability of receiving an order at all: 0.7% for high-SVI counties versus 2.4% for low-SVI. In New Mexico, the state with the highest average SVI in our dataset, only 0.1% of fires generate formal orders — versus 1.8% in Colorado, the best-performing comparable state. That 18-fold difference is not explained by fire characteristics. It reflects structural gaps in alert chain coverage.

Internet access compounds the disparity. Counties with high rates of no-internet households show a 93.2% signal gap rate, compared to 49.1% in well-connected counties. Wireless Emergency Alerts — the primary backup channel — do not reach households without mobile coverage, which correlates directly with rural high-SVI geographies.

### Finding 3: Protocol Inversions

A separate pathology affects even fires that do receive formal orders. In 39.5% of ordered fires (258 incidents), the evacuation order was issued before the warning — bypassing the intermediate step intended to give warning-zone residents preparation time before a full order. The average gap was 112 minutes. The most extreme case, the Oak Fire in Mariposa County, California (SVI 0.71), saw an order precede a warning by 142 minutes. Residents in the warning zone received no intermediate notice.

### Finding 4: The Nighttime Vulnerability Window

Fire detections peak at 9 PM UTC (6,131 fires in that single hour). Forty-four percent of all detections fall between 8 PM and midnight — the window when emergency management staffing is lowest, when public alert channels reach the fewest active users, and when sleeping households have the least time to organize an evacuation. For the specific population WildfireAlert targets — elderly and disabled individuals who require physical assistance to evacuate — a nighttime fire with no alert is effectively a no-warning fire.

---

## Solution: WildfireAlert

WildfireAlert is a full-stack web application (Next.js 15, Supabase, Vercel) that addresses the signal gap through three interconnected strategies: pre-order detection, caregiver routing, and role-aware alert content.

### Pre-Order Detection

Rather than waiting for formal evacuation orders, WildfireAlert monitors the early-signal layer that the 99.3% of fires already traverse without triggering official action. When NASA FIRMS detects a hotspot, when dispatch radio logs extreme spread, or when the WatchDuty API flags a growing incident, WildfireAlert surfaces that information to users who are monitoring registered dependents in the affected area — before any formal order exists.

The staging logic mirrors the fire's own risk escalation: uncontained fires below 25% containment trigger immediate evacuation guidance; fires at 25–50% containment trigger warnings; fires above 50% containment trigger advisories. This thresholding allows caregivers to begin mobilization during the pre-order window rather than waiting for official authorization that statistically will not come.

### Caregiver Routing

The application is built around three role-specific interfaces:

**Caregiver Dashboard** — Designed for individuals managing the safety of elderly, disabled, or mobility-limited dependents. Features include a person card system (track named dependents with mobility status and contact information), a 12-item go-bag readiness tracker, live fire proximity alerts, and a check-in system for evacuee status tracking (evacuated / sheltering in place / returning). The interface prioritizes speed: evacuation guidance is surfaced without navigation, and a quick-call button connects directly to the primary dependent.

**Emergency Responder Dashboard** — An incident management view for field commanders and dispatchers. Includes a situation report header with live status chips, mutual aid coordination tracking, staffing roster management, evacuee location mapping with special-needs flags, and signal gap intelligence showing which counties in the affected region lack backup alert channels.

**Data Analyst Dashboard** — A research tool for emergency management planners, epidemiologists, and policy analysts. Nine analysis modules cover the signal gap (99.3% gap visualization), equity metrics (SVI cross-tabulation by county and state), ML fire spread prediction, hidden danger cohort (the 100 silent extreme-spread fires), temporal fire patterns, fire density by state, and an animated fire simulation studio calibrated to FireBench/Google Research CFD data.

### AI Guidance

Two role-specific AI assistants (powered by the Anthropic Claude API) are embedded in the application:

**FLAMEO** (Caregiver Assistant) — A compassionate, plain-language wildfire safety assistant trained on the WildfireAlert dataset facts. It answers questions about evacuation planning, go-bag preparation, mobility accommodations, and shelter locations. Its responses are grounded in the 99.3% gap statistic and the specific vulnerabilities of high-SVI populations, and it defers to 911 for emergencies.

**COMMAND-INTEL** (Emergency Responder Analyst) — A tactical AI for incident commanders that provides data-driven context on signal gaps, equity concerns, and resource coordination. It uses the same ground-truth statistics embedded in the system prompt, preventing hallucination of key facts.

Both personas are scope-restricted: they reject off-topic queries and are rate-limited to 20 requests per minute to prevent API abuse.

---

## Impact and Track Alignment

WildfireAlert addresses Track 1's core evaluation criteria directly:

**Lead time gained.** By acting on early signals rather than formal orders, WildfireAlert gives caregivers access to the 4.1-hour median signal-to-order window as actionable preparation time. For populations who require 30–90 minutes of physical mobilization assistance, this window is the difference between evacuation and entrapment.

**Reach to high-need households.** By routing to caregivers rather than relying on broadcast channels, WildfireAlert reaches households that will never receive a Wireless Emergency Alert (no mobile coverage), never see a social media post (no internet), and will not self-evacuate without physical assistance. These are precisely the households concentrated in high-SVI counties.

**Completion rates for vulnerable groups.** The caregiver check-in system provides real-time evacuee status tracking (evacuated / sheltering / returning), giving emergency coordinators ground truth on which registered dependents have been successfully moved — a capability that does not exist in current public alert infrastructure.

**Projected impact.** Assuming 65% caregiver adoption in high-SVI counties and the 4.1-hour signal lead time, we project WildfireAlert would trigger successful early mobilization for 500–1,500 additional high-risk households per year. This estimate is conservative: it does not account for secondary network effects (one caregiver often serves multiple households) or the value of avoided protocol inversions.

---

## Limitations and Future Work

The deployed application runs on demo data. Live integration requires a WatchDuty API key and real-time webhook architecture, neither of which was available during the competition window. The 500–1,500 lives projection has not been validated in a field study and should be treated as an order-of-magnitude estimate.

Caregiver matching currently relies on self-registration within the app. A production deployment would benefit from integration with FEMA's Special Needs Registry and county-level emergency management databases to identify and pre-register high-risk households.

The ML spread models (XGBoost/Random Forest) were trained on historical WatchDuty data without external weather inputs. Incorporating real-time wind speed and humidity from NOAA would meaningfully improve prediction accuracy.

Multilingual SMS delivery — critical for the limited-English populations that appear in our highest-signal-gap counties — is architecturally prepared (internationalization scaffolding is in the codebase for Spanish and additional languages) but not yet live.

---

## Demo

WildfireAlert is a deployed web application. The demo artifact (application screenshots) is included with this submission.

**Screenshot 1: Caregiver Dashboard** — Person cards with mobility status, go-bag tracker, and active fire alert staging (Evacuate / Warning / Advisory).

**Screenshot 2: Analyst Signal Gap View** — SVI tier bar chart showing 0.7% vs 2.4% order rates, state-level delay table, and protocol inversions list.

**Screenshot 3: Hidden Danger View** — The 100 silent extreme-spread fires ranked by SVI score (average 0.89), with zero evacuation actions logged.

**Screenshot 4: FLAMEO AI Chat** — Caregiver assistant answering an evacuation planning question with data-grounded, plain-language guidance.

---

## References

1. WatchDuty Incident Dataset, WiDS Datathon 2026. watchduty.org
2. CDC/ATSDR Social Vulnerability Index 2022, US county level. atsdr.cdc.gov/placeandhealth/svi
3. NASA FIRMS Fire Information for Resource Management System. firms.modaps.eosdis.nasa.gov
4. NIFC National Interagency Fire Center Perimeter Data. nifc.gov
5. Getis A, Ord JK. (1992). The Analysis of Spatial Association by Use of Distance Statistics. *Geographical Analysis*, 24(3), 189–206.
6. Cox DR. (1972). Regression Models and Life-Tables. *Journal of the Royal Statistical Society*, 34(2), 187–220.
7. Flanagan BE, et al. (2011). A Social Vulnerability Index for Disaster Management. *Journal of Homeland Security and Emergency Management*, 8(1).

---

*Submitted to the WiDS Datathon 2026, Track 1: Accelerating Equitable Evacuations.*
*University of North Carolina Charlotte | 49ers Intelligence Lab | WiDS Apprenticeship Program*
*WiDS AI Forum, Salesforce Tower, San Francisco | April 21–22, 2026*
