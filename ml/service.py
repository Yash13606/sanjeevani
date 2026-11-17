"""Local, read-only service for completed synthetic ML runs.

This serves saved evaluation outputs and replays a saved model on a generated
test feature row. It does not forecast real districts or receive health records.
Bind to loopback only; the browser UI is a college demo.
"""

from __future__ import annotations

import argparse
import csv
import functools
import gzip
import json
import logging
import re
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


LOG = logging.getLogger("sanjeevani_ml_service")
ROOT = Path(__file__).resolve().parent
ALLOWED_ORIGINS = {
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}
# Vite moves to the next free port (8081, 5174, ...) when 8080 or 5173 is taken, for example by Docker. Any port on
# this computer's own address is therefore allowed; every other origin is still refused.
_LOCAL_ORIGIN = re.compile(r"^http://(localhost|127\.0\.0\.1)(:\d{1,5})?$")


def _origin_allowed(origin: str | None) -> bool:
    return bool(origin) and (origin in ALLOWED_ORIGINS or _LOCAL_ORIGIN.match(origin) is not None)


def _find_run(explicit: Path | None) -> Path | None:
    if explicit is not None:
        candidates = [explicit]
    else:
        runs = ROOT / "runs"
        candidates = sorted(
            (path for path in runs.iterdir() if path.is_dir()),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        ) if runs.exists() else []
    for path in candidates:
        results = path / "results"
        if (results / "run_manifest.json").is_file() and (
            results / "benchmark_metrics_summary.csv"
        ).is_file():
            return path
    return None


def _read_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as stream:
        data = json.load(stream)
    return data if isinstance(data, dict) else {"value": data}


def _read_csv(path: Path, limit: int | None = None) -> list[dict]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if limit is None:
            return list(reader)
        rows = []
        for row in reader:
            rows.append(row)
            if len(rows) >= limit:
                break
        return rows


def _number(value: object) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result and result not in (float("inf"), float("-inf")) else None


def _infer_from_generated_row(run: Path, query: dict[str, list[str]]) -> dict:
    """Apply a saved model to one generated test-world feature row."""
    import joblib
    import pandas as pd

    def required(name: str) -> str:
        value = query.get(name, [""])[0]
        if not value:
            raise ValueError(f"Missing {name}")
        return value

    task = required("task").lower()
    world_id = required("world_id")
    scenario = required("scenario")
    unit_id = required("unit_id")
    date = required("date")
    if task not in {"m1", "m2"}:
        raise ValueError("task must be m1 or m2")
    world_match = re.fullmatch(r"world_([0-9]{1,8})", world_id)
    if not world_match or not re.fullmatch(r"[A-Za-z0-9_]{1,40}", unit_id):
        raise ValueError("Invalid synthetic world or unit ID")
    if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", date):
        raise ValueError("date must be YYYY-MM-DD")
    seed = int(world_match.group(1))
    run_manifest = _read_json(run / "results" / "run_manifest.json")
    if seed not in run_manifest.get("split_seeds", {}).get("test", []):
        raise ValueError("Only saved test worlds can be inspected")
    if scenario not in run_manifest.get("scenario_names", []):
        raise ValueError("Unknown surveillance scenario")

    cohort_path = run / "ml_datasets" / "worlds" / "test" / f"world_{seed}_{scenario}.csv.gz"
    if not cohort_path.is_file():
        raise FileNotFoundError("Generated test cohort is unavailable")
    model_paths = list((run / "models").rglob(f"{task}.joblib"))
    if len(model_paths) != 1:
        raise FileNotFoundError("Expected one saved model artifact for this task")
    model_path = model_paths[0]
    model_manifest = _read_json(model_path.parent / "manifest.json")
    if model_manifest.get("data_type") != "synthetic simulation":
        raise ValueError("Model artifact is not marked synthetic")
    metadata = model_manifest.get("models", {}).get(task, {})
    features = metadata.get("feature_columns", [])
    if not features:
        raise ValueError("Model feature contract is missing")
    risk_column = "in_m1_risk_set" if task == "m1" else None
    columns = ["unit_id", "date", *features]
    if risk_column:
        columns.append(risk_column)
    cohort = pd.read_csv(cohort_path, usecols=columns, parse_dates=["date"])
    at = pd.Timestamp(date)
    selected = cohort.loc[(cohort["unit_id"] == unit_id) & (cohort["date"] == at)]
    if len(selected) != 1:
        raise ValueError("No unique generated feature row for that unit/date")
    if risk_column and int(selected.iloc[0][risk_column]) != 1:
        raise ValueError("Unit/date is outside the M1 risk set")
    model = joblib.load(model_path)
    score = float(model.predict_proba(selected[features])[:, 1][0])
    threshold = float(metadata["validation_f1_threshold"])
    return {
        "synthetic": True,
        "source": "saved_model_on_generated_test_features",
        "task": task,
        "world_id": world_id,
        "scenario": scenario,
        "unit_id": unit_id,
        "date": date,
        "observation_time": "end_of_day",
        "model_name": metadata.get("model_name", ""),
        "run_id": model_manifest.get("run_id", ""),
        "score": score,
        "validation_f1_threshold": threshold,
        "alert_f1": score >= threshold,
    }


