"""Unsupervised clustering for Sanjeevani (synthetic worlds only).

Clustering is a *descriptive* layer next to the M1 / M2 classifiers: it groups areas, weeks and events so that
people can see what kind of situation they are looking at. It never replaces the supervised models, and it never
groups people (the model scores areas, not individuals).

Six clusterings, all fitted on TRAINING worlds only and then assigned to validation / test worlds:

1. ``archetypes``  areas with a similar static profile (size, density, coast, water-source mix, sanitation)
2. ``regimes``     "what kind of week is this": weekly water, weather, case and sensor signals
3. ``blind_spots`` how well each area is watched (sensor uptime, lab recency, report completeness)
4. ``seasonal``    areas whose OPD workload follows the same yearly shape
5. ``event_types`` kinds of simulated outbreak (duration, size, cholera share, reporting delay)
6. ``hotspots``    adjacent flagged areas, found per week with DBSCAN on neighbour-graph distance

The outcome labels are used only to *describe* and *check* clusters afterwards (outbreak rate per cluster, detection
delay per blind-spot cluster). They are never an input to any clustering.

    python -m sanjeevani_ml.clustering --run-dir runs/<run-id>
"""

from __future__ import annotations

import argparse
import json
import math
from collections import deque
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.impute import SimpleImputer
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.preprocessing import StandardScaler

SEED = 42
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# (column, transform). "rate_log" = per 100,000 residents, then log1p; "log" = log1p.
REGIME_FEATURES: list[tuple[str, str | None]] = [
    ("turbidity_mean_7d", None), ("turbidity_exceed_7d", None),
    ("chlorine_mean_7d", None), ("chlorine_depleted_7d", None), ("tds_mean_7d", None),
    ("ecoli_last_cfu", "log"), ("ecoli_positive_30d", None),
    ("rain_7d", "log"), ("rain_30d", "log"), ("heavy_rain_after_dry_7d", None), ("consec_dry_days", "log"),
    ("temp_mean_7d", None), ("rel_humidity_7d", None),
    ("asha_cases_7d", "rate_log"), ("asha_cases_14d", "rate_log"), ("asha_alert_7d", None),
    ("opd_cases_7d", "rate_log"), ("idsp_alerts_28d", None),
    ("sensor_uptime_7d", None),
]

# phrase used when a feature is clearly above / below average in a cluster
REGIME_PHRASES: dict[str, tuple[str | None, str | None]] = {
    "turbidity_mean_7d": ("turbid water", None), "turbidity_exceed_7d": ("turbid water", None),
    "chlorine_mean_7d": (None, "low chlorine"), "chlorine_depleted_7d": ("low chlorine", None),
    "tds_mean_7d": ("high dissolved solids", None),
    "ecoli_last_cfu": ("E. coli positives", None), "ecoli_positive_30d": ("E. coli positives", None),
    "rain_7d": ("heavy rain", "dry week"), "rain_30d": ("wet month", "dry month"),
    "heavy_rain_after_dry_7d": ("rain after a dry spell", None), "consec_dry_days": ("dry spell", None),
    "temp_mean_7d": ("hot weather", "cool weather"), "rel_humidity_7d": ("humid", None),
    "asha_cases_7d": ("case surge", None), "asha_cases_14d": ("case surge", None), "asha_alert_7d": ("ASHA cluster alert", None),
    "opd_cases_7d": ("high OPD load", None), "idsp_alerts_28d": ("IDSP alerts", None),
    "sensor_uptime_7d": (None, "sensors offline"),
}

ARCHETYPE_PHRASES: dict[str, tuple[str | None, str | None]] = {
    "log_population": ("large population", "small population"), "log_density": ("dense", "sparse"),
    "coastal": ("coastal", None), "share_piped": ("piped-water reliant", "little piped water"),
    "share_groundwater": ("groundwater reliant", None), "share_tanker": ("tanker dependent", None),
    "share_surface": ("surface-water reliant", None), "sanitation_coverage": ("high sanitation", "low sanitation"),
}


