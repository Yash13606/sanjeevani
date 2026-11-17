"""Export a small, read-only snapshot of a completed synthetic run for the React demo.

The dashboards normally read the live local service (service.py). This file lets the UI
still render if the Python service is not running, e.g. when the web app is opened on a
laptop that has not generated a run. It is a copy of saved *synthetic test-world* outputs
for one surveillance scenario and a window of weekly decision dates. It is not live data,
and the numbers of a smoke run only show that the software works.

    python export_ui_snapshot.py --run-dir runs/<run-id> --out ../src/data/mlSnapshot.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from service import _board, _cluster_bundle, _find_run, _model_meta, _summary, _units, _weeks

SIGNAL_DECIMALS = 3


def _round(value):
    return round(value, SIGNAL_DECIMALS) if isinstance(value, float) else value


def export_snapshot(run: Path, scenario: str, weeks: int) -> dict:
    weekly = _weeks(run)
    if scenario not in weekly["scenarios"]:
        raise SystemExit(f"scenario {scenario!r} not in this run: {weekly['scenarios']}")
    dates = weekly["dates"]
    default_date = weekly["default_date"] or dates[-1]
    # a window of `weeks` decision dates that ends one week after the suggested default date
    end = min(dates.index(default_date) + 2, len(dates))
    window = dates[max(0, end - weeks):end]

    boards = {}
    for date in window:
        board = _board(run, {"scenario": [scenario], "date": [date]})
        for unit in board["units"]:
            unit["signals"] = {key: _round(value) for key, value in unit["signals"].items()}
            for task in ("m1", "m2"):
                if unit[task] and unit[task]["score"] is not None:
                    unit[task]["score"] = round(unit[task]["score"], 5)
        boards[date] = board

    summary = _summary(run)
    summary.pop("manifest", None)
    summary["metrics"] = [m for m in summary["metrics"] if m["split"].lower() == "test"]

    # clusterings fitted on the training worlds, with the regimes / blind spots / hotspots of each kept week
    bundle = _cluster_bundle(str(run), (run / "results" / "run_manifest.json").stat().st_mtime_ns)
    world_id = next(iter(boards.values()))["world_id"]
    clusters = bundle.static_report()
    clusters["weeks"] = {date: bundle.week(world_id, scenario, date, boards[date]["units"]) for date in window}
    return {
        "synthetic": True,
        "source": "bundled_snapshot",
        "run_id": run.name,
        "world_id": next(iter(boards.values()))["world_id"],
        "scenario": scenario,
        "default_date": default_date,
        "dates": window,
        "models": {task: _model_meta(run, task) for task in ("m1", "m2")},
        "units": _units(run)["units"],
        "summary": summary,
        "clusters": clusters,
        "boards": boards,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--run-dir", type=Path, default=None, help="completed run; newest under runs/ by default")
    parser.add_argument("--scenario", default="baseline")
    parser.add_argument("--weeks", type=int, default=14, help="number of weekly decision dates to keep")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    run = _find_run(args.run_dir.resolve() if args.run_dir else None)
    if run is None:
        raise SystemExit("No completed synthetic run found. Run ml/run.ps1 first.")
    snapshot = export_snapshot(run, args.scenario, args.weeks)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(snapshot, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    print(f"Wrote {args.out} ({args.out.stat().st_size / 1024:.0f} KB): run={run.name}, "
          f"{len(snapshot['dates'])} weeks {snapshot['dates'][0]}..{snapshot['dates'][-1]}")


if __name__ == "__main__":
    main()
