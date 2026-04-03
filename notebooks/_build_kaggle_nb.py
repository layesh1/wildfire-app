#!/usr/bin/env python3
"""One-off builder for kaggle_wids_2026_minutes_matter.ipynb — run from repo root: python3 notebooks/_build_kaggle_nb.py"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "kaggle_wids_2026_minutes_matter.ipynb"

def md(s: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": [line + "\n" for line in s.strip().split("\n")]}

def code(s: str) -> dict:
    lines = s.strip().split("\n")
    return {"cell_type": "code", "metadata": {}, "outputs": [], "execution_count": None, "source": [ln + "\n" for ln in lines]}

cells = []

cells.append(md("""
# Minutes Matter — WiDS Datathon 2026

**Competition theme:** *Predicting Wildfire Impact: From Infrastructure to Equity*

This notebook is the public **Kaggle companion** for **Minutes Matter** — a wildfire evacuation coordination platform that combines a **Next.js** web app, **Supabase** backend, **SwiftUI** iOS client, and **Flameo** (agentic AI grounded in live operational data).

**Rubric alignment (100 pts):**
- **Narrative quality (20):** Sections 1, 9–10 explain the problem, our system, and measurable impact framing.
- **Data-driven justification (30):** Exploration, quality checks, feature engineering, proximity and equity joins to public APIs.
- **Solution impact (30, Evacuations track):** Shelter coverage, routing-aware design, responder household rollup metrics (Section 10).
- **Novelty & creativity (20):** Flameo three-phase pipeline, two-status evacuee model, FEMA-verified shelter tiering, hazard-aware routing (Sections 6–9).
"""))

cells.append(md("""
## Repository & product links

