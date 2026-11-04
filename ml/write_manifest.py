"""Record reproducible provenance for a completed synthetic experiment run.

This script checks the configured world/seed/scenario files and writes one
machine-readable manifest beside the run's results. It does not train a model.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import importlib.metadata
import json
import platform
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import yaml


PROJECT_ROOT = Path(__file__).resolve().parent
SCENARIOS = ("baseline", "improved", "enhanced")
LABELS = ("label_m1_onset_7d", "label_m2_active")
PACKAGES = ("numpy", "pandas", "scipy", "scikit-learn", "matplotlib", "PyYAML", "joblib", "xgboost")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_record(path: Path, base: Path) -> dict:
    return {
        "path": path.relative_to(base).as_posix(),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def label_value(text: str) -> int | None:
    if text == "" or text.lower() == "nan":
        return None
    value = float(text)
    if value not in (0.0, 1.0):
        raise ValueError(f"Expected a binary label, received {text!r}")
    return int(value)


def summarize_world(path: Path, split: str, seed: int, scenario: str) -> dict:
    counts = {label: Counter() for label in LABELS}
    rows = 0
    with gzip.open(path, "rt", encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        missing = {"seed", "split", "scenario", *LABELS} - set(reader.fieldnames or ())
        if missing:
            raise ValueError(f"{path}: missing columns {sorted(missing)}")
        for row in reader:
            rows += 1
            if int(float(row["seed"])) != seed or row["split"] != split or row["scenario"] != scenario:
                raise ValueError(f"{path}: row {rows} has a mismatched seed, split, or scenario")
            for label in LABELS:
                value = label_value(row[label])
                if value is not None:
                    counts[label][value] += 1
    if rows == 0:
        raise ValueError(f"{path}: empty cohort")
    return {
        "rows": rows,
        "labels": {
            label: {
                "known": counts[label][0] + counts[label][1],
                "positive": counts[label][1],
                "unknown": rows - counts[label][0] - counts[label][1],
            }
            for label in LABELS
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--run-root", type=Path, required=True)
    args = parser.parse_args()
    config_path = args.config.resolve(strict=True)
    run_root = args.run_root.resolve(strict=True)
    config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    groups = {name: config["splits"][f"{name}_seeds"] for name in ("train", "val", "test")}
    all_seeds = [seed for seeds in groups.values() for seed in seeds]
    if not all(groups.values()) or len(all_seeds) != len(set(all_seeds)):
        raise ValueError("Each split needs distinct seeds; no seed may appear in two splits")

    units_path = (PROJECT_ROOT / config["system"]["units_file"]).resolve(strict=True)
    source_paths = [
        config_path,
        units_path,
        PROJECT_ROOT / "requirements.txt",
        PROJECT_ROOT / "data_provenance.json",
        PROJECT_ROOT / "write_manifest.py",
        PROJECT_ROOT / "setup.ps1",
        PROJECT_ROOT / "run.ps1",
    ]
    source_paths += sorted((PROJECT_ROOT / "sanjeevani_sim").glob("*.py"))
    source_paths += sorted((PROJECT_ROOT / "sanjeevani_ml").glob("*.py"))
    source_paths = list(dict.fromkeys(path.resolve(strict=True) for path in source_paths))
    if any(PROJECT_ROOT not in path.parents for path in source_paths):
        raise ValueError("Source files must stay inside the portable ML project directory")

    cohorts = {}
    for split, seeds in groups.items():
        cohorts[split] = {}
        for seed in seeds:
            event_path = run_root / "ml_datasets" / "worlds" / split / f"events_{seed}.csv.gz"
            if not event_path.is_file():
                raise FileNotFoundError(event_path)
            for scenario in SCENARIOS:
                path = run_root / "ml_datasets" / "worlds" / split / f"world_{seed}_{scenario}.csv.gz"
                if not path.is_file():
                    raise FileNotFoundError(path)
                cohorts[split][f"{seed}_{scenario}"] = summarize_world(path, split, seed, scenario)

    required_results = (
        "benchmark_metrics_summary.csv",
        "test_predictions_m1.csv.gz",
        "test_predictions_m2.csv.gz",
        "event_metrics_summary.csv",
        "run_manifest.json",
    )
    for name in required_results:
        path = run_root / "results" / name
        if not path.is_file():
            raise FileNotFoundError(path)
    run_manifest = json.loads((run_root / "results" / "run_manifest.json").read_text(encoding="utf-8"))
    if run_manifest.get("status") != "completed_simulated":
        raise ValueError("The trainer has not marked this synthetic run complete")
    if run_manifest.get("config_sha256") != sha256(config_path):
        raise ValueError("The configuration changed after the trainer started")
    if run_manifest.get("split_seeds") != groups:
        raise ValueError("Trainer split seeds do not match the configuration")
    if tuple(run_manifest.get("scenario_names", ())) != SCENARIOS:
        raise ValueError("Trainer surveillance scenarios do not match the expected three cohorts")
    model_dir = run_root / "models"
    if not list(model_dir.rglob("m1.joblib")) or not list(model_dir.rglob("m2.joblib")):
        raise FileNotFoundError("Completed run needs saved M1 and M2 model artifacts")

    provenance = json.loads((PROJECT_ROOT / "data_provenance.json").read_text(encoding="utf-8"))
    artifact_files = sorted(
        path for path in run_root.rglob("*")
        if path.is_file() and path.name != "provenance_manifest.json"
    )
    source_records = [file_record(path, PROJECT_ROOT) for path in source_paths]
    artifacts = [file_record(path, run_root) for path in artifact_files]
    versions = {}
    for package in PACKAGES:
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = None
    manifest = {
        "schema_version": 1,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "classification": "SYNTHETIC",
        "real_world_validation": False,
        "python": platform.python_version(),
        "packages": versions,
        "config": config_path.relative_to(PROJECT_ROOT).as_posix(),
        "split_seeds": groups,
        "scenarios": SCENARIOS,
        "source_files": source_records,
        "cohorts": cohorts,
        "artifacts": artifacts,
        "provenance": provenance,
    }
    destination = run_root / "provenance_manifest.json"
    temporary = destination.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(destination)
    print(f"Provenance manifest: {destination}")
    print(f"Verified {len(all_seeds)} independent seed IDs and {sum(len(x) for x in cohorts.values())} scenario cohorts")


if __name__ == "__main__":
    main()