# ─── Weekly board: the contract the React dashboards read ────────────────────
# Everything below is derived from files an already-completed synthetic run wrote
# (saved test-world scores, the generated test cohort and the saved model manifest).
# Nothing is recomputed, and no outcome of a real district or person is involved.

SIGNAL_COLUMNS = (
    "rain_7d", "temp_mean_7d", "rel_humidity_7d",
    "turbidity_mean_7d", "turbidity_max_7d", "turbidity_exceed_7d",
    "chlorine_mean_7d", "chlorine_depleted_7d", "tds_mean_7d",
    "ecoli_last_cfu", "ecoli_positive_30d", "days_since_lab_test",
    "asha_cases_7d", "asha_cases_14d", "asha_alert_7d",
    "opd_cases_7d", "opd_trend_7d", "idsp_alerts_28d", "sensor_uptime_7d",
)
HISTORY_SIGNALS = (
    "asha_cases_7d", "opd_cases_7d", "turbidity_mean_7d",
    "chlorine_mean_7d", "ecoli_last_cfu", "rain_7d",
)
UNIT_FIELDS = (
    "id", "name", "type", "population", "density_km2", "lat", "lon",
    "coastal", "water_sources", "sanitation_coverage", "neighbors",
)
DATE_PATTERN = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
SAFE_ID = re.compile(r"[A-Za-z0-9_]{1,40}")


def _clean(value: object):
    """JSON-safe scalar: NaN/inf become None and numpy scalars become Python numbers."""
    if value is None:
        return None
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and (value != value or value in (float("inf"), float("-inf"))):
        return None
    return value


def _tier(score: float | None, f1_threshold: float | None, recall_threshold: float | None) -> str | None:
    """Map a model score to a review tier using the thresholds chosen on validation worlds."""
    if score is None:
        return None
    if f1_threshold is not None and score >= f1_threshold:
        return "review"
    if recall_threshold is not None and score >= recall_threshold:
        return "watch"
    return "routine"


@functools.lru_cache(maxsize=16)
def _frame(path: str, mtime_ns: int, columns: tuple | None):
    import pandas as pd
    return pd.read_csv(path, usecols=list(columns) if columns else None)


def _cached_frame(path: Path, columns: tuple | None = None):
    return _frame(str(path), path.stat().st_mtime_ns, columns)


def _model_meta(run: Path, task: str) -> dict:
    """Saved-model metadata (name and validation thresholds) for one task."""
    paths = list((run / "models").rglob(f"{task}.joblib"))
    if len(paths) != 1:
        raise FileNotFoundError("Expected one saved model artifact for this task")
    manifest = _read_json(paths[0].parent / "manifest.json")
    if manifest.get("data_type") != "synthetic simulation":
        raise ValueError("Model artifact is not marked synthetic")
    meta = manifest.get("models", {}).get(task, {})
    return {
        "task": task,
        "model_name": meta.get("model_name", ""),
        "f1_threshold": _number(meta.get("validation_f1_threshold")),
        "recall_threshold": _number(meta.get("validation_target_recall_threshold")),
        "target_recall": _number(meta.get("target_recall")),
        "validation_average_precision": _number(meta.get("validation_average_precision")),
    }


