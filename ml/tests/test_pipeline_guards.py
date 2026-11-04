"""Small regression checks that do not generate a simulated world."""

import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import yaml

from sanjeevani_ml.evaluation import select_validation_thresholds, split_seed_groups
from sanjeevani_ml.features import build_as_of_features
from sanjeevani_sim.surveillance import scenario_rng_seed


ROOT = Path(__file__).resolve().parents[1]


def test_sensor_and_lab_features_never_backfill_from_future_dates():
    dates = pd.date_range('2020-01-01', periods=4, freq='D')
    districts = pd.DataFrame([
        dict(unit_id=unit, density_km2=1000, sanitation_coverage=0.8,
             supply_reliability=0.9, piped_share=0.6, treatment_efficacy=0.8)
        for unit in ('A', 'B')
    ])
    weather = pd.DataFrame([
        dict(unit_id=unit, date=date, rainfall_mm=0, temp_mean=25,
             temp_max=26, temp_anomaly=0, rel_humidity=70,
             heavy_rain_after_dry=0, consec_dry_days=0)
        for unit in ('A', 'B') for date in dates
    ])
    surveillance = pd.DataFrame([
        dict(unit_id=unit, date=date, turbidity_ntu=turbidity,
             ecoli_cfu_100ml=ecoli, residual_chlorine_mg_l=0.8,
             tds_mg_l=300, asha_cases_reported=0, asha_cluster_alert=0,
             opd_cases_logged=0, idsp_outbreak_alert=0, sensor_online=int(np.isfinite(turbidity)))
        for unit, turbidity_values, ecoli_values in (
            ('A', [np.nan, 9.0, np.nan, 20.0], [np.nan, 100.0, np.nan, 120.0]),
            ('B', [7.0] * 4, [4.0] * 4),
        )
        for date, turbidity, ecoli in zip(dates, turbidity_values, ecoli_values)
    ])

    features = build_as_of_features(districts, weather, pd.DataFrame(), surveillance, dates)
    a = features[features.unit_id == 'A'].sort_values('date')
    b = features[features.unit_id == 'B'].sort_values('date')
    assert a.turbidity_last.tolist() == [1.5, 9.0, 9.0, 20.0]
    assert a.ecoli_last_cfu.tolist() == [5.0, 100.0, 100.0, 120.0]
    assert a.days_since_lab_test.tolist() == [999, 0, 1, 0]
    assert b.turbidity_last.iloc[0] == 7.0
    assert b.ecoli_last_cfu.iloc[0] == 4.0


def test_scenario_seed_is_stable_across_python_hash_seeds():
    assert scenario_rng_seed(1001, 'baseline') != scenario_rng_seed(1001, 'improved')
    code = "from sanjeevani_sim.surveillance import scenario_rng_seed; print(scenario_rng_seed(1001, 'baseline'))"
    observed = []
    for hash_seed in ('1', '77'):
        result = subprocess.run(
            [sys.executable, '-B', '-c', code], cwd=ROOT,
            env={**os.environ, 'PYTHONHASHSEED': hash_seed},
            text=True, capture_output=True, check=True,
        )
        observed.append(result.stdout.strip())
    assert observed == [str(scenario_rng_seed(1001, 'baseline'))] * 2


def test_world_splits_come_from_config_and_cannot_overlap():
    config = yaml.safe_load((ROOT / 'config' / 'simulation_config.yaml').read_text(encoding='utf-8'))
    groups = split_seed_groups(config)
    assert {name: len(seeds) for name, seeds in groups.items()} == {'train': 20, 'val': 5, 'test': 10}
    assert set(groups['train']).isdisjoint(groups['val'])
    assert set(groups['train']).isdisjoint(groups['test'])
    assert set(groups['val']).isdisjoint(groups['test'])
    invalid = {'splits': {'train_seeds': [1], 'val_seeds': [2], 'test_seeds': [1]}}
    with pytest.raises(ValueError, match='unique'):
        split_seed_groups(invalid)


def test_operating_thresholds_are_selected_from_validation_scores():
    validation_labels = [0, 1, 0, 0, 0, 1, 1]
    validation_scores = [0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9]
    selected = select_validation_thresholds(validation_labels, validation_scores, 0.75)
    assert selected['f1_threshold'] == pytest.approx(0.7)
    assert selected['target_recall_threshold'] == pytest.approx(0.2)
    assert selected['validation_recall_at_target_recall'] == pytest.approx(1.0)
    with pytest.raises(ValueError, match='both binary classes'):
        select_validation_thresholds([0, 0], [0.2, 0.8], 0.75)
