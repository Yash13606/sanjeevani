"""Local, read-only service for completed synthetic ML runs.

This serves saved evaluation outputs and replays a saved model on a generated
test feature row. It does not forecast real districts or receive health records.
Bind to loopback only; the browser UI is a college demo.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import logging
import re
import os
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


class Handler(BaseHTTPRequestHandler):
    run_dir: Path | None = None

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler interface
        parsed = urlparse(self.path)
        if parsed.path not in {
            "/api/ml/status", "/api/ml/summary", "/api/ml/predictions", "/api/ml/infer"
        }:
            self._send(404, {"error": "Unknown endpoint", "synthetic": True})
            return

        run = _find_run(self.run_dir)
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
            if parsed.path == "/api/ml/summary":
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
                self._send(200, {
                    "synthetic": True,
                    "run_id": run.name,
                    "metrics": metrics,
                    "event_metrics": event_metrics,
                    "manifest": _read_json(results / "run_manifest.json"),
                })
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