| Asset | URL |
|-------|-----|
| **Web app (Next.js + Vercel + Supabase + Flameo)** | [github.com/layesh1/wildfire-app](https://github.com/layesh1/wildfire-app) |
| **iOS app (SwiftUI — Minutes Matter)** | [github.com/anishan3213-design/minutes-matter-ios](https://github.com/anishan3213-design/minutes-matter-ios) |
| **Hazard facilities CSV (nuclear / chemical / LNG)** | [raw: data/hazard_facilities.csv](https://raw.githubusercontent.com/layesh1/wildfire-app/main/data/hazard_facilities.csv) |
| **Notebook helpers (imported / downloaded at runtime)** | [raw: notebooks/minutes_matter_kaggle.py](https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py) |

**Live app:** Deploy your fork to Vercel and set `MINUTES_MATTER_BASE_URL` (Kaggle Secrets or environment) to exercise Section 5 API calls against your deployment.
"""))

cells.append(code("""
# --- pip installs (Kaggle / Colab / local) ---
%pip install -q pandas numpy matplotlib seaborn plotly scipy requests

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
"""))

cells.append(md("""
## 1. Problem statement & solution overview

**Problem:** Wildfire harm is not only a function of flame intensity — it is a systems problem: **infrastructure** (roads, shelters, hazard sites), **information** (alerts, delays, silent incidents), and **equity** (who gets warnings, who can evacuate, who is left behind).

**Minutes Matter** addresses this by:
1. **Unifying live feeds** — NASA FIRMS hotspots, NIFC incidents, FEMA NSS shelters, Open-Meteo / fire-weather heuristics, FEMA NRI county risk, static hazard facilities, and (in production) Google geocoding & routes.
2. **Two user modes** — **civilian evacuees** (household safety, shelter routing) and **emergency responders** (roster, field map, **Flameo COMMAND** assignments).
3. **Flameo** — a **three-phase** agentic pipeline: structured context (no LLM) → proactive briefing → grounded chat with tool-style guardrails.

The **WatchDuty / WiDS** competition dataset is the **primary tabular spine** for historical impact and equity analysis; the app’s **runtime pipeline** fuses that lineage with the live APIs above.
"""))

cells.append(md("""
## 2. Data loading & sources

| # | Source | Role in notebook / app |
|---|--------|-------------------------|
| 1 | **WatchDuty (Kaggle competition)** | Primary CSV exploration & feature engineering |
| 2 | **NASA FIRMS** (VIIRS SNPP NRT) | Hotspots — proxied in app via `/api/fires/firms` (server key) |
| 3 | **NIFC** (Esri WFIGS / perimeters) | Incident points — this notebook queries public Esri; app uses `/api/fires/nifc` |
| 4 | **FEMA NRI** | County wildfire risk & SVI themes — `hazards.fema.gov` |
| 5 | **FEMA NSS** | Live shelters — app `/api/shelters/live`; optional via deployed backend |
| 6 | **Open-Meteo** | Weather + simple fire-risk heuristic — app `/api/weather` |
| 7 | **NOAA / red flag** | App `/api/fires/redflags` (not duplicated here) |
| 8 | **Hazard facilities** | `data/hazard_facilities.csv` from repo |
| 9–10 | **Google Places / Routes** | Production geocoding & evacuation routing (`/api/geocode/*`, `POST /api/shelter`) |

**Reproducibility:** Helpers load from GitHub raw if the `.py` file is not already next to this notebook. On Kaggle, attach the competition dataset; the loader searches `/kaggle/input` for CSVs. If nothing is found, a **synthetic** incident table is generated so every cell still runs.
"""))

cells.append(code("""
# --- Bootstrap helpers (each notebook run: idempotent download) ---
import importlib.util
import urllib.request
from pathlib import Path

REPO_RAW = "https://raw.githubusercontent.com/layesh1/wildfire-app/main"
_HELPER = Path("minutes_matter_kaggle.py")
if not _HELPER.is_file():
    urllib.request.urlretrieve(f"{REPO_RAW}/notebooks/minutes_matter_kaggle.py", _HELPER)

spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", _HELPER)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
from scipy import stats

try:
    from IPython.display import display
except ImportError:
    display = print

sns.set_theme(style="whitegrid", context="notebook")
plt.rcParams["figure.figsize"] = (9, 5)

# Optional: deployed Minutes Matter origin (no trailing slash)
import os
MINUTES_MATTER_BASE_URL = os.environ.get("MINUTES_MATTER_BASE_URL", "").strip()

print("Helpers:", _HELPER.resolve())
print("Kaggle input roots:", [str(p) for p in mm.kaggle_input_roots()])
print(
    "MINUTES_MATTER_BASE_URL:",
    MINUTES_MATTER_BASE_URL or "(not set — shelter/weather API demos will use public fallbacks or skip)",
)
"""))

cells.append(md("""
## 3. WatchDuty data exploration

We load a **sample** of rows for notebook speed (`sample_n` cap). Increase or set `sample_n=None` for full training runs on your infrastructure.
"""))

cells.append(code("""
# Standalone: re-bootstrap if needed
import importlib.util
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)

import pandas as pd
import numpy as np

try:
    from IPython.display import display
except ImportError:
    display = print

df = mm.load_watchduty(sample_n=40_000)
print("rows:", len(df), "cols:", list(df.columns))
display(df.head(10))
df.describe(include="all").T.head(20)
"""))

cells.append(code("""
# Geographic scatter (subsample for plot performance)
import importlib.util
from pathlib import Path
import urllib.request
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)
import plotly.express as px

df = mm.load_watchduty(sample_n=40_000)
sub = df.dropna(subset=["lat", "lon"]).sample(min(8000, len(df)), random_state=42)
fig = px.scatter_geo(
    sub,
    lat="lat",
    lon="lon",
    color="state" if sub["state"].nunique() > 1 else None,
    hover_data=["acres"] if sub["acres"].notna().any() else [],
    title="WatchDuty / competition incidents (sample)",
    scope="usa",
)
fig.update_layout(geo=dict(showland=True, landcolor="rgb(243,243,243)"))
fig.show()
"""))

cells.append(md("""
## 4. Data quality analysis

Checks: coordinate validity, duplicate locations, missingness, and basic distribution sanity for size (acres) and optional equity fields.
"""))

cells.append(code("""
import importlib.util
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

df = mm.load_watchduty(sample_n=40_000)
valid = df["lat"].between(24, 50) & df["lon"].between(-125, -65)
print("Valid CONUS-ish coords %:", round(100 * valid.mean(), 2))
print("\\nMissingness (% of rows):")
print((df.isna().mean() * 100).round(2).sort_values(ascending=False).head(15))

dup_geo = df.duplicated(subset=["lat", "lon"], keep=False).sum()
print("\\nDuplicate (lat,lon) rows:", int(dup_geo))

work = df.copy()
work["log_acres"] = np.log10(work["acres"].clip(lower=0.1))
sub_corr = work.dropna(subset=["log_acres", "svi"])
if len(sub_corr) > 50 and sub_corr["svi"].notna().any():
    r, p = stats.pearsonr(sub_corr["log_acres"], sub_corr["svi"])
    print(f"\\nPearson r(log10 acres, SVI): r={r:.3f}, p={p:.2e}")

fig, ax = plt.subplots(1, 2, figsize=(11, 4))
if df["acres"].notna().any():
    ax[0].hist(np.log10(df["acres"].clip(lower=0.1)), bins=40, color="steelblue", edgecolor="white")
    ax[0].set_title("log10(acres)")
if df["svi"].notna().any():
    ax[1].hist(df["svi"].dropna(), bins=40, color="darkorange", edgecolor="white")
    ax[1].set_title("SVI (if present)")
plt.tight_layout()
plt.show()
"""))

cells.append(md("""
## 5. Feature engineering

**Minutes Matter–aligned features** (conceptual parity with analyst + Flameo context):
- `log_acres` — fire scale
- `dist_nuclear_mi` — distance to nearest nuclear / chemical / LNG site from team hazard list (repo CSV)
- `in_high_wind_risk` — proxy from Open-Meteo at incident centroid (notebook simplification: sample one weather pull per state bucket)

Extend with competition-specific labels when released (e.g. impact score, evacuation outcome).
"""))

cells.append(code("""
import importlib.util
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)
import numpy as np
import pandas as pd

