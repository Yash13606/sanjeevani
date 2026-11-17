"""Unit tests for the clustering layer, on tiny generated data (no simulation needed)."""

import json

import numpy as np
import pandas as pd

from sanjeevani_ml import clustering as cl


def _units(n=12):
    out = []
    for i in range(n):
        big = i % 2 == 0
        out.append({
            "unit_id": f"U{i:02d}", "name": f"Unit_{i}", "type": "x",
            "population": 900_000 if big else 150_000, "density_km2": 4000 if big else 300,
            "coastal": i % 3 == 0, "sanitation_coverage": 0.85 if big else 0.55,
            "water_sources": {"piped": 0.7, "groundwater": 0.3} if big else {"piped": 0.2, "groundwater": 0.4, "tanker": 0.4},
            "neighbors": [f"U{i + 1:02d}"] if i + 1 < n else [],
        })
    return out


def _train_frame(units, weeks=60, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    for u in units:
        for w in range(weeks):
            hot = rng.random() < 0.2
            rows.append({
                "world_id": "world_1", "scenario": "baseline", "unit_id": u["unit_id"],
                "date": f"2020-{1 + w // 5:02d}-{1 + (w % 5) * 5:02d}", "month": 1 + w // 5 % 12,
                "turbidity_mean_7d": rng.normal(6 if hot else 1.5, 0.5), "turbidity_exceed_7d": 4.0 if hot else 0.0,
                "chlorine_mean_7d": 0.1 if hot else 0.8, "chlorine_depleted_7d": 5.0 if hot else 0.0,
                "tds_mean_7d": 300.0, "ecoli_last_cfu": 50.0 if hot else 5.0, "ecoli_positive_30d": 2.0 if hot else 0.0,
                "rain_7d": 60.0 if hot else 3.0, "rain_30d": 90.0 if hot else 10.0, "heavy_rain_after_dry_7d": float(hot),
                "consec_dry_days": 1.0 if hot else 12.0, "temp_mean_7d": 29.0, "rel_humidity_7d": 70.0,
                "asha_cases_7d": 400.0 if hot else 30.0, "asha_cases_14d": 700.0 if hot else 60.0, "asha_alert_7d": float(hot),
                "opd_cases_7d": 800.0 if hot else 60.0, "idsp_alerts_28d": 1.0 if hot else 0.0,
                "sensor_uptime_7d": 0.9 if u["unit_id"] < "U06" else 0.0,
                "days_since_lab_test": 0.0 if u["unit_id"] < "U06" else np.nan,
                "in_m1_risk_set": 1, "label_m1_onset_7d": float(hot), "label_m2_active": float(hot),
            })
    return pd.DataFrame(rows)


def test_clean_makes_values_json_safe():
    assert cl._clean(float("nan")) is None
    assert cl._clean(np.float64("inf")) is None
    assert cl._clean(np.int64(3)) == 3 and isinstance(cl._clean(np.int64(3)), int)
    assert json.dumps({"x": cl._clean(np.float32(1.5))}) == '{"x": 1.5}'


def test_archetypes_cover_every_unit_once():
    units = _units()
    result = cl.fit_archetypes(units)
    assert set(result["unit_cluster"]) == {u["unit_id"] for u in units}
    assert sum(c["size"] for c in result["clusters"]) == len(units)
    assert 3 <= result["k"] <= 5
    assert all(c["name"] for c in result["clusters"])


def test_regimes_separate_hot_weeks_and_are_ordered_calm_to_hot():
    units = _units()
    population = {u["unit_id"]: u["population"] for u in units}
    train = _train_frame(units)
    model = cl.fit_regimes(train, population)
    assigned = cl.assign_regimes(model, train)
    assert set(assigned) <= set(range(model["k"]))
    report = cl.regime_report(model, train, assigned)
    rates = [c["m2_active_rate"] for c in report["clusters"] if c["m2_active_rate"] is not None]
    assert rates == sorted(rates), "regimes must be ordered from the lowest to the highest outbreak rate"
    assert rates[-1] > 0.8 and rates[0] < 0.2
    json.dumps(report, allow_nan=False)


def test_blind_spots_rank_offline_units_as_blind():
    units = _units()
    train = _train_frame(units)
    model = cl.fit_blind_spots(train)
    table = cl.assign_blind_spots(model, train)
    by_unit = table.set_index("unit_id")["cluster"]
    assert by_unit["U00"] < by_unit["U10"], "sensor-offline units should land in a blinder cluster"


def test_seasonal_and_event_types_handle_small_inputs():
    units = _units()
    population = {u["unit_id"]: u["population"] for u in units}
    seasonal = cl.fit_seasonal(_train_frame(units), population)
    assert seasonal["months"][0] == "Jan" and all(len(c["curve"]) == 12 for c in seasonal["clusters"])
    assert cl.fit_event_types(pd.DataFrame({"x": range(5)})) is None
    assert cl.event_type_report(None, pd.DataFrame()) == {"available": False, "clusters": []}


def test_event_types_group_short_and_long_events():
    rng = np.random.default_rng(1)
    n = 60
    long_ev = rng.random(n) < 0.5
    events = pd.DataFrame({
        "operational_start_date": ["2020-01-01"] * n,
        "duration_days": np.where(long_ev, 70, 15) + rng.integers(0, 4, n),
        "total_cases": np.where(long_ev, 11000, 3000) + rng.integers(0, 200, n),
        "cholera_cases": 400, "first_report_date_baseline": ["2020-01-09"] * n,
    })
    model = cl.fit_event_types(events)
    report = cl.event_type_report(model, events)
    assert report["available"] and report["k"] >= 2
    medians = [c["median_total_cases"] for c in report["clusters"]]
    assert medians == sorted(medians)


def test_hotspots_group_adjacent_flagged_units_only():
    units = _units(8)  # chain U00-U01-...-U07
    def unit(uid, tier, score):
        return {"unit_id": uid, "m1": {"tier": tier, "score": score}, "m2": None}
    board = [unit("U00", "review", 0.9), unit("U01", "review", 0.3), unit("U02", "routine", 0.0),
             unit("U05", "review", 0.8), unit("U07", "review", 0.2), unit("U04", "watch", 0.1)]
    groups = cl.hotspot_clusters(units, board, "m1")
    assert len(groups) == 1, "U05 and U07 are two hops apart and a Watch unit does not join a hotspot"
    assert groups[0]["units"] == ["U00", "U01"] and groups[0]["review_count"] == 2 and groups[0]["top_unit"] == "U00"
    assert cl.hotspot_clusters(units, board[:1], "m1") == []