def _units(run: Path | None) -> dict:
    """Static profile of the synthetic units (names, coordinates, neighbours)."""
    import yaml
    configured = None
    if run is not None:
        try:
            config_file = Path(_read_json(run / "results" / "run_manifest.json").get("config_file", ""))
            if config_file.is_file():
                units_file = (yaml.safe_load(config_file.read_text(encoding="utf-8")) or {}).get("system", {}).get("units_file")
                if units_file:
                    configured = ROOT / units_file
        except (OSError, ValueError, yaml.YAMLError):
            configured = None
    path = configured if configured and configured.is_file() else ROOT / "config" / "tamil_nadu_districts.yaml"
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    units = []
    for unit in raw.get("units", []):
        entry = {key: _clean(unit.get(key)) for key in UNIT_FIELDS if key != "id"}
        units.append({"unit_id": unit.get("id"), **entry})
    return {"synthetic": True, "units": units}


def _query_value(query: dict[str, list[str]], name: str, default: str | None = None) -> str | None:
    values = query.get(name)
    return values[0] if values else default


def _board_context(run: Path, query: dict[str, list[str]]) -> tuple[dict, dict, str, str]:
    """Validate scenario / world; return manifest, prediction frames, scenario and world id."""
    manifest = _read_json(run / "results" / "run_manifest.json")
    scenarios = manifest.get("scenario_names", [])
    scenario = _query_value(query, "scenario", scenarios[0] if scenarios else "baseline")
    if scenario not in scenarios:
        raise ValueError("Unknown surveillance scenario")
    frames = {}
    for task in ("m1", "m2"):
        path = run / "results" / f"test_predictions_{task}.csv.gz"
        if not path.is_file():
            raise FileNotFoundError("Saved predictions are unavailable")
        frames[task] = _cached_frame(path)
    worlds = sorted(frames["m2"]["world_id"].unique())
    world_id = _query_value(query, "world_id", worlds[0] if worlds else "")
    if world_id not in worlds:
        raise ValueError("Unknown synthetic test world")
    return manifest, frames, scenario, world_id


def _weeks(run: Path) -> dict:
    manifest = _read_json(run / "results" / "run_manifest.json")
    path = run / "results" / "test_predictions_m2.csv.gz"
    if not path.is_file():
        raise FileNotFoundError("Saved predictions are unavailable")
    frame = _cached_frame(path)
    dates = sorted(frame["date"].unique())
    # Suggested starting week for a demo: the latest decision date on which most units are still
    # eligible for early warning (not already inside an event), so M1 and M2 can both be shown.
    default_date = dates[-1] if dates else None
    m1_path = run / "results" / "test_predictions_m1.csv.gz"
    if dates and m1_path.is_file():
        m1 = _cached_frame(m1_path)
        first_world = sorted(frame["world_id"].unique())[0]
        first_scenario = (manifest.get("scenario_names") or [None])[0]
        scoped = m1.loc[(m1["world_id"] == first_world) & ((m1["scenario"] == first_scenario) if first_scenario else True)]
        eligible = scoped.groupby("date")["unit_id"].nunique()
        units = frame["unit_id"].nunique()
        mostly_eligible = [date for date in dates if eligible.get(date, 0) >= 0.7 * units]
        if mostly_eligible:
            default_date = mostly_eligible[-1]
    return {
        "synthetic": True, "run_id": run.name,
        "scenarios": manifest.get("scenario_names", []),
        "world_ids": sorted(frame["world_id"].unique()),
        "dates": dates,
        "default_date": default_date,
    }


def _signals_for(run: Path, world_id: str, scenario: str):
    match = re.fullmatch(r"world_([0-9]{1,8})", world_id)
    if not match:
        raise ValueError("Invalid synthetic world")
    path = run / "ml_datasets" / "worlds" / "test" / f"world_{match.group(1)}_{scenario}.csv.gz"
    if not path.is_file():
        raise FileNotFoundError("Generated test cohort is unavailable")
    return _cached_frame(path, ("unit_id", "date", *SIGNAL_COLUMNS))