try:
    from IPython.display import display
except ImportError:
    display = print

df = mm.load_watchduty(sample_n=25_000).dropna(subset=["lat", "lon"])
haz = mm.load_hazard_facilities_csv()
df["log_acres"] = np.log10(df["acres"].clip(lower=0.1))
df["dist_hazard_mi"] = mm.min_distance_to_facilities(df["lat"].values, df["lon"].values, haz)
df["near_hazard_15mi"] = (df["dist_hazard_mi"] <= 15).astype(int)

# Example: pull Open-Meteo once at mean centroid (demo feature flag)
lat0, lon0 = float(df["lat"].median()), float(df["lon"].median())
wx = mm.fetch_open_meteo(lat0, lon0)
cur = wx.get("current", {})
wind = cur.get("wind_speed_10m") or 0
rh = cur.get("relative_humidity_2m") or 50
df["demo_red_flag_proxy"] = int(wind >= 25 and rh <= 15)
print("Sample engineered columns:")
display(df[["lat", "lon", "log_acres", "dist_hazard_mi", "near_hazard_15mi", "demo_red_flag_proxy"]].head())
print("Open-Meteo @ centroid:", {k: cur.get(k) for k in ("temperature_2m", "wind_speed_10m", "relative_humidity_2m")})
"""))

cells.append(md("""
## 6. Fire proximity analysis

We join notebook incidents to **live NIFC incident points** (public Esri) and summarize how many historical / sampled rows fall within **10 / 25 / 50 miles** of any current incident (counts depend on API availability).
"""))

cells.append(code("""
import importlib.util
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)
import numpy as np
import pandas as pd

df = mm.load_watchduty(sample_n=15_000).dropna(subset=["lat", "lon"])
nifc = mm.fetch_nifc_incident_points(limit=300)
if nifc.empty:
    print("NIFC returned no features (try again later).")
else:
    la = df["lat"].values[:, np.newaxis]
    lo = df["lon"].values[:, np.newaxis]
    nl = nifc["lat"].values[np.newaxis, :]
    no = nifc["lon"].values[np.newaxis, :]
    r = 3959.0
    p1, p2 = np.radians(la), np.radians(nl)
    dphi, dl = np.radians(nl - la), np.radians(no - lo)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    dmin = (2 * r * np.arcsin(np.sqrt(np.clip(a, 0, 1)))).min(axis=1)
    for radius in (10, 25, 50):
        print(f"Within {radius} mi of any NIFC point: {100 * np.mean(dmin <= radius):.2f}% of sample rows")
"""))

cells.append(md("""
## 7. Shelter coverage analysis

