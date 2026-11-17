"""Contract checks for the local synthetic-results viewer."""

import csv
import gzip
import json
import threading
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression

from service import Handler, _find_run


def _get(server, path):
    connection = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
    connection.request("GET", path, headers={"Origin": "http://localhost:8080"})
    response = connection.getresponse()
    result = response.status, response.getheader("Access-Control-Allow-Origin"), json.loads(response.read())
    connection.close()
    return result


def test_service_reads_only_completed_synthetic_run(tmp_path: Path):
    run = tmp_path / "smoke-test"
    results = run / "results"
    results.mkdir(parents=True)
    (results / "run_manifest.json").write_text(json.dumps({"run_id": "smoke-test", "synthetic": True, "split_seeds": {"test": [3001]}, "scenario_names": ["baseline"]}), encoding="utf-8")
    with (results / "benchmark_metrics_summary.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["Task", "Model", "Scenario", "Split", "Rows", "Positives", "Prevalence", "AveragePrecision", "Selected"])
        writer.writeheader()
        writer.writerow({"Task": "M1", "Model": "logistic", "Scenario": "baseline", "Split": "test", "Rows": 100, "Positives": 5, "Prevalence": 0.05, "AveragePrecision": 0.31, "Selected": "True"})
    with (results / "event_metrics_summary.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["Task", "Scenario", "EligibleEventScenarioPairs", "WarnedOrDetected", "EventRecall", "MedianLeadDays", "MedianDetectionDelayDays", "EligibleUnreportedEventScenarioPairs", "DetectedWhileUnreported", "UnreportedDetectionRecall", "MedianDaysBeforeReport"])
        writer.writeheader()
        writer.writerow({"Task": "M1", "Scenario": "baseline", "EligibleEventScenarioPairs": 10, "WarnedOrDetected": 3, "EventRecall": 0.3, "MedianLeadDays": 4, "MedianDetectionDelayDays": "", "EligibleUnreportedEventScenarioPairs": "", "DetectedWhileUnreported": "", "UnreportedDetectionRecall": "", "MedianDaysBeforeReport": ""})
    with gzip.open(results / "test_predictions_m1.csv.gz", "wt", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["world_id", "scenario", "unit_id", "date", "label", "score", "alert_f1", "alert_target_recall"])
        writer.writeheader()
        writer.writerow({"world_id": "world_3001", "scenario": "baseline", "unit_id": "TN_01", "date": "2021-01-04", "label": 1, "score": 0.7, "alert_f1": 1, "alert_target_recall": 1})
    cohort_path = run / "ml_datasets" / "worlds" / "test" / "world_3001_baseline.csv.gz"
    cohort_path.parent.mkdir(parents=True)
    with gzip.open(cohort_path, "wt", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["unit_id", "date", "rain_7d", "in_m1_risk_set"])
        writer.writeheader()
        writer.writerow({"unit_id": "TN_01", "date": "2021-01-04", "rain_7d": 3, "in_m1_risk_set": 1})
    model_dir = run / "models" / "v3" / "smoke-test"
    model_dir.mkdir(parents=True)
    training = pd.DataFrame({"rain_7d": [0, 1, 2, 3]})
    model = LogisticRegression().fit(training, [0, 0, 1, 1])
    joblib.dump(model, model_dir / "m1.joblib")
    (model_dir / "manifest.json").write_text(json.dumps({
        "data_type": "synthetic simulation", "run_id": "smoke-test",
        "models": {"m1": {"feature_columns": ["rain_7d"], "model_name": "test logistic", "validation_f1_threshold": 0.5}},
    }), encoding="utf-8")

    assert _find_run(run) == run
    Handler.run_dir = run
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        status, origin, payload = _get(server, "/api/ml/status")
        assert status == 200 and origin == "http://localhost:8080"
        assert payload["available"] is True and payload["synthetic"] is True

        status, _, payload = _get(server, "/api/ml/summary")
        assert status == 200 and payload["metrics"][0]["average_precision"] == 0.31
        assert payload["metrics"][0]["selected"] is True
        assert payload["event_metrics"][0]["event_recall"] == 0.3
        assert payload["event_metrics"][0]["median_lead_days"] == 4

        status, _, payload = _get(server, "/api/ml/predictions?task=m1&limit=1")
        assert status == 200 and payload["rows"][0]["score"] == 0.7
        assert payload["rows"][0]["unit_id"] == "TN_01"

        status, _, payload = _get(server, "/api/ml/predictions?task=invalid")
        assert status == 400 and payload["synthetic"] is True

        status, _, payload = _get(server, "/api/ml/infer?task=m1&world_id=world_3001&scenario=baseline&unit_id=TN_01&date=2021-01-04")
        assert status == 200 and payload["synthetic"] is True
        assert payload["model_name"] == "test logistic"
        assert abs(payload["score"] - model.predict_proba(pd.DataFrame({"rain_7d": [3]}))[0, 1]) < 1e-12
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        Handler.run_dir = None


def _write_gz_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def test_weekly_board_units_and_history(tmp_path: Path):
    """The React dashboards read /units, /weeks, /board and /history; check the contract."""
    run = tmp_path / "board-test"
    results = run / "results"
    results.mkdir(parents=True)
    (results / "run_manifest.json").write_text(json.dumps({
        "run_id": "board-test", "synthetic": True,
        "split_seeds": {"test": [3001]}, "scenario_names": ["baseline", "improved"],
    }), encoding="utf-8")
    (results / "benchmark_metrics_summary.csv").write_text("Task,Model,Scenario,Split,Selected\n", encoding="utf-8")

    prediction_fields = ["world_id", "scenario", "unit_id", "date", "label", "score", "alert_f1", "alert_target_recall"]
    def prediction(unit, date, score, label, scenario="baseline"):
        return {"world_id": "world_3001", "scenario": scenario, "unit_id": unit, "date": date,
                "label": label, "score": score, "alert_f1": 0, "alert_target_recall": 0}
    # TN_01 is in the M1 risk set on both weeks; TN_02 has an active event the second week (no M1 row)
    m1_rows = [prediction("TN_01", "2021-01-04", 0.30, 0), prediction("TN_02", "2021-01-04", 0.05, 0),
               prediction("TN_01", "2021-01-11", 0.10, 1)]
    m2_rows = [prediction("TN_01", "2021-01-04", 0.40, 0), prediction("TN_02", "2021-01-04", 0.02, 0),
               prediction("TN_01", "2021-01-11", 0.20, 0), prediction("TN_02", "2021-01-11", 0.90, 1)]
    _write_gz_csv(results / "test_predictions_m1.csv.gz", prediction_fields, m1_rows)
    _write_gz_csv(results / "test_predictions_m2.csv.gz", prediction_fields, m2_rows)

    signal_fields = ["unit_id", "date", "rain_7d", "temp_mean_7d", "rel_humidity_7d", "turbidity_mean_7d",
                     "turbidity_max_7d", "turbidity_exceed_7d", "chlorine_mean_7d", "chlorine_depleted_7d",
                     "tds_mean_7d", "ecoli_last_cfu", "ecoli_positive_30d", "days_since_lab_test",
                     "asha_cases_7d", "asha_cases_14d", "asha_alert_7d", "opd_cases_7d", "opd_trend_7d",
                     "idsp_alerts_28d", "sensor_uptime_7d"]
    def signals(unit, date, cases):
        row = {name: 1 for name in signal_fields}
        row.update({"unit_id": unit, "date": date, "asha_cases_7d": cases, "tds_mean_7d": ""})
        return row
    _write_gz_csv(run / "ml_datasets" / "worlds" / "test" / "world_3001_baseline.csv.gz", signal_fields,
                  [signals("TN_01", "2021-01-04", 5), signals("TN_02", "2021-01-04", 6),
                   signals("TN_01", "2021-01-11", 7), signals("TN_02", "2021-01-11", 8)])

    model_dir = run / "models" / "v3" / "board-test"
    model_dir.mkdir(parents=True)
    for task, f1, recall in (("m1", 0.25, 0.08), ("m2", 0.5, 0.15)):
        (model_dir / f"{task}.joblib").write_bytes(b"placeholder")
    (model_dir / "manifest.json").write_text(json.dumps({
        "data_type": "synthetic simulation", "run_id": "board-test",
        "models": {
            "m1": {"model_name": "XGBoost", "validation_f1_threshold": 0.25, "validation_target_recall_threshold": 0.08,
                   "target_recall": 0.75, "feature_columns": []},
            "m2": {"model_name": "XGBoost", "validation_f1_threshold": 0.5, "validation_target_recall_threshold": 0.15,
                   "target_recall": 0.85, "feature_columns": []},
        },
    }), encoding="utf-8")

    Handler.run_dir = run
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        status, _, payload = _get(server, "/api/ml/units")
        assert status == 200 and payload["synthetic"] is True
        assert len(payload["units"]) == 43
        first = payload["units"][0]
        assert first["unit_id"] == "TN_01" and "id" not in first
        assert first["name"] and isinstance(first["neighbors"], list) and first["lat"] and first["lon"]

        status, _, payload = _get(server, "/api/ml/weeks")
        assert status == 200
        assert payload["dates"] == ["2021-01-04", "2021-01-11"]
        assert payload["scenarios"] == ["baseline", "improved"] and payload["world_ids"] == ["world_3001"]
        # both units are M1-eligible on the first week, only one on the second: demo starts on the first
        assert payload["default_date"] == "2021-01-04"

        # default board = latest decision date; thresholds map scores to tiers
        status, _, payload = _get(server, "/api/ml/board")
        assert status == 200 and payload["date"] == "2021-01-11" and payload["scenario"] == "baseline"
        assert payload["models"]["m1"]["f1_threshold"] == 0.25 and payload["models"]["m2"]["target_recall"] == 0.85
        by_unit = {unit["unit_id"]: unit for unit in payload["units"]}
        assert by_unit["TN_01"]["m1"]["tier"] == "watch"            # 0.10: >= recall threshold 0.08, < F1 threshold 0.25
        assert by_unit["TN_01"]["m2"]["tier"] == "watch"            # 0.20: >= 0.15, < 0.5
        assert by_unit["TN_02"]["m2"]["tier"] == "review"           # 0.90 >= 0.5
        assert by_unit["TN_02"]["m1"] is None and by_unit["TN_02"]["m1_in_risk_set"] is False
        assert by_unit["TN_01"]["signals"]["asha_cases_7d"] == 7
        assert by_unit["TN_01"]["signals"]["tds_mean_7d"] is None   # blank cell must not leak NaN

        status, _, payload = _get(server, "/api/ml/board?date=2021-01-04")
        assert status == 200 and {u["unit_id"]: u["m1"]["tier"] for u in payload["units"]} == {"TN_01": "review", "TN_02": "routine"}

        status, _, payload = _get(server, "/api/ml/board?date=2030-01-01")
        assert status == 400 and payload["synthetic"] is True
        status, _, _ = _get(server, "/api/ml/board?scenario=live")
        assert status == 400
        status, _, _ = _get(server, "/api/ml/board?scenario=improved")   # known scenario, but no saved rows
        assert status == 400

        status, _, payload = _get(server, "/api/ml/history?unit_id=TN_01&weeks=1")
        assert status == 200 and [p["date"] for p in payload["points"]] == ["2021-01-11"]
        assert payload["points"][0]["m2"]["score"] == 0.20 and payload["points"][0]["signals"]["asha_cases_7d"] == 7
        status, _, payload = _get(server, "/api/ml/history?unit_id=TN_02")
        assert status == 200 and payload["points"][0]["m1"]["tier"] == "routine" and payload["points"][1]["m1"] is None
        status, _, _ = _get(server, "/api/ml/history?unit_id=../etc/passwd")
        assert status == 400
        status, _, _ = _get(server, "/api/ml/history?unit_id=TN_01&weeks=0")
        assert status == 400
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        Handler.run_dir = None


def test_incomplete_run_is_unavailable(tmp_path: Path):
    run = tmp_path / "partial"
    run.mkdir()
    assert _find_run(run) is None
    Handler.run_dir = run
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        status, _, payload = _get(server, "/api/ml/status")
        assert status == 200
        assert payload["synthetic"] is True and payload["available"] is False
        assert payload["reason"]
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        Handler.run_dir = None


def test_any_local_port_is_allowed_but_no_other_origin():
    from service import _origin_allowed

    for origin in ("http://localhost:8080", "http://127.0.0.1:5173", "http://localhost:8081", "http://127.0.0.1:5174", "http://localhost"):
        assert _origin_allowed(origin), origin
    for origin in ("https://example.com", "http://evil.localhost:8080", "http://localhost.evil.com", "http://192.168.1.5:8080", None, ""):
        assert not _origin_allowed(origin), origin