def _board(run: Path, query: dict[str, list[str]]) -> dict:
    """All units' M1/M2 scores for one decision date, with the signals the model saw."""
    _, frames, scenario, world_id = _board_context(run, query)
    scoped = {task: f.loc[(f["world_id"] == world_id) & (f["scenario"] == scenario)] for task, f in frames.items()}
    dates = sorted(scoped["m2"]["date"].unique())
    if not dates:
        raise ValueError("No saved rows for this scenario")
    date = _query_value(query, "date", dates[-1])
    if not DATE_PATTERN.fullmatch(date or "") or date not in dates:
        raise ValueError("date must be a saved decision date (YYYY-MM-DD)")
    models = {task: _model_meta(run, task) for task in ("m1", "m2")}
    signals = _signals_for(run, world_id, scenario)
    signals = signals.loc[signals["date"] == date].set_index("unit_id")
    rows = {task: scoped[task].loc[scoped[task]["date"] == date].set_index("unit_id") for task in scoped}

    units = []
    for unit_id in sorted(rows["m2"].index):
        entry = {"unit_id": unit_id}
        for task in ("m1", "m2"):
            row = rows[task].loc[unit_id] if unit_id in rows[task].index else None
            if row is None:
                entry[task] = None
                continue
            score = _clean(row["score"])
            entry[task] = {
                "score": score,
                "tier": _tier(score, models[task]["f1_threshold"], models[task]["recall_threshold"]),
                "outcome": _clean(row["label"]),
            }
        entry["m1_in_risk_set"] = entry["m1"] is not None
        entry["signals"] = (
            {name: _clean(signals.loc[unit_id, name]) for name in SIGNAL_COLUMNS}
            if unit_id in signals.index else {}
        )
        units.append(entry)
    return {
        "synthetic": True, "run_id": run.name, "world_id": world_id, "scenario": scenario,
        "date": date, "observation_time": "end_of_day", "models": models, "units": units,
    }


def _history(run: Path, query: dict[str, list[str]]) -> dict:
    """Weekly scores and a few signals for one unit, ending at `until`."""
    _, frames, scenario, world_id = _board_context(run, query)
    unit_id = _query_value(query, "unit_id", "")
    if not SAFE_ID.fullmatch(unit_id or ""):
        raise ValueError("Invalid synthetic unit ID")
    try:
        weeks = int(_query_value(query, "weeks", "26"))
    except ValueError:
        raise ValueError("weeks must be an integer") from None
    if not 1 <= weeks <= 156:
        raise ValueError("weeks must be 1 to 156")
    scoped = {task: f.loc[(f["world_id"] == world_id) & (f["scenario"] == scenario) & (f["unit_id"] == unit_id)]
              for task, f in frames.items()}
    dates = sorted(scoped["m2"]["date"].unique())
    if not dates:
        raise ValueError("No saved rows for this unit")
    until = _query_value(query, "until", dates[-1])
    if not DATE_PATTERN.fullmatch(until or ""):
        raise ValueError("until must be YYYY-MM-DD")
    dates = [d for d in dates if d <= until][-weeks:]
    models = {task: _model_meta(run, task) for task in ("m1", "m2")}
    signals = _signals_for(run, world_id, scenario)
    signals = signals.loc[signals["unit_id"] == unit_id].set_index("date")
    by_date = {task: scoped[task].set_index("date") for task in scoped}
    points = []
    for date in dates:
        point = {"date": date}
        for task in ("m1", "m2"):
            frame = by_date[task]
            if date in frame.index:
                score = _clean(frame.loc[date, "score"])
                point[task] = {"score": score, "outcome": _clean(frame.loc[date, "label"]),
                               "tier": _tier(score, models[task]["f1_threshold"], models[task]["recall_threshold"])}
            else:
                point[task] = None
        point["signals"] = ({name: _clean(signals.loc[date, name]) for name in HISTORY_SIGNALS}
                            if date in signals.index else {})
        points.append(point)
    return {"synthetic": True, "run_id": run.name, "world_id": world_id, "scenario": scenario,
            "unit_id": unit_id, "models": models, "points": points}