**Production:** `GET /api/shelters/live?state=NC&lat=...&lng=...` returns FEMA NSS open shelters sorted by distance.

**Notebook:** If `MINUTES_MATTER_BASE_URL` is set, we call that endpoint; otherwise we document the contract and skip gracefully.
"""))

cells.append(code("""
import importlib.util
import os
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)
import pandas as pd

try:
    from IPython.display import display
except ImportError:
    display = print

base = os.environ.get("MINUTES_MATTER_BASE_URL", "").strip()
lat, lon, st = 35.2271, -80.8431, "NC"

if not base:
    print("Set MINUTES_MATTER_BASE_URL to your Vercel deployment to query live shelters.")
    print("Example: GET {base}/api/shelters/live?state=NC&lat=35.23&lng=-80.84")
else:
    code, body = mm.call_minutes_matter_api(
        "/api/shelters/live",
        base,
        params={"state": st, "lat": str(lat), "lng": str(lon)},
    )
    print("HTTP", code)
    if isinstance(body, dict) and "shelters" in body:
        sh = pd.json_normalize(body["shelters"])
        print("shelter count:", len(sh))
        display(sh.head(8))
    else:
        print(body)
"""))

cells.append(md("""
## 8. Equity & vulnerability analysis

**FEMA National Risk Index** county fields (`WLDF_RISKS`, `RPL_THEMES`) support equity framing: wildfire **risk** × **social vulnerability** themes. Below: California (`stateId=06`) sample; change `state_id` for other FIPS state codes.
"""))

cells.append(code("""
import importlib.util
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)
import plotly.express as px

nri = mm.fetch_fema_nri_counties("06")
if nri.empty:
    print("NRI empty response")
else:
    sub = nri.dropna(subset=["wildfire_risk_score", "svi_themes"])
    fig = px.scatter(
        sub.head(200),
        x="svi_themes",
        y="wildfire_risk_score",
        hover_name="county",
        title="CA counties: SVI themes vs wildfire risk score (FEMA NRI)",
        labels={"svi_themes": "SVI (RPL_THEMES)", "wildfire_risk_score": "Wildfire risk (WLDF_RISKS)"},
    )
    fig.show()
"""))

cells.append(md("""
## 9. Flameo AI architecture

**Phase A — Structured context (no LLM)**  
Server builds `FlameoContext`: anchors (home / live GPS), NIFC + FIRMS incidents in radius, FEMA NSS + pre-identified shelters, hazard facilities, Open-Meteo summary, optional route-ranked shelters (`POST /api/shelter` with fire perimeter + hazard buffers).

**Phase B — Proactive briefing**  
When threat rules pass, `POST /api/flameo/briefing` produces a short, **data-grounded** briefing (Claude Sonnet in production; template fallback if model unavailable).

**Phase C — Grounded chat**  
`POST /api/ai` ingests the same context JSON in the system prefix + **guardrails** to reduce hallucination; responder mode uses **COMMAND** tool patterns for assignments.

```text
   [ Live feeds: NIFC, FIRMS, NSS, weather, hazards, routes ]
                              |
                              v
                    +-------------------+
                    |   Phase A (API)   |
                    |  FlameoContext    |
                    +-------------------+
                         |         |
              threat OK  |         |  chat/session
                         v         v
                    +----------+  +------------+
                    | Phase B  |  |  Phase C   |
                    | Briefing |  | /api/ai    |
                    +----------+  +------------+
```

**iOS:** Native **SwiftUI** mirrors consumer + responder flows, including field map and **Flameo COMMAND**. Repo: [minutes-matter-ios](https://github.com/anishan3213-design/minutes-matter-ios).
"""))

cells.append(md("""
## 10. Solution impact metrics

**Product metrics** (evacuations track narrative — align your competition model outputs to these operational concepts):

| Metric | Definition |
|--------|------------|
| **Household evacuation rate** | Fraction of tracked households with `home_evacuated` true (two-status model: home vs personal safety) |
| **Time-to-first-guidance** | Latency from incident detection in context pipeline to first user-visible briefing |
| **Shelter route quality** | Share of ranked routes with `route_avoids_fire` true and `passes_near_hazard` false when data available |
| **Responder coverage** | Stations with active roster; **X/X evacuated** rollup per assignment area |
| **Silent incident awareness** | Uplift in users notified inside the pre-order window (WiDS research lineage: ~73% silent fires) |

The notebook does not access private Supabase PII; in deployment these roll up from authenticated profiles and station rosters.
"""))

cells.append(code("""
# Illustrative rollup math (synthetic household table)
import importlib.util
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)
import pandas as pd

