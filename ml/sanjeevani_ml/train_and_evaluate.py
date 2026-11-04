"""Generate synthetic worlds, train M1/M2, and evaluate held-out worlds."""

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score, brier_score_loss, f1_score, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from sanjeevani_ml.evaluation import (
    select_model_on_validation, select_validation_thresholds, split_seed_groups,
)
from sanjeevani_ml.event_metrics import aggregate_event_metrics, event_level_metrics
from sanjeevani_ml.pipeline import FEATURE_COLUMNS, TASKS, generate_cohorts, load_cohort, load_events
from sanjeevani_ml.scratch_logistic import ScratchLogisticRegression
from sanjeevani_sim.world import WorldSimulator


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def _code_hash() -> str:
    digest = hashlib.sha256()
    for path in sorted([*PROJECT_ROOT.joinpath('sanjeevani_ml').glob('*.py'),
                        *PROJECT_ROOT.joinpath('sanjeevani_sim').glob('*.py')]):
        digest.update(path.relative_to(PROJECT_ROOT).as_posix().encode('utf-8'))
        digest.update(path.read_bytes())
    return digest.hexdigest()


def _candidate_estimators() -> tuple[dict, list[str]]:
    """All preprocessing is fitted inside each training-world estimator."""
    models = {
        'Scratch Logistic Regression': ScratchLogisticRegression(
            learning_rate=0.04, epochs=25, batch_size=8192, l2=0.001, seed=42,
        ),
        'Library Logistic Regression': make_pipeline(
            SimpleImputer(strategy='median'), StandardScaler(),
            LogisticRegression(max_iter=1200, class_weight='balanced', random_state=42),
        ),
        'Random Forest': make_pipeline(
            SimpleImputer(strategy='median'),
            RandomForestClassifier(
                n_estimators=120, max_depth=8, class_weight='balanced',
                random_state=42, n_jobs=-1,
            ),
        ),
    }
    skipped = []
    try:
        from xgboost import XGBClassifier
    except ImportError:
        skipped.append('XGBoost unavailable: package not installed')
    else:
        models['XGBoost'] = make_pipeline(
            SimpleImputer(strategy='median'),
            XGBClassifier(
                n_estimators=120, max_depth=5, learning_rate=0.08,
                eval_metric='logloss', random_state=42, n_jobs=4,
            ),
        )
    return models, skipped


def _seasonal_scores(frame: pd.DataFrame, month_rates: dict, fallback: float) -> np.ndarray:
    return frame['month'].map(month_rates).fillna(fallback).to_numpy(dtype=float)


def _heuristic_scores(frame: pd.DataFrame) -> np.ndarray:
    return ((frame['heavy_rain_after_dry_7d'] == 1) &
            (frame['turbidity_mean_7d'] > 3.0)).to_numpy(dtype=float)


def _metric_row(task: str, name: str, scenario: str, frame: pd.DataFrame,
                scores: np.ndarray, operating: dict, selected: bool) -> dict:
    y = frame['label'].to_numpy(dtype=int)
    scores = np.asarray(scores, dtype=float)
    f1_alerts = (scores >= operating['f1_threshold']).astype(int)
    recall_alerts = (scores >= operating['target_recall_threshold']).astype(int)
    positives = int(y.sum())
    false_alarms = int(((recall_alerts == 1) & (y == 0)).sum())
    # Each row is one district-week; 4.33 weeks represent a district-month.
    district_months = len(y) / 4.33
    return {
        'Task': task.upper(), 'Model': name, 'Scenario': scenario, 'Split': 'test',
        'Rows': len(y), 'Positives': positives, 'Prevalence': positives / len(y),
        'AveragePrecision': float(average_precision_score(y, scores)) if positives else None,
        'ROCAUC': float(roc_auc_score(y, scores)) if len(np.unique(y)) == 2 else None,
        'Brier': float(brier_score_loss(y, scores)),
        'F1AtValThreshold': float(f1_score(y, f1_alerts, zero_division=0)),
        'PrecisionAtValThreshold': float(precision_score(y, f1_alerts, zero_division=0)),
        'RecallAtValThreshold': float(recall_score(y, f1_alerts, zero_division=0)),
        'PrecisionAtValRecallThreshold': float(precision_score(y, recall_alerts, zero_division=0)),
        'RecallAtValRecallThreshold': float(recall_score(y, recall_alerts, zero_division=0)),
        'FalseAlarmsPerDistrictMonth': false_alarms / district_months,
        'ValidationF1Threshold': operating['f1_threshold'],
        'ValidationTargetRecallThreshold': operating['target_recall_threshold'],
        'Selected': selected,
    }


