"""Small contract checks; no full synthetic world is generated."""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import yaml
import joblib
from sklearn.metrics import average_precision_score

from sanjeevani_ml.evaluation import select_model_on_validation
from sanjeevani_ml.event_metrics import aggregate_event_metrics, event_level_metrics
from sanjeevani_ml.pipeline import FEATURE_COLUMNS, prediction_dates
from sanjeevani_ml.scratch_logistic import ScratchLogisticRegression
from sanjeevani_ml.train_and_evaluate import train_and_evaluate_task
from sanjeevani_sim.surveillance import simulate_surveillance_layer
from sanjeevani_sim.world import WorldSimulator


ROOT = Path(__file__).resolve().parents[1]


def test_prediction_schedule_uses_config_and_complete_follow_up():
    dates = pd.date_range('2024-01-01', periods=60, freq='D')
    truth = pd.DataFrame({'date': dates})
    system = {'burn_in_days': 5, 'prediction_interval_days': 7, 'prediction_day_of_week': 0}
    weekly = prediction_dates(truth, system)
    assert weekly[0] == pd.Timestamp('2024-01-08')
    assert weekly[-1] <= dates[-1] - pd.Timedelta(days=14)
    assert {day.weekday() for day in weekly} == {0}
    system['prediction_interval_days'] = 14
    fortnightly = prediction_dates(truth, system)
    assert fortnightly == weekly[::2]
    system['prediction_day_of_week'] = 1
    assert all(day.weekday() == 1 for day in prediction_dates(truth, system))


def test_world_resolves_units_file_from_config_without_cwd_dependency():
    simulator = WorldSimulator(str(ROOT / 'config' / 'smoke.yaml'))
    assert Path(simulator.units_yaml).resolve() == (ROOT / 'config' / 'tamil_nadu_districts.yaml').resolve()


def test_surveillance_emits_every_unit_even_without_outbreak_events():
    config = yaml.safe_load((ROOT / 'config' / 'simulation_config.yaml').read_text(encoding='utf-8'))
    dates = pd.date_range('2024-01-01', periods=5, freq='D')
    districts = pd.DataFrame({'unit_id': ['A', 'B']})
    truth = pd.DataFrame([
        {'unit_id': unit, 'date': day, 'true_cases_total': 0, 'active_outbreak_operational': 0}
        for unit in ('A', 'B') for day in dates
    ])
    water = pd.DataFrame([
        {'unit_id': unit, 'date': day, 'c_piped': 0.1, 'c_groundwater': 0.1}
        for unit in ('A', 'B') for day in dates
    ])
    surveillance, events = simulate_surveillance_layer(
        districts, water, truth, pd.DataFrame(), 'baseline', 1001, config,
    )
    assert surveillance.groupby('unit_id').size().to_dict() == {'A': 5, 'B': 5}
    assert set(surveillance['date']) == set(dates)
    assert events.empty


def test_scratch_logistic_learns_and_is_deterministic_with_missing_feature():
    signal = np.linspace(-3, 3, 120)
    matrix = np.column_stack((signal, np.full(len(signal), np.nan)))
    labels = (signal > 0).astype(int)
    first = ScratchLogisticRegression(learning_rate=0.1, epochs=50, batch_size=24, seed=7).fit(matrix, labels)
    second = ScratchLogisticRegression(learning_rate=0.1, epochs=50, batch_size=24, seed=7).fit(matrix, labels)
    scores = first.predict_proba(matrix)[:, 1]
    assert average_precision_score(labels, scores) > 0.99
    assert first.loss_history_[-1] < first.loss_history_[0]
    np.testing.assert_allclose(first.coef_, second.coef_)
    assert np.isfinite(first.predict_proba([[np.nan, np.nan], [5.0, np.nan]])).all()