# ───────────────────────────── helpers ─────────────────────────────
def _clean(value):
    """JSON-safe scalar: NaN / inf become None, numpy types become Python types."""
    if isinstance(value, (np.floating, float)):
        value = float(value)
        return None if (math.isnan(value) or math.isinf(value)) else value
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    return value


def _round(value, digits=4):
    value = _clean(value)
    return round(value, digits) if isinstance(value, float) else value


def choose_k(X: np.ndarray, ks: range, seed: int = SEED, sample: int = 4000) -> tuple[int, list[dict]]:
    """Pick K by silhouette plus split-half stability (adjusted Rand index between two models fitted on halves).

    Stability matters more than the elbow here: weekly signals form overlapping clouds, so a K that changes
    from one random half to the next is not a real structure.
    """
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(X), size=min(sample, len(X)), replace=False)
    Xs = X[idx]
    rows = []
    for k in ks:
        if k >= len(Xs):
            continue
        labels = KMeans(n_clusters=k, n_init=10, random_state=seed).fit_predict(Xs)
        sil = float(silhouette_score(Xs, labels)) if len(set(labels)) > 1 else 0.0
        aris = []
        for rep in range(4):
            perm = np.random.default_rng(seed + rep).permutation(len(Xs))
            half = len(Xs) // 2
            a = KMeans(n_clusters=k, n_init=5, random_state=seed + rep).fit(Xs[perm[:half]])
            b = KMeans(n_clusters=k, n_init=5, random_state=seed + 100 + rep).fit(Xs[perm[half:]])
            aris.append(adjusted_rand_score(a.predict(Xs), b.predict(Xs)))
        stab = float(np.mean(aris))
        rows.append({"k": k, "silhouette": _round(sil), "stability": _round(stab), "score": _round((sil + stab) / 2)})
    best = max(rows, key=lambda r: r["score"])["k"]
    return best, rows


def describe_center(center: np.ndarray, names: list[str], phrases: dict, threshold: float = 0.5,
                    top: int = 2, default: str = "Typical") -> tuple[str, list[dict]]:
    """Name a cluster from the features that stand furthest from average (z-scores)."""
    contributions = []
    for name, z in zip(names, center):
        pos, neg = phrases.get(name, (None, None))
        phrase = pos if z > 0 else neg
        if phrase and abs(z) >= threshold:
            contributions.append((abs(float(z)), phrase, name, float(z)))
    contributions.sort(reverse=True)
    seen, chosen = set(), []
    for _, phrase, _, _ in contributions:
        if phrase not in seen:
            seen.add(phrase)
            chosen.append(phrase)
        if len(chosen) == top:
            break
    label = " + ".join(chosen).capitalize() if chosen else default
    signals = [{"feature": f, "z": _round(z, 2)} for _, _, f, z in contributions[:4]]
    return label, signals