def train_and_evaluate_task(task: str, cohort_paths: dict, event_paths: dict,
                            results_dir: Path, models_dir: Path) -> dict:
    """Select model/threshold on validation, then open held-out test labels."""
    spec = TASKS[task]
    label = spec['label']
    train = load_cohort(cohort_paths['train'], label, spec['risk_set']).rename(columns={label: 'label'})
    val = load_cohort(cohort_paths['val'], label, spec['risk_set']).rename(columns={label: 'label'})
    y_train = train['label'].to_numpy(dtype=int)
    y_val = val['label'].to_numpy(dtype=int)
    if len(np.unique(y_train)) != 2:
        raise ValueError(f'{task}: training worlds need both label classes')
    if len(np.unique(y_val)) != 2:
        raise ValueError(f'{task}: validation worlds need both label classes to select thresholds')
    x_train = train[list(FEATURE_COLUMNS)]
    x_val = val[list(FEATURE_COLUMNS)]

    month_rates = train.groupby('month')['label'].mean().to_dict()
    train_prevalence = float(y_train.mean())
    validation_scores = {
        'Seasonal Baseline': _seasonal_scores(val, month_rates, train_prevalence),
        'Heuristic Rule': _heuristic_scores(val),
    }
    models, skipped = _candidate_estimators()
    for name, estimator in models.items():
        print(f'  {task.upper()}: fitting {name} on training worlds...')
        estimator.fit(x_train, y_train)
        validation_scores[name] = estimator.predict_proba(x_val)[:, 1]
    chosen, validation_ap = select_model_on_validation(
        y_val, {name: validation_scores[name] for name in models},
    )
    operating = {
        name: select_validation_thresholds(y_val, scores, spec['target_recall'])
        for name, scores in validation_scores.items()
    }
    print(f'  {task.upper()}: selected {chosen} by validation AP={validation_ap[chosen]:.4f}; '
          f'F1 threshold={operating[chosen]["f1_threshold"]:.4f}')

    # Test is loaded only after all model and threshold decisions are fixed.
    test = load_cohort(cohort_paths['test'], label, spec['risk_set']).rename(columns={label: 'label'})
    x_test = test[list(FEATURE_COLUMNS)]
    test_scores = {
        'Seasonal Baseline': _seasonal_scores(test, month_rates, train_prevalence),
        'Heuristic Rule': _heuristic_scores(test),
    }
    for name, estimator in models.items():
        test_scores[name] = estimator.predict_proba(x_test)[:, 1]

    metric_rows = []
    for name, scores in test_scores.items():
        for scenario in ['all', *sorted(test['scenario'].unique())]:
            mask = np.ones(len(test), dtype=bool) if scenario == 'all' else test['scenario'].to_numpy() == scenario
            metric_rows.append(_metric_row(
                task, name, scenario, test.loc[mask], scores[mask],
                operating[name], name == chosen,
            ))

    selected_scores = test_scores[chosen]
    predictions = test[['world_id', 'seed', 'scenario', 'unit_id', 'date', 'label']].copy()
    predictions['label'] = predictions['label'].astype(int)
    predictions['score'] = selected_scores
    predictions['alert_f1'] = (selected_scores >= operating[chosen]['f1_threshold']).astype(int)
    predictions['alert_target_recall'] = (
        selected_scores >= operating[chosen]['target_recall_threshold']
    ).astype(int)
    prediction_path = results_dir / f'test_predictions_{task}.csv.gz'
    predictions.to_csv(prediction_path, index=False, compression='gzip')

    events = load_events(event_paths['test'])
    world_events, event_details = event_level_metrics(predictions, events, task)
    event_summary = aggregate_event_metrics(world_events, event_details)
    artifact_path = models_dir / f'{task}.joblib'
    joblib.dump(models[chosen], artifact_path, compress=3)
    metadata = {
        'task': task.upper(), 'label': label, 'target_definition': spec['description'],
        'model_name': chosen, 'feature_columns': list(FEATURE_COLUMNS),
        'validation_average_precision': validation_ap[chosen],
        'validation_candidate_average_precision': validation_ap,
        'validation_f1_threshold': operating[chosen]['f1_threshold'],
        'validation_target_recall_threshold': operating[chosen]['target_recall_threshold'],
        'target_recall': spec['target_recall'],
        'artifact': str(artifact_path), 'artifact_sha256': _file_hash(artifact_path),
        'test_predictions': str(prediction_path),
        'train_rows': len(train), 'validation_rows': len(val), 'test_rows': len(test),
        'train_positive': int(y_train.sum()), 'validation_positive': int(y_val.sum()),
        'test_positive': int(test['label'].sum()), 'skipped_candidates': skipped,
    }
    return {'metrics': metric_rows, 'event_summary': event_summary,
            'world_events': world_events, 'event_details': event_details,
            'metadata': metadata}