def test_validation_selection_and_event_metrics_use_real_warning_windows():
    val_labels = np.array([0, 0, 1, 0, 1, 1])
    winner, scores = select_model_on_validation(val_labels, {
        'weak': np.array([0.1, 0.8, 0.2, 0.7, 0.3, 0.4]),
        'strong': np.array([0.1, 0.2, 0.9, 0.3, 0.8, 0.7]),
    })
    assert winner == 'strong'
    assert scores['strong'] > scores['weak']
    with pytest.raises(ValueError, match='both binary classes'):
        select_model_on_validation([0, 0], {'only': [0.1, 0.2]})

    dates = pd.date_range('2024-01-01', periods=5, freq='7D')
    predictions = pd.DataFrame([
        {'world_id': 'w1', 'scenario': 'baseline', 'unit_id': unit, 'date': day,
         'alert_target_recall': int(unit == 'A' and day in (dates[1], dates[2]))}
        for unit in ('A', 'B') for day in dates
    ])
    events = pd.DataFrame([
        {'world_id': 'w1', 'outbreak_id': 'early', 'unit_id': 'A',
         'operational_start_date': '2024-01-05', 'end_date': '2024-01-06'},
        {'world_id': 'w1', 'outbreak_id': 'hit', 'unit_id': 'A',
         'operational_start_date': '2024-01-10', 'end_date': '2024-01-20'},
        {'world_id': 'w1', 'outbreak_id': 'miss', 'unit_id': 'B',
         'operational_start_date': '2024-01-24', 'end_date': '2024-01-26'},
    ])
    m1_world, m1_details = event_level_metrics(predictions, events, 'm1')
    m1_total = aggregate_event_metrics(m1_world, m1_details).iloc[0]
    assert m1_total['EligibleEventScenarioPairs'] == 2
    assert m1_total['WarnedOrDetected'] == 1
    assert m1_total['EventRecall'] == pytest.approx(0.5)
    assert m1_total['MedianLeadDays'] == pytest.approx(2.0)
    assert m1_total['ExcludedCensoredEvents'] == 1

    m2_predictions = predictions.copy()
    m2_predictions.loc[(m2_predictions['unit_id'] == 'B') &
                       (m2_predictions['date'] == dates[3]), 'alert_target_recall'] = 1
    m2_events = pd.DataFrame([
        {'world_id': 'w1', 'outbreak_id': 'reported', 'unit_id': 'A',
         'operational_start_date': '2024-01-10', 'end_date': '2024-01-20',
         'first_report_date_baseline': '2024-01-18'},
        {'world_id': 'w1', 'outbreak_id': 'never_reported', 'unit_id': 'B',
         'operational_start_date': '2024-01-19', 'end_date': '2024-01-25',
         'first_report_date_baseline': None},
        {'world_id': 'w1', 'outbreak_id': 'no_weekly_opportunity', 'unit_id': 'B',
         'operational_start_date': '2024-01-26', 'end_date': '2024-01-27',
         'first_report_date_baseline': None},
    ])
    m2_world, m2_details = event_level_metrics(m2_predictions, m2_events, 'm2')
    m2_total = aggregate_event_metrics(m2_world, m2_details).iloc[0]
    assert m2_total['EligibleEventScenarioPairs'] == 2
    assert m2_total['MedianDetectionDelayDays'] == pytest.approx(4.0)
    assert m2_total['ExcludedNoScoredOpportunity'] == 1
    assert m2_total['EligibleUnreportedEventScenarioPairs'] == 2
    assert m2_total['DetectedWhileUnreported'] == 2
    assert m2_total['UnreportedDetectionRecall'] == pytest.approx(1.0)
    assert m2_total['MedianDaysBeforeReport'] == pytest.approx(3.0)
    assert m2_details.loc[m2_details['OutbreakId'] == 'never_reported', 'DaysBeforeReport'].isna().all()


def test_two_task_trainer_writes_versionable_artifacts_without_world_simulation(tmp_path):
    cohort_paths = {}
    event_paths = {'test': []}
    dates = pd.date_range('2024-01-01', periods=48, freq='7D')
    for seed, split in ((1, 'train'), (2, 'val'), (3, 'test')):
        rows = []
        for index, day in enumerate(dates):
            row = {feature: 0.0 for feature in FEATURE_COLUMNS}
            row.update({
                'world_id': f'world_{seed}', 'seed': seed, 'scenario': 'baseline',
                'unit_id': 'A', 'date': day, 'month': day.month,
                'rain_3d': float(index % 4),
                'heavy_rain_after_dry_7d': int(index % 4 == 0),
                'turbidity_mean_7d': 5.0 if index % 4 == 0 else 1.0,
                'asha_cases_7d': float(index % 7),
                'in_m1_risk_set': 1,
                'label_m1_onset_7d': int(index % 4 == 0),
                'label_m2_active': int(index % 7 < 2),
            })
            rows.append(row)
        path = tmp_path / f'{split}.csv.gz'
        pd.DataFrame(rows).to_csv(path, index=False, compression='gzip')
        cohort_paths[split] = [path]
    events_path = tmp_path / 'events.csv.gz'
    pd.DataFrame([{
        'world_id': 'world_3', 'outbreak_id': 'evt_1', 'unit_id': 'A',
        'operational_start_date': '2024-03-06', 'end_date': '2024-03-20',
        'first_report_date_baseline': '2024-03-18',
    }]).to_csv(events_path, index=False, compression='gzip')
    event_paths['test'] = [events_path]
    results_dir = tmp_path / 'results'
    models_dir = tmp_path / 'models' / 'test-version' / 'test-run'
    results_dir.mkdir(parents=True)
    models_dir.mkdir(parents=True)

    for task in ('m1', 'm2'):
        result = train_and_evaluate_task(task, cohort_paths, event_paths, results_dir, models_dir)
        metadata = result['metadata']
        assert metadata['model_name'] in (
            'Scratch Logistic Regression', 'Library Logistic Regression', 'Random Forest', 'XGBoost',
        )
        assert 'exposure_proxy' not in metadata['feature_columns']
        assert 'temp_anom_7d' not in metadata['feature_columns']
        artifact = Path(metadata['artifact'])
        assert artifact.is_file()
        assert joblib.load(artifact).predict_proba(pd.DataFrame(rows)[list(FEATURE_COLUMNS)].head(2)).shape == (2, 2)
        predictions = pd.read_csv(results_dir / f'test_predictions_{task}.csv.gz')
        assert {'world_id', 'seed', 'scenario', 'unit_id', 'date', 'label', 'score',
                'alert_f1', 'alert_target_recall'}.issubset(predictions.columns)
        assert len(predictions) == len(dates)
        assert {row['Split'] for row in result['metrics']} == {'test'}
