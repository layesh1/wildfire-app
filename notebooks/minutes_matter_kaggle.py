"""
Minutes Matter — shared helpers for the WiDS / Kaggle notebook.

Designed to be fetched at runtime:
  https://raw.githubusercontent.com/layesh1/wildfire-app/main/notebooks/minutes_matter_kaggle.py
"""

from __future__ import annotations

import io
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

# --- Paths -----------------------------------------------------------------

REPO_RAW = "https://raw.githubusercontent.com/layesh1/wildfire-app/main"


def kaggle_input_roots() -> list[Path]:
    p = Path("/kaggle/input")
    if p.is_dir():
        return sorted(p.iterdir())
    return []


def discover_watchduty_csv(max_rows: Optional[int] = None) -> Optional[Path]:
    """Find a competition CSV under /kaggle/input (any nested folder)."""
    for root in kaggle_input_roots():
        for csv_path in root.rglob("*.csv"):
            name = csv_path.name.lower()
            if any(
                k in name
                for k in (
                    "watch",
                    "duty",
                    "fire",
                    "incident",
                    "train",
                    "wids",
                    "datathon",
                )
            ):
                return csv_path
    # Fallback: first large CSV in input
    for root in kaggle_input_roots():
        cands = sorted(root.rglob("*.csv"), key=lambda x: x.stat().st_size, reverse=True)
        if cands:
            return cands[0]
    return None


def _normalize_fire_frame(raw: pd.DataFrame) -> pd.DataFrame:
    """Map common WiDS / fire CSV column names to a canonical schema."""
    df = raw.copy()
    lower = {c.lower().strip(): c for c in df.columns}

    def pick(*names: str) -> Optional[str]:
        for n in names:
            for k, orig in lower.items():
                if n in k.replace(" ", "_"):
                    return orig
        return None

    lat_c = pick("lat", "latitude", "y")
    lon_c = pick("lon", "lng", "long", "longitude", "x")
    if lat_c and lon_c:
        df["lat"] = pd.to_numeric(df[lat_c], errors="coerce")
        df["lon"] = pd.to_numeric(df[lon_c], errors="coerce")
    else:
        df["lat"] = np.nan
        df["lon"] = np.nan

    acres_c = pick("acre", "gis_acres", "size")
    if acres_c:
        df["acres"] = pd.to_numeric(df[acres_c], errors="coerce")
    else:
        df["acres"] = np.nan

    county_c = pick("county", "county_name")
    state_c = pick("state", "st", "state_code")
    df["county"] = df[county_c].astype(str) if county_c else ""
    df["state"] = df[state_c].astype(str) if state_c else ""

    fips_c = pick("fips", "countyfips", "county_fips")
    if fips_c:
        df["fips"] = df[fips_c].astype(str).str.replace(r"\.0$", "", regex=True)
    else:
        df["fips"] = ""

    # Optional equity / alert fields (competition-specific)
    for opt, keys in (
        ("svi", ("svi", "rpl_themes", "social_vulnerability")),
        ("alert_delay_h", ("delay", "alert_delay", "hours_to_order")),
        ("silent", ("silent", "is_silent", "no_alert")),
    ):
        found = pick(*keys)
        if found:
            df[opt] = pd.to_numeric(df[found], errors="coerce")
        else:
            df[opt] = np.nan

    return df


def synthetic_watchduty(n: int = 8000, seed: int = 42) -> pd.DataFrame:
    """Demo incidents when no competition CSV is attached (still runnable)."""
    rng = np.random.default_rng(seed)
    states = np.array(["CA", "OR", "WA", "AZ", "NV", "CO", "MT", "TX", "FL", "NC"])
    st = rng.choice(states, size=n)
    lat = rng.uniform(32.0, 48.5, size=n)
    lon = rng.uniform(-124.0, -80.0, size=n)
    acres = rng.lognormal(mean=2.5, sigma=1.8, size=n).clip(0.1, 500_000)
    svi = rng.beta(2, 5, size=n)
    silent = rng.random(size=n) < 0.73
    delay = rng.exponential(scale=4.0, size=n).clip(0, 96)
    counties = [f"County_{i % 200}" for i in range(n)]
    return pd.DataFrame(
        {
            "lat": lat,
            "lon": lon,
            "acres": acres,
            "state": st,
            "county": counties,
            "fips": "",
            "svi": svi,
            "silent": silent.astype(float),
            "alert_delay_h": delay,
        }
    )