def _units_frame(units: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(units).set_index("unit_id")


def load_units_yaml(path: Path) -> list[dict]:
    import yaml
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    return [{"unit_id": u.get("id"), **{k: v for k, v in u.items() if k != "id"}} for u in raw.get("units", [])]


# ───────────────────────────── data ─────────────────────────────
def _read_split(worlds_dir: Path, split: str, columns: list[str] | None) -> pd.DataFrame:
    frames = []
    for path in sorted((worlds_dir / split).glob("world_*_*.csv.gz")):
        frames.append(pd.read_csv(path, usecols=columns))
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def load_run_tables(run_dir: Path) -> dict:
    """Cohort and event tables of a completed run (reads only what the clusterings need)."""
    worlds = Path(run_dir) / "ml_datasets" / "worlds"
    wanted = sorted({"world_id", "scenario", "unit_id", "date", "month", "in_m1_risk_set",
                     "label_m1_onset_7d", "label_m2_active", "days_since_lab_test"}
                    | {c for c, _ in REGIME_FEATURES})
    tables = {split: _read_split(worlds, split, wanted) for split in ("train", "val", "test")}
    events = {}
    for split in ("train", "val", "test"):
        paths = sorted((worlds / split).glob("events_*.csv.gz"))
        events[split] = pd.concat([pd.read_csv(p) for p in paths], ignore_index=True) if paths else pd.DataFrame()
    return {"cohorts": tables, "events": events}


# ───────────────────────────── 1. archetypes ─────────────────────────────
def _archetype_matrix(units: list[dict]) -> tuple[np.ndarray, list[str], list[str]]:
    frame = _units_frame(units)
    sources = sorted({k for u in units for k in (u.get("water_sources") or {})})
    cols = {
        "log_population": np.log(frame["population"].astype(float)),
        "log_density": np.log(frame["density_km2"].astype(float)),
        "coastal": frame["coastal"].astype(float),
        "sanitation_coverage": frame["sanitation_coverage"].astype(float),
    }
    for s in sources:
        cols[f"share_{s}"] = frame["water_sources"].apply(lambda d, s=s: float((d or {}).get(s, 0.0)))
    matrix = pd.DataFrame(cols, index=frame.index)
    return matrix.to_numpy(float), list(matrix.columns), list(matrix.index)


def fit_archetypes(units: list[dict], seed: int = SEED) -> dict:
    X, names, ids = _archetype_matrix(units)
    scaler = StandardScaler().fit(X)
    Z = scaler.transform(X)
    k, diagnostics = choose_k(Z, range(3, 6), seed, sample=len(Z))
    km = KMeans(n_clusters=k, n_init=20, random_state=seed).fit(Z)
    labels = km.labels_
    clusters = []
    for c in range(k):
        name, signals = describe_center(km.cluster_centers_[c], names, ARCHETYPE_PHRASES, 0.45, 2, "Typical unit")
        members = [ids[i] for i in np.flatnonzero(labels == c)]
        clusters.append({"id": c, "name": name, "size": len(members), "members": members, "signals": signals})
    return {"k": k, "diagnostics": diagnostics, "clusters": clusters,
            "unit_cluster": {uid: int(l) for uid, l in zip(ids, labels)},
            "quality": {"silhouette": _round(silhouette_score(Z, labels))}}


# ───────────────────────────── 2. weekly regimes ─────────────────────────────
def _regime_matrix(df: pd.DataFrame, population: dict[str, float]) -> np.ndarray:
    out = {}
    pop = df["unit_id"].map(population).astype(float)
    for col, tf in REGIME_FEATURES:
        s = df[col].astype(float)
        if tf == "log":
            s = np.log1p(s.clip(lower=0))
        elif tf == "rate_log":
            s = np.log1p((s.clip(lower=0) / pop) * 1e5)
        out[col] = s
    return pd.DataFrame(out).to_numpy(float)


def fit_regimes(train: pd.DataFrame, population: dict[str, float], seed: int = SEED) -> dict:
    names = [c for c, _ in REGIME_FEATURES]
    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    Z = scaler.fit_transform(imputer.fit_transform(_regime_matrix(train, population)))
    k, diagnostics = choose_k(Z, range(3, 7), seed)
    km = KMeans(n_clusters=k, n_init=10, random_state=seed).fit(Z)
    # order regimes from calmest to most outbreak-heavy, using the TRAIN outcome only to order and describe them
    rates = pd.Series(train["label_m2_active"].to_numpy(float)).groupby(km.labels_).mean()
    order = list(rates.sort_values().index)
    remap = {old: new for new, old in enumerate(order)}
    centers = km.cluster_centers_[order]
    labels = []
    for c in range(k):
        name, signals = describe_center(centers[c], names, REGIME_PHRASES, 0.5, 2, "Quiet baseline")
        labels.append((name, signals))
    return {"imputer": imputer, "scaler": scaler, "km": km, "names": names, "remap": remap, "k": k,
            "diagnostics": diagnostics, "labels": labels, "population": population,
            "silhouette": _round(silhouette_score(Z[:5000], km.labels_[:5000]))}


def assign_regimes(model: dict, df: pd.DataFrame) -> np.ndarray:
    Z = model["scaler"].transform(model["imputer"].transform(_regime_matrix(df, model["population"])))
    return np.array([model["remap"][int(l)] for l in model["km"].predict(Z)])


def regime_report(model: dict, test: pd.DataFrame, assigned: np.ndarray) -> dict:
    base_m2 = float(test["label_m2_active"].mean())
    risk = test["in_m1_risk_set"] == 1
    base_m1 = float(test.loc[risk, "label_m1_onset_7d"].mean()) if risk.any() else None
    clusters = []
    for c in range(model["k"]):
        mask = assigned == c
        sub = test.loc[mask]
        sub_risk = sub["in_m1_risk_set"] == 1
        m2 = float(sub["label_m2_active"].mean()) if len(sub) else None
        m1 = float(sub.loc[sub_risk, "label_m1_onset_7d"].mean()) if sub_risk.any() else None
        name, signals = model["labels"][c]
        clusters.append({
            "id": c, "name": name, "signals": signals, "share": _round(mask.mean()),
            "unit_weeks": int(mask.sum()), "m2_active_rate": _round(m2), "m1_onset_rate": _round(m1),
            "m2_lift": _round(m2 / base_m2) if (m2 is not None and base_m2) else None,
            "m1_lift": _round(m1 / base_m1) if (m1 is not None and base_m1) else None,
        })
    return {"k": model["k"], "diagnostics": model["diagnostics"], "silhouette": model["silhouette"],
            "baseline": {"m2_active_rate": _round(base_m2), "m1_onset_rate": _round(base_m1)}, "clusters": clusters}


# ───────────────────────────── 3. surveillance blind spots ─────────────────────────────
BLIND_NAMES = ["Well covered", "Partly covered", "Blind spot"]


def _coverage_table(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    work["lab_gap"] = work["days_since_lab_test"].fillna(work["days_since_lab_test"].max())
    grouped = work.groupby(["world_id", "scenario", "unit_id"])
    table = grouped.agg(uptime=("sensor_uptime_7d", "mean"), lab_gap=("lab_gap", "mean"),
                        asha=("asha_cases_7d", "sum"), opd=("opd_cases_7d", "sum")).reset_index()
    table["report_ratio"] = table["asha"] / (table["opd"] + 1.0)
    return table[["world_id", "scenario", "unit_id", "uptime", "lab_gap", "report_ratio"]]


def fit_blind_spots(train: pd.DataFrame, seed: int = SEED) -> dict:
    table = _coverage_table(train)
    cols = ["uptime", "lab_gap", "report_ratio"]
    scaler = StandardScaler().fit(table[cols])
    Z = scaler.transform(table[cols])
    km = KMeans(n_clusters=3, n_init=20, random_state=seed).fit(Z)
    blindness = -km.cluster_centers_[:, 0] + km.cluster_centers_[:, 1] - km.cluster_centers_[:, 2]
    order = list(np.argsort(blindness))
    return {"scaler": scaler, "km": km, "cols": cols, "remap": {old: new for new, old in enumerate(order)},
            "silhouette": _round(silhouette_score(Z, km.labels_)) if len(Z) > 3 else None,
            "centers": {BLIND_NAMES[new]: {c: _round(v) for c, v in zip(cols, km.cluster_centers_[old] * scaler.scale_ + scaler.mean_)}
                        for new, old in enumerate(order)}}


def assign_blind_spots(model: dict, df: pd.DataFrame) -> pd.DataFrame:
    table = _coverage_table(df)
    Z = model["scaler"].transform(table[model["cols"]])
    table["cluster"] = [model["remap"][int(l)] for l in model["km"].predict(Z)]
    return table


def blind_spot_report(model: dict, test: pd.DataFrame, events: pd.DataFrame) -> dict:
    assigned = assign_blind_spots(model, test)
    lookup = {(r.world_id, r.scenario, r.unit_id): int(r.cluster) for r in assigned.itertuples()}
    rows = []
    if len(events):
        start = pd.to_datetime(events["operational_start_date"])
        for scenario in sorted(test["scenario"].unique()):
            col = f"first_report_date_{scenario}"
            if col not in events:
                continue
            delay = (pd.to_datetime(events[col]) - start).dt.days
            for ev, d in zip(events.itertuples(), delay):
                cluster = lookup.get((ev.world_id, scenario, ev.unit_id))
                if cluster is not None:
                    rows.append({"cluster": cluster, "delay": None if pd.isna(d) else float(d)})
    frame = pd.DataFrame(rows, columns=["cluster", "delay"])
    clusters = []
    for c, name in enumerate(BLIND_NAMES):
        sub = frame[frame["cluster"] == c]
        reported = sub["delay"].dropna()
        members = assigned[assigned["cluster"] == c]
        clusters.append({
            "id": c, "name": name, "unit_scenarios": int(len(members)),
            "events": int(len(sub)),
            "unreported_share": _round(float(sub["delay"].isna().mean())) if len(sub) else None,
            "median_report_delay_days": _round(float(reported.median())) if len(reported) else None,
            "mean_sensor_uptime": _round(float(members["uptime"].mean())) if len(members) else None,
            "mean_days_since_lab_test": _round(float(members["lab_gap"].mean())) if len(members) else None,
        })
    unit_cluster: dict[str, dict[str, dict[str, int]]] = {}
    for (world, scenario, unit), c in lookup.items():
        unit_cluster.setdefault(world, {}).setdefault(scenario, {})[unit] = c
    return {"clusters": clusters, "centers": model["centers"], "silhouette": model["silhouette"],
            "unit_cluster": unit_cluster}


# ───────────────────────────── 4. seasonal trajectories ─────────────────────────────
def fit_seasonal(train: pd.DataFrame, population: dict[str, float], seed: int = SEED) -> dict:
    work = train.copy()
    work["rate"] = work["opd_cases_7d"] / work["unit_id"].map(population).astype(float) * 1e5
    monthly = work.groupby(["unit_id", "month"])["rate"].mean().unstack("month").reindex(columns=range(1, 13))
    monthly = monthly.apply(lambda row: row.fillna(row.mean()), axis=1)
    index = monthly.div(monthly.mean(axis=1), axis=0)          # 1.0 = that unit's own yearly average
    Z = index.to_numpy(float)
    k, diagnostics = choose_k(Z, range(2, 5), seed, sample=len(Z))
    km = KMeans(n_clusters=k, n_init=20, random_state=seed).fit(Z)
    clusters = []
    for c in range(k):
        curve = km.cluster_centers_[c]
        amplitude = float(curve.max() - curve.min())
        peak = MONTHS[int(curve.argmax())]
        strength = "Strong" if amplitude >= 0.8 else "Moderate" if amplitude >= 0.3 else "Mild"
        name = "Flat year-round" if amplitude < 0.15 else f"{strength} seasonal peak around {peak}"
        members = [uid for uid, l in zip(index.index, km.labels_) if l == c]
        clusters.append({"id": c, "name": name, "size": len(members), "members": members,
                         "peak_month": peak, "amplitude": _round(amplitude), "curve": [_round(v, 3) for v in curve]})
    return {"k": k, "diagnostics": diagnostics, "clusters": clusters, "months": MONTHS,
            "unit_cluster": {uid: int(l) for uid, l in zip(index.index, km.labels_)},
            "quality": {"silhouette": _round(silhouette_score(Z, km.labels_))}}


# ───────────────────────────── 5. outbreak event types ─────────────────────────────
def _event_matrix(events: pd.DataFrame) -> tuple[np.ndarray, pd.DataFrame]:
    start = pd.to_datetime(events["operational_start_date"])
    report = pd.to_datetime(events["first_report_date_baseline"])
    delay = (report - start).dt.days
    unreported = delay.isna()
    delay_filled = delay.fillna(events["duration_days"])
    total = events["total_cases"].astype(float)
    # Only properties of the outbreak itself are clustered. Whether and how fast it was reported is a property of
    # the surveillance system, so it is described per cluster afterwards instead of driving the grouping.
    frame = pd.DataFrame({
        "log_duration": np.log1p(events["duration_days"].astype(float)),
        "log_cases": np.log1p(total),
        "cholera_share": events["cholera_cases"].astype(float) / total.clip(lower=1),
    })
    detail = pd.DataFrame({"duration": events["duration_days"], "cases": total, "cholera_share": frame["cholera_share"],
                           "unreported": unreported, "delay": delay})
    return frame.to_numpy(float), detail


def fit_event_types(train_events: pd.DataFrame, seed: int = SEED) -> dict | None:
    if len(train_events) < 12:
        return None
    X, detail = _event_matrix(train_events)
    scaler = StandardScaler().fit(X)
    Z = scaler.transform(X)
    k, diagnostics = choose_k(Z, range(2, 5), seed, sample=len(Z))
    km = KMeans(n_clusters=k, n_init=20, random_state=seed).fit(Z)
    order = list(detail.groupby(km.labels_)["cases"].median().sort_values().index)
    remap = {old: new for new, old in enumerate(order)}
    med_dur, med_cases = float(detail["duration"].median()), float(detail["cases"].median())
    names = []
    for old in order:
        sub = detail[km.labels_ == old]
        dur, cases, unrep = float(sub["duration"].median()), float(sub["cases"].median()), float(sub["unreported"].mean())
        d = "Long" if dur >= med_dur * 1.15 else "Short" if dur <= med_dur * 0.85 else "Typical-length"
        s = "large" if cases >= med_cases * 1.15 else "small" if cases <= med_cases * 0.85 else "mid-size"
        names.append(f"{d}, {s}")
    return {"scaler": scaler, "km": km, "remap": remap, "names": names, "k": k, "diagnostics": diagnostics,
            "silhouette": _round(silhouette_score(Z, km.labels_))}


def event_type_report(model: dict | None, events: pd.DataFrame) -> dict:
    if model is None or not len(events):
        return {"available": False, "clusters": []}
    X, detail = _event_matrix(events)
    labels = np.array([model["remap"][int(l)] for l in model["km"].predict(model["scaler"].transform(X))])
    clusters = []
    for c in range(model["k"]):
        sub = detail[labels == c]
        reported = sub["delay"].dropna()
        clusters.append({
            "id": c, "name": model["names"][c], "events": int(len(sub)),
            "share": _round(len(sub) / len(detail)),
            "median_duration_days": _round(float(sub["duration"].median())) if len(sub) else None,
            "median_total_cases": _round(float(sub["cases"].median())) if len(sub) else None,
            "mean_cholera_share": _round(float(sub["cholera_share"].mean())) if len(sub) else None,
            "unreported_share": _round(float(sub["unreported"].mean())) if len(sub) else None,
            "median_report_delay_days": _round(float(reported.median())) if len(reported) else None,
        })
    return {"available": True, "k": model["k"], "diagnostics": model["diagnostics"],
            "silhouette": model["silhouette"], "events": int(len(detail)), "clusters": clusters}


# ───────────────────────────── 6. hotspots (per week) ─────────────────────────────
def _adjacency(units: list[dict]) -> dict[str, set[str]]:
    adj: dict[str, set[str]] = {u["unit_id"]: set() for u in units}
    for u in units:
        for n in (u.get("neighbors") or []):
            if n in adj:
                adj[u["unit_id"]].add(n)
                adj[n].add(u["unit_id"])
    return adj


def _hops(adj: dict[str, set[str]], source: str) -> dict[str, int]:
    seen, queue = {source: 0}, deque([source])
    while queue:
        cur = queue.popleft()
        for nxt in adj.get(cur, ()):
            if nxt not in seen:
                seen[nxt] = seen[cur] + 1
                queue.append(nxt)
    return seen


def hotspot_clusters(units: list[dict], board_units: list[dict], task: str,
                     tiers: tuple[str, ...] = ("review",)) -> list[dict]:
    """Groups of adjacent Review-tier areas for one week (DBSCAN on neighbour-graph hop distance).

    Only the Review tier is used: including Watch units chains most of the state into one blob.
    """
    adj = _adjacency(units)
    flagged = [u for u in board_units if (u.get(task) or {}).get("tier") in tiers]
    if len(flagged) < 2:
        return []
    ids = [u["unit_id"] for u in flagged]
    far = 99.0
    dist = np.full((len(ids), len(ids)), far)
    for i, a in enumerate(ids):
        hops = _hops(adj, a)
        for j, b in enumerate(ids):
            dist[i, j] = float(hops.get(b, far))
    labels = DBSCAN(eps=1.0, min_samples=2, metric="precomputed").fit_predict(dist)
    groups = []
    for label in sorted(set(labels) - {-1}):
        members = [flagged[i] for i in np.flatnonzero(labels == label)]
        members.sort(key=lambda u: (u[task] or {}).get("score") or 0.0, reverse=True)
        groups.append({
            "task": task, "size": len(members),
            "review_count": sum(1 for u in members if u[task]["tier"] == "review"),
            "units": [u["unit_id"] for u in members],
            "top_unit": members[0]["unit_id"], "max_score": _round((members[0][task] or {}).get("score")),
        })
    groups.sort(key=lambda g: (g["review_count"], g["max_score"] or 0.0), reverse=True)
    for i, g in enumerate(groups):
        g["id"] = i
    return groups


# ───────────────────────────── orchestration ─────────────────────────────
class ClusterBundle:
    """Fitted clusterings for one run plus the assignments the UI needs."""

    def __init__(self, units: list[dict], tables: dict, seed: int = SEED):
        population = {u["unit_id"]: float(u["population"]) for u in units}
        train, test = tables["cohorts"]["train"], tables["cohorts"]["test"]
        self.units = units
        self.archetypes = fit_archetypes(units, seed)
        self.regime_model = fit_regimes(train, population, seed)
        self.test_regimes = assign_regimes(self.regime_model, test)
        self.test = test
        self.regimes = regime_report(self.regime_model, test, self.test_regimes)
        self.blind_model = fit_blind_spots(train, seed)
        self.blind_spots = blind_spot_report(self.blind_model, test, tables["events"]["test"])
        self.seasonal = fit_seasonal(train, population, seed)
        event_model = fit_event_types(tables["events"]["train"], seed)
        self.event_types = event_type_report(event_model, tables["events"]["test"])
        # (world, scenario, date) -> {unit: regime}
        self._weekly: dict[tuple[str, str, str], dict[str, int]] = {}
        keyed = test[["world_id", "scenario", "date", "unit_id"]].assign(regime=self.test_regimes)
        for (world, scenario, date), group in keyed.groupby(["world_id", "scenario", "date"]):
            self._weekly[(world, scenario, str(date))] = dict(zip(group["unit_id"], group["regime"].astype(int)))

    def static_report(self) -> dict:
        return {"synthetic": True, "archetypes": self.archetypes, "regimes": self.regimes,
                "blind_spots": {k: v for k, v in self.blind_spots.items() if k != "unit_cluster"},
                "seasonal": self.seasonal, "event_types": self.event_types}

    def week(self, world_id: str, scenario: str, date: str, board_units: list[dict] | None = None) -> dict:
        regimes = self._weekly.get((world_id, scenario, date), {})
        blind = self.blind_spots["unit_cluster"].get(world_id, {}).get(scenario, {})
        hotspots = {}
        if board_units is not None:
            hotspots = {task: hotspot_clusters(self.units, board_units, task) for task in ("m1", "m2")}
        return {"world_id": world_id, "scenario": scenario, "date": date, "unit_regime": regimes,
                "unit_blind_spot": blind, "hotspots": hotspots}


def run(run_dir: Path, units: list[dict], out: Path | None = None) -> dict:
    bundle = ClusterBundle(units, load_run_tables(run_dir))
    report = bundle.static_report()
    if out is not None:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2, allow_nan=False), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--units", type=Path, default=Path(__file__).resolve().parent.parent / "config" / "tamil_nadu_districts.yaml")
    parser.add_argument("--out", type=Path, default=None, help="default: <run-dir>/results/cluster_summary.json")
    args = parser.parse_args()
    out = args.out or args.run_dir / "results" / "cluster_summary.json"
    report = run(args.run_dir, load_units_yaml(args.units), out)
    print(f"archetypes K={report['archetypes']['k']} | regimes K={report['regimes']['k']} | "
          f"seasonal K={report['seasonal']['k']} | event types="
          f"{report['event_types'].get('k', 'n/a')}. Wrote {out}")


if __name__ == "__main__":
    main()