def _summary(run: Path) -> dict:
    """Benchmark metrics (every candidate and baseline) and event timing for the completed run."""
    results = run / "results"
    rows = _read_csv(results / "benchmark_metrics_summary.csv")
    metrics = []
    for row in rows:
        metrics.append({
            "task": row.get("Task", ""),
            "model": row.get("Model", ""),
            "scenario": row.get("Scenario", ""),
            "split": row.get("Split", ""),
            "rows": _number(row.get("Rows")),
            "positives": _number(row.get("Positives")),
            "prevalence": _number(row.get("Prevalence")),
            "average_precision": _number(row.get("AveragePrecision")),
            "roc_auc": _number(row.get("ROCAUC")),
            "brier": _number(row.get("Brier")),
            "f1": _number(row.get("F1AtValThreshold")),
            "precision": _number(row.get("PrecisionAtValThreshold")),
            "recall": _number(row.get("RecallAtValThreshold")),
            "precision_at_target_recall": _number(row.get("PrecisionAtValRecallThreshold")),
            "recall_at_target_recall": _number(row.get("RecallAtValRecallThreshold")),
            "false_alarms_per_district_month": _number(row.get("FalseAlarmsPerDistrictMonth")),
            "validation_f1_threshold": _number(row.get("ValidationF1Threshold")),
            "validation_target_recall_threshold": _number(row.get("ValidationTargetRecallThreshold")),
            "selected": str(row.get("Selected", "")).lower() in {"true", "1", "yes"},
        })
    event_rows = _read_csv(results / "event_metrics_summary.csv")
    event_metrics = [{
        "task": row.get("Task", ""),
        "scenario": row.get("Scenario", ""),
        "eligible_events": _number(row.get("EligibleEventScenarioPairs")),
        "detected_events": _number(row.get("WarnedOrDetected")),
        "event_recall": _number(row.get("EventRecall")),
        "median_lead_days": _number(row.get("MedianLeadDays")),
        "median_detection_delay_days": _number(row.get("MedianDetectionDelayDays")),
        "eligible_unreported_events": _number(row.get("EligibleUnreportedEventScenarioPairs")),
        "detected_while_unreported": _number(row.get("DetectedWhileUnreported")),
        "unreported_detection_recall": _number(row.get("UnreportedDetectionRecall")),
        "median_days_before_report": _number(row.get("MedianDaysBeforeReport")),
    } for row in event_rows]
    return {
        "synthetic": True,
        "run_id": run.name,
        "metrics": metrics,
        "event_metrics": event_metrics,
        "manifest": _read_json(results / "run_manifest.json"),
    }


_CLUSTER_CACHE: dict[tuple[str, int], object] = {}
_CLUSTER_LOCK = threading.Lock()


def _cluster_bundle(run_path: str, manifest_mtime_ns: int):
    """Fit the clusterings of a run once (train worlds only) and keep them in memory; nothing is written.

    The lock makes a request that arrives during the start-up warm-up wait for it instead of fitting twice.
    """
    from sanjeevani_ml.clustering import ClusterBundle, load_run_tables
    key = (run_path, manifest_mtime_ns)
    with _CLUSTER_LOCK:
        if key not in _CLUSTER_CACHE:
            run = Path(run_path)
            tables = load_run_tables(run)
            if tables["cohorts"]["train"].empty or tables["cohorts"]["test"].empty:
                raise FileNotFoundError("Generated train and test cohorts are required for clustering")
            _CLUSTER_CACHE.clear()
            _CLUSTER_CACHE[key] = ClusterBundle(_units(run)["units"], tables)
        return _CLUSTER_CACHE[key]


def _clusters(run: Path, query: dict[str, list[str]]) -> dict:
    """Static clusterings of the run plus the regimes, blind spots and hotspots of one week."""
    _, _, scenario, world_id = _board_context(run, query)
    manifest = run / "results" / "run_manifest.json"
    bundle = _cluster_bundle(str(run), manifest.stat().st_mtime_ns)
    board = _board(run, query)  # validates the date and gives the tiers the hotspots are built from
    payload = bundle.static_report()
    payload["run_id"] = run.name
    payload["week"] = bundle.week(world_id, scenario, board["date"], board["units"])
    return payload