def run_end_to_end_pipeline(config_path: str | Path | None = None,
                            output_dir: str | Path | None = None) -> dict:
    config_file = Path(config_path or PROJECT_ROOT / 'config' / 'simulation_config.yaml').expanduser().resolve()
    output_root = Path(output_dir or PROJECT_ROOT).expanduser().resolve()
    sim = WorldSimulator(str(config_file))
    if not Path(sim.units_yaml).is_file():
        raise FileNotFoundError(f'units file not found: {sim.units_yaml}')
    if not sim.config.get('surveillance_scenarios'):
        raise ValueError('at least one surveillance scenario is required')
    seed_groups = split_seed_groups(sim.config)
    config_hash = _file_hash(config_file)
    code_hash = _code_hash()
    version = re.sub(r'[^A-Za-z0-9._-]', '_', str(sim.config['system']['version']))
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '_' + config_hash[:8]
    results_dir = output_root / 'results'
    models_dir = output_root / 'models' / version / run_id
    results_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)

    print(f'Synthetic outbreak benchmark: config={config_file}, output={output_root}')
    print(f'Splits: { {name: len(seeds) for name, seeds in seed_groups.items()} } worlds; '
          f'scenarios={list(sim.config["surveillance_scenarios"])}')
    cohort_paths, event_paths = generate_cohorts(sim, seed_groups, output_root)
    outputs = {
        task: train_and_evaluate_task(task, cohort_paths, event_paths, results_dir, models_dir)
        for task in TASKS
    }

    metrics = pd.DataFrame([row for output in outputs.values() for row in output['metrics']])
    metrics_path = results_dir / 'benchmark_metrics_summary.csv'
    metrics.to_csv(metrics_path, index=False)
    event_summary = pd.concat([output['event_summary'] for output in outputs.values()], ignore_index=True)
    event_summary_path = results_dir / 'event_metrics_summary.csv'
    event_summary.to_csv(event_summary_path, index=False)
    world_events = pd.concat([output['world_events'] for output in outputs.values()], ignore_index=True)
    world_events.to_csv(results_dir / 'event_metrics_by_world.csv', index=False)
    event_details = pd.concat([output['event_details'] for output in outputs.values()], ignore_index=True)
    event_details.to_csv(results_dir / 'event_details.csv.gz', index=False, compression='gzip')

    model_manifest = {
        'schema_version': 1, 'run_id': run_id, 'project_version': version,
        'data_type': 'synthetic simulation', 'config_file': str(config_file),
        'config_sha256': config_hash, 'code_sha256': code_hash,
        'created_utc': datetime.now(timezone.utc).isoformat(),
        'split_seeds': {name: list(seeds) for name, seeds in seed_groups.items()},
        'scenario_names': list(sim.config['surveillance_scenarios']),
        'python_version': sys.version.split()[0], 'sklearn_version': sklearn.__version__,
        'models': {task: output['metadata'] for task, output in outputs.items()},
    }
    model_manifest_path = models_dir / 'manifest.json'
    model_manifest_path.write_text(json.dumps(model_manifest, indent=2), encoding='utf-8')
    run_manifest = {
        'schema_version': 1, 'status': 'completed_simulated',
        'data_type': 'synthetic simulation', 'run_id': run_id,
        'config_sha256': config_hash, 'code_sha256': code_hash,
        'split_seeds': model_manifest['split_seeds'],
        'scenario_names': model_manifest['scenario_names'],
        'cohort_files': {name: [str(path) for path in paths] for name, paths in cohort_paths.items()},
        'event_files': {name: [str(path) for path in paths] for name, paths in event_paths.items()},
        'metrics_csv': str(metrics_path), 'event_metrics_csv': str(event_summary_path),
        'model_manifest': str(model_manifest_path),
        'prediction_files': {task: output['metadata']['test_predictions'] for task, output in outputs.items()},
    }
    run_manifest_path = results_dir / 'run_manifest.json'
    run_manifest_path.write_text(json.dumps(run_manifest, indent=2), encoding='utf-8')
    print(f'Completed synthetic benchmark. Manifest: {run_manifest_path}')
    return run_manifest


def main() -> None:
    parser = argparse.ArgumentParser(description='Run the simulated Sanjeevani M1/M2 benchmark')
    parser.add_argument('--config', default=str(PROJECT_ROOT / 'config' / 'simulation_config.yaml'))
    parser.add_argument('--output-dir', default=str(PROJECT_ROOT),
                        help='run root for ml_datasets/, results/, and versioned models/')
    args = parser.parse_args()
    run_end_to_end_pipeline(args.config, args.output_dir)


if __name__ == '__main__':
    main()
