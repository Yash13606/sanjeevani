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