def load_watchduty(
    csv_path: Optional[str | Path] = None,
    sample_n: Optional[int] = 50_000,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Load WatchDuty / competition data, or synthetic demo rows.
    Set csv_path to override; otherwise discovers under /kaggle/input or WATCHDUTY_CSV env.
    """
    env_path = os.environ.get("WATCHDUTY_CSV")
    path = Path(csv_path) if csv_path else (Path(env_path) if env_path else None)
    if path is None or not path.is_file():
        discovered = discover_watchduty_csv()
        path = discovered

    if path and path.is_file():
        df = pd.read_csv(path, low_memory=False, nrows=sample_n)
        return _normalize_fire_frame(df)

    return synthetic_watchduty(n=min(sample_n or 8000, 20_000), seed=seed)


def haversine_miles(
    lat1: np.ndarray, lon1: np.ndarray, lat2: float, lon2: float
) -> np.ndarray:
    """Vectorized great-circle distance in miles."""
    r = 3959.0
    p1 = np.radians(lat1)
    p2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dl = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def min_distance_to_facilities(
    fire_lat: np.ndarray, fire_lon: np.ndarray, facilities: pd.DataFrame
) -> np.ndarray:
    """Miles from each fire row to nearest hazard facility (vectorized)."""
    if facilities.empty or len(fire_lat) == 0:
        return np.full(len(fire_lat), np.nan)
    flat = np.asarray(facilities["lat"].to_numpy(), dtype=float)
    flon = np.asarray(facilities["lng"].to_numpy(), dtype=float)
    la = np.asarray(fire_lat, dtype=float)[:, np.newaxis]
    lo = np.asarray(fire_lon, dtype=float)[:, np.newaxis]
    fa = flat[np.newaxis, :]
    fo = flon[np.newaxis, :]
    r = 3959.0
    p1 = np.radians(la)
    p2 = np.radians(fa)
    dphi = np.radians(fa - la)
    dl = np.radians(fo - lo)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    d = 2 * r * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
    return d.min(axis=1)


def load_hazard_facilities_csv(url: str = f"{REPO_RAW}/data/hazard_facilities.csv") -> pd.DataFrame:
    with urllib.request.urlopen(url, timeout=30) as r:
        text = r.read().decode("utf-8")
    return pd.read_csv(io.StringIO(text))


def fetch_open_meteo(lat: float, lon: float) -> dict[str, Any]:
    u = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat:.4f}&longitude={lon:.4f}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m"
        "&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto"
    )
    with urllib.request.urlopen(u, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_fema_nri_counties(state_id: str = "06") -> pd.DataFrame:
    """state_id: FIPS state code (e.g. 06=CA)."""
    u = f"https://hazards.fema.gov/nri/rest/api/nri/county?returnFormat=json&stateId={state_id}"
    req = urllib.request.Request(u, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as r:
        raw = json.loads(r.read().decode("utf-8"))
    rows = raw if isinstance(raw, list) else raw.get("items") or raw.get("data") or []
    if not rows:
        return pd.DataFrame()
    df = pd.json_normalize(rows)
    rename = {
        "COUNTYFIPS": "fips",
        "COUNTY": "county",
        "STATE": "state",
        "WLDF_RISKS": "wildfire_risk_score",
        "WLDF_RISKR": "wildfire_risk_rating",
        "RPL_THEMES": "svi_themes",
        "EAL_VALT": "eal_buildings",
    }
    df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})
    return df


def fetch_nifc_incident_points(limit: int = 200) -> pd.DataFrame:
    """Public Esri NIFC WFIGS incident points (same layer family as Minutes Matter /api/fires/nifc)."""
    base = "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services"
    url = f"{base}/WFIGS_Incident_Locations_Current/FeatureServer/0/query"
    params = (
        "where=1%3D1&outFields=*&f=json"
        f"&resultRecordCount={limit}"
    )
    with urllib.request.urlopen(f"{url}?{params}", timeout=30) as r:
        j = json.loads(r.read().decode("utf-8"))
    feats = j.get("features") or []
    rows = []
    for f in feats:
        a = f.get("attributes") or {}
        geom = f.get("geometry") or {}
        lat = geom.get("y")
        lon = geom.get("x")
        if lat is None or lon is None:
            continue
        rows.append(
            {
                "name": a.get("IncidentName") or a.get("FIRE_NAME"),
                "lat": float(lat),
                "lon": float(lon),
                "acres": a.get("GIS_Acres") or a.get("ACRES"),
                "containment": a.get("PercentContained"),
            }
        )
    return pd.DataFrame(rows)


def call_minutes_matter_api(
    path: str,
    base_url: str,
    method: str = "GET",
    params: Optional[dict[str, str]] = None,
    json_body: Any = None,
    timeout: int = 45,
) -> tuple[int, Any]:
    """
    Hit a deployed Minutes Matter (wildfire-app) route. base_url should be https://... without trailing slash.
    """
    q = ""
    if params:
        from urllib.parse import urlencode

        q = "?" + urlencode(params)
    url = f"{base_url.rstrip('/')}{path}{q}"
    data = None
    headers = {"Accept": "application/json"}
    if json_body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(json_body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8")
            try:
                return r.status, json.loads(body)
            except json.JSONDecodeError:
                return r.status, body
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(err)
        except json.JSONDecodeError:
            return e.code, err


