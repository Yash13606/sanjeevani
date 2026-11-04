"""Build point-in-time synthetic cohorts one world at a time."""

from pathlib import Path

import pandas as pd

from sanjeevani_ml.features import build_as_of_features
from sanjeevani_ml.labels import compute_weekly_labels
from sanjeevani_sim.districts import generate_world_districts


FEATURE_COLUMNS = (
    'season_sin', 'season_cos', 'month',
    'rain_3d', 'rain_7d', 'rain_14d', 'rain_30d',
    'temp_mean_7d', 'temp_max_7d', 'rel_humidity_7d',
    'consec_dry_days', 'heavy_rain_after_dry_7d',
    'turbidity_last', 'turbidity_mean_7d', 'turbidity_max_7d', 'turbidity_exceed_7d',
    'chlorine_mean_7d', 'chlorine_depleted_7d', 'tds_mean_7d',
    'ecoli_last_cfu', 'days_since_lab_test', 'ecoli_positive_30d',
    'asha_cases_3d', 'asha_cases_7d', 'asha_cases_14d', 'asha_alert_7d',
    'opd_cases_7d', 'opd_cases_14d', 'opd_trend_7d', 'idsp_alerts_28d',
    'pop_density', 'sanitation_cov', 'piped_share', 'sensor_uptime_7d',
)

TASKS = {
    'm1': {
        'label': 'label_m1_onset_7d',
        'description': 'Operational outbreak onset in (t, t+7] among units not active at t',
        'risk_set': 'in_m1_risk_set',
        'target_recall': 0.75,
    },
    'm2': {
        'label': 'label_m2_active',
        'description': 'Operational outbreak active as of observation date t',
        'risk_set': None,
        'target_recall': 0.85,
    },
}


def prediction_dates(truth: pd.DataFrame, system: dict) -> list[pd.Timestamp]:
    """Return configured weekdays with complete 14-day label follow-up."""
    burn_in = system['burn_in_days']
    interval = system['prediction_interval_days']
    weekday = system['prediction_day_of_week']
    if type(burn_in) is not int or burn_in < 1:
        raise ValueError('burn_in_days must be a positive integer')
    if type(interval) is not int or interval < 7 or interval % 7:
        raise ValueError('prediction_interval_days must be a positive multiple of 7')
    if type(weekday) is not int or not 0 <= weekday <= 6:
        raise ValueError('prediction_day_of_week must be an integer from 0 to 6')

    dates = pd.DatetimeIndex(pd.to_datetime(truth['date'].drop_duplicates().sort_values()))
    if len(dates) <= burn_in + 14:
        raise ValueError('world is too short for burn-in and 14-day label follow-up')
    last_with_follow_up = dates[-1] - pd.Timedelta(days=14)
    weekly = [day for day in dates[burn_in:] if day.weekday() == weekday and day <= last_with_follow_up]
    selected = weekly[::interval // 7]
    if not selected:
        raise ValueError('no prediction dates after burn-in with complete follow-up')
    return selected


def generate_world_cohort(sim, seed: int, split: str, output_root: Path) -> tuple[list[Path], Path]:
    """Simulate a world once, then save each surveillance scenario separately."""
    world_id = f'world_{seed}'
    world = sim.simulate_world(world_id, seed=seed)
    dates = prediction_dates(world['daily_truth'], sim.config['system'])
    labels = compute_weekly_labels(world['daily_truth'], world['outbreak_events'], dates)
    _, adjacency, unit_to_idx = generate_world_districts(sim.units_yaml, seed)

    split_dir = output_root / 'ml_datasets' / 'worlds' / split
    split_dir.mkdir(parents=True, exist_ok=True)
    events = world['outbreak_events'].copy()
    events['world_id'] = world_id
    events['seed'] = seed
    events['split'] = split
    event_path = split_dir / f'events_{seed}.csv.gz'
    events.to_csv(event_path, index=False, compression='gzip')

    cohort_paths = []
    expected_rows = len(world['districts']) * len(dates)
    for scenario in sim.config['surveillance_scenarios']:
        features = build_as_of_features(
            world['districts'], world['weather'], world['water'],
            world[f'surveillance_{scenario}'], dates, adjacency, unit_to_idx,
        )
        cohort = features.merge(labels, on=['unit_id', 'date'], validate='one_to_one')
        if len(cohort) != expected_rows:
            raise ValueError(
                f'{world_id}/{scenario}: expected {expected_rows} district-week rows; got {len(cohort)}'
            )
        missing = set(FEATURE_COLUMNS).difference(cohort.columns)
        if missing:
            raise ValueError(f'{world_id}/{scenario}: missing features {sorted(missing)}')
        cohort['world_id'] = world_id
        cohort['seed'] = seed
        cohort['split'] = split
        cohort['scenario'] = scenario
        path = split_dir / f'world_{seed}_{scenario}.csv.gz'
        cohort.to_csv(path, index=False, compression='gzip')
        cohort_paths.append(path)
    return cohort_paths, event_path


def generate_cohorts(sim, seed_groups: dict, output_root: Path) -> tuple[dict, dict]:
    """Stream generated cohorts to disk; never retain multiple full worlds."""
    cohort_paths = {name: [] for name in seed_groups}
    event_paths = {name: [] for name in seed_groups}
    for split, seeds in seed_groups.items():
        for seed in seeds:
            print(f'Generating {split} synthetic world {seed}...')
            cohorts, events = generate_world_cohort(sim, seed, split, output_root)
            cohort_paths[split].extend(cohorts)
            event_paths[split].append(events)
    return cohort_paths, event_paths


def load_cohort(paths: list[Path], label: str, risk_set: str | None) -> pd.DataFrame:
    """Load only columns needed for one task, omitting non-risk M1 rows."""
    columns = ['world_id', 'seed', 'scenario', 'unit_id', 'date', label, *FEATURE_COLUMNS]
    if risk_set:
        columns.append(risk_set)
    frames = [pd.read_csv(path, usecols=columns, parse_dates=['date']) for path in paths]
    if not frames:
        raise ValueError('cohort split is empty')
    cohort = pd.concat(frames, ignore_index=True)
    if risk_set:
        cohort = cohort.loc[cohort[risk_set] == 1].drop(columns=risk_set)
    cohort = cohort.loc[cohort[label].notna()].reset_index(drop=True)
    if cohort.empty:
        raise ValueError(f'no eligible rows for {label}')
    return cohort


def load_events(paths: list[Path]) -> pd.DataFrame:
    frames = [pd.read_csv(path) for path in paths]
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