class Handler(BaseHTTPRequestHandler):
    run_dir: Path | None = None

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin")
        if _origin_allowed(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler interface
        parsed = urlparse(self.path)
        if parsed.path not in {
            "/api/ml/status", "/api/ml/summary", "/api/ml/predictions", "/api/ml/infer",
            "/api/ml/units", "/api/ml/weeks", "/api/ml/board", "/api/ml/history", "/api/ml/clusters",
        }:
            self._send(404, {"error": "Unknown endpoint", "synthetic": True})
            return

        run = _find_run(self.run_dir)
        if parsed.path == "/api/ml/units":
            try:
                self._send(200, _units(run))
            except (OSError, ValueError) as exc:
                LOG.exception("Unable to read synthetic unit profiles")
                self._send(500, {"error": f"Unit profiles could not be read: {type(exc).__name__}", "synthetic": True})
            return
        if parsed.path == "/api/ml/status":
            self._send(200, {
                "available": run is not None,
                "synthetic": True,
                "run_id": run.name if run else None,
                "reason": None if run else "No completed synthetic ML run found. Run ml/run.ps1 first.",
            })
            return
        if run is None:
            self._send(503, {"error": "No completed synthetic ML run found", "synthetic": True})
            return

        results = run / "results"
        try:
            if parsed.path == "/api/ml/infer":
                try:
                    self._send(200, _infer_from_generated_row(run, parse_qs(parsed.query)))
                except ValueError as exc:
                    self._send(400, {"error": str(exc), "synthetic": True})
                except FileNotFoundError as exc:
                    self._send(503, {"error": str(exc), "synthetic": True})
                return
            if parsed.path in {"/api/ml/weeks", "/api/ml/board", "/api/ml/history", "/api/ml/clusters"}:
                query = parse_qs(parsed.query)
                try:
                    if parsed.path == "/api/ml/weeks":
                        payload = _weeks(run)
                    elif parsed.path == "/api/ml/board":
                        payload = _board(run, query)
                    elif parsed.path == "/api/ml/clusters":
                        payload = _clusters(run, query)
                    else:
                        payload = _history(run, query)
                    self._send(200, payload)
                except ValueError as exc:
                    self._send(400, {"error": str(exc), "synthetic": True})
                except FileNotFoundError as exc:
                    self._send(503, {"error": str(exc), "synthetic": True})
                return
            if parsed.path == "/api/ml/summary":
                self._send(200, _summary(run))
                return

            query = parse_qs(parsed.query)
            task = query.get("task", ["m1"])[0].lower()
            if task not in {"m1", "m2"}:
                self._send(400, {"error": "task must be m1 or m2", "synthetic": True})
                return
            try:
                limit = int(query.get("limit", ["25"])[0])
            except ValueError:
                self._send(400, {"error": "limit must be an integer", "synthetic": True})
                return
            if not 1 <= limit <= 100:
                self._send(400, {"error": "limit must be 1 to 100", "synthetic": True})
                return
            source = results / f"test_predictions_{task}.csv.gz"
            if not source.is_file():
                self._send(503, {"error": "Saved predictions are unavailable", "synthetic": True})
                return
            rows = _read_csv(source, limit)
            predictions = [{
                "world_id": row.get("world_id", ""),
                "scenario": row.get("scenario", ""),
                "unit_id": row.get("unit_id", ""),
                "date": row.get("date", ""),
                "label": _number(row.get("label")),
                "score": _number(row.get("score")),
                "alert_f1": str(row.get("alert_f1", "")).lower() in {"true", "1", "yes"},
                "alert_target_recall": str(row.get("alert_target_recall", "")).lower() in {"true", "1", "yes"},
            } for row in rows]
            self._send(200, {"synthetic": True, "run_id": run.name, "rows": predictions})
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            LOG.exception("Unable to read synthetic run output")
            self._send(500, {"error": f"Run output could not be read: {type(exc).__name__}", "synthetic": True})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=None, help="Completed run directory; newest completed run is used by default")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)
    Handler.run_dir = args.run_dir.resolve() if args.run_dir else None

    def warm_clusters() -> None:
        """Fit the clusterings in the background so the first /api/ml/clusters request is fast."""
        run = _find_run(Handler.run_dir)
        if run is None:
            return
        try:
            _cluster_bundle(str(run), (run / "results" / "run_manifest.json").stat().st_mtime_ns)
            LOG.info("Clusterings ready for run %s", run.name)
        except Exception:  # noqa: BLE001 - the endpoint reports the real error when it is requested
            LOG.warning("Could not pre-fit the clusterings; /api/ml/clusters will retry on request", exc_info=True)

    threading.Thread(target=warm_clusters, daemon=True).start()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    LOG.info("Synthetic run viewer listening at http://127.0.0.1:%s", args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