households = pd.DataFrame({
    "household_id": range(1, 51),
    "home_evacuated": [True] * 32 + [False] * 18,
    "personal_safe": [True] * 40 + [False] * 10,
})
he = households["home_evacuated"].mean()
ps = households["personal_safe"].mean()
print(f"Household home evacuated: {100*he:.1f}%")
print(f"Personal safety check-in OK: {100*ps:.1f}%")
print(
    "Responder-facing copy example:",
    f"{int(he * len(households))}/{len(households)} households marked home evacuated",
)
"""))

cells.append(md("""
## 11. Reproducibility guide

1. **Kaggle:** Add the competition dataset. Internet **on** for Open-Meteo, NRI, NIFC, and optional GitHub raw helper fetch.
2. **Secrets (optional):** `MINUTES_MATTER_BASE_URL=https://your-app.vercel.app` to hit `/api/weather`, `/api/shelters/live`, `POST /api/shelter` (the latter needs a JSON body — extend this notebook).
3. **Local:** Clone [wildfire-app](https://github.com/layesh1/wildfire-app), open `notebooks/kaggle_wids_2026_minutes_matter.ipynb`, set `WATCHDUTY_CSV` to a local CSV path if not using Kaggle input discovery.
4. **Helpers:** Pin to a commit by replacing `main` in raw URLs with a **commit SHA** for frozen reproducibility.

**POST /api/shelter** example body (production):

```json
{
  "originLat": 35.2271,
  "originLng": -80.8431,
  "shelters": [
    {"lat": 35.3, "lng": -80.9, "name": "Demo shelter", "verified": true}
  ],
  "firePerimeter": [{"lat": 35.25, "lng": -80.88}],
  "hazardSites": [{"lat": 35.43, "lng": -80.95, "buffer_miles": 10}]
}
```
"""))

cells.append(code("""
# --- Live backend smoke test (weather) ---
import importlib.util
import os
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)

base = os.environ.get("MINUTES_MATTER_BASE_URL", "").strip()
if base:
    code, body = mm.call_minutes_matter_api(
        "/api/weather",
        base,
        params={"location": "Charlotte, NC"},
    )
    print("GET /api/weather HTTP", code)
    print(body if isinstance(body, dict) else str(body)[:500])
else:
    print("MINUTES_MATTER_BASE_URL not set — calling Open-Meteo directly (same family as app backend):")
    wx = mm.fetch_open_meteo(35.2271, -80.8431)
    print(wx.get("current", {}))
"""))

cells.append(code("""
# Optional: POST /api/shelter (requires deployed app + Google Routes key on server)
import importlib.util
import json
import os
import urllib.request
from pathlib import Path
p = Path("minutes_matter_kaggle.py")
if not p.is_file():
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py",
        p,
    )
spec = importlib.util.spec_from_file_location("minutes_matter_kaggle", p)
mm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mm)

base = os.environ.get("MINUTES_MATTER_BASE_URL", "").strip()
if not base:
    print("Set MINUTES_MATTER_BASE_URL to test shelter routing.")
else:
    payload = {
        "originLat": 35.2271,
        "originLng": -80.8431,
        "shelters": [
            {"lat": 35.28, "lng": -80.87, "name": "Test Shelter A", "verified": True},
            {"lat": 35.31, "lng": -80.90, "name": "Test Shelter B", "verified": False},
        ],
    }
    code, body = mm.call_minutes_matter_api("/api/shelter", base, method="POST", json_body=payload)
    print("POST /api/shelter HTTP", code)
    print(json.dumps(body, indent=2)[:4000] if isinstance(body, (dict, list)) else str(body)[:1000])
"""))

nb = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "pygments_lexer": "ipython3"},
    },
    "cells": cells,
}

OUT.write_text(json.dumps(nb, indent=1), encoding="utf-8")
print("Wrote", OUT)
