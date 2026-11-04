import numpy as np
import pandas as pd
from typing import Dict, List

def build_as_of_features(
    df_districts: pd.DataFrame,
    df_weather: pd.DataFrame,
    df_water: pd.DataFrame,
    df_surveillance: pd.DataFrame,
    prediction_dates: List[pd.Timestamp],
    adj_matrix: np.ndarray = None,
    unit_to_idx: Dict[str, int] = None
) -> pd.DataFrame:
    """
    Constructs weekly feature vectors strictly AS-OF prediction timestamp t.
    Uses fully vectorized time-series window operations for blazing speed and zero lookahead.
    Zero truth leakage: no unobserved concentrations or true case counts.
    """
    pred_set = set(pd.to_datetime(prediction_dates))

    # 1. Weather features (Vectorized)
    w = df_weather.copy()
    w['date'] = pd.to_datetime(w['date'])
    w = w.sort_values(['unit_id', 'date']).reset_index(drop=True)

    w_grp = w.groupby('unit_id', sort=False)
    w['rain_3d'] = w_grp['rainfall_mm'].transform(lambda s: s.rolling(3, min_periods=1).sum())
    w['rain_7d'] = w_grp['rainfall_mm'].transform(lambda s: s.rolling(7, min_periods=1).sum())
    w['rain_14d'] = w_grp['rainfall_mm'].transform(lambda s: s.rolling(14, min_periods=1).sum())
    w['rain_30d'] = w_grp['rainfall_mm'].transform(lambda s: s.rolling(30, min_periods=1).sum())

    w['temp_mean_7d'] = w_grp['temp_mean'].transform(lambda s: s.rolling(7, min_periods=1).mean())
    w['temp_max_7d'] = w_grp['temp_max'].transform(lambda s: s.rolling(7, min_periods=1).max())
    w['rel_humidity_7d'] = w_grp['rel_humidity'].transform(lambda s: s.rolling(7, min_periods=1).mean())
    w['heavy_rain_after_dry_7d'] = w_grp['heavy_rain_after_dry'].transform(lambda s: s.rolling(7, min_periods=1).max())

    # Filter weather down to prediction dates
    w_pred = w[w['date'].isin(pred_set)][[
        'date', 'unit_id', 'consec_dry_days', 'rain_3d', 'rain_7d', 'rain_14d', 'rain_30d',
        'temp_mean_7d', 'temp_max_7d', 'rel_humidity_7d', 'heavy_rain_after_dry_7d'
    ]].copy()

    # 2. Surveillance & Sensor features (Vectorized)
    s = df_surveillance.copy()
    s['date'] = pd.to_datetime(s['date'])
    s = s.sort_values(['unit_id', 'date']).reset_index(drop=True)

    s_grp = s.groupby('unit_id', sort=False)

    # Turbidity
    # Carry observations forward only. Backfilling would expose a future sensor
    # reading to an earlier prediction date.
    s['turbidity_last'] = s_grp['turbidity_ntu'].transform(lambda s: s.ffill().fillna(1.5))
    s['turbidity_mean_7d'] = s_grp['turbidity_ntu'].transform(lambda s: s.ffill().rolling(7, min_periods=1).mean().fillna(1.5))
    s['turbidity_max_7d'] = s_grp['turbidity_ntu'].transform(lambda s: s.ffill().rolling(7, min_periods=1).max().fillna(1.5))
    s['turb_is_exceed'] = (s['turbidity_ntu'].fillna(0) > 4.0).astype(int)
    s['turbidity_exceed_7d'] = s_grp['turb_is_exceed'].transform(lambda s: s.rolling(7, min_periods=1).sum())

    # Residual Chlorine
    s['chlorine_mean_7d'] = s_grp['residual_chlorine_mg_l'].transform(lambda s: s.ffill().rolling(7, min_periods=1).mean().fillna(0.8))
    s['chlor_is_depleted'] = (s['residual_chlorine_mg_l'].fillna(1.0) < 0.20).astype(int)
    s['chlorine_depleted_7d'] = s_grp['chlor_is_depleted'].transform(lambda s: s.rolling(7, min_periods=1).sum())

    # TDS
    s['tds_mean_7d'] = s_grp['tds_mg_l'].transform(lambda s: s.ffill().rolling(7, min_periods=1).mean().fillna(300.0))

    # Lab tests
    s['ecoli_last_cfu'] = s_grp['ecoli_cfu_100ml'].transform(lambda s: s.ffill().fillna(5.0))
    last_lab_date = s['date'].where(s['ecoli_cfu_100ml'].notna()).groupby(s['unit_id']).ffill()
    s['days_since_lab_test'] = (s['date'] - last_lab_date).dt.days.fillna(999).astype(int)
    s['ecoli_is_pos'] = (s['ecoli_cfu_100ml'].fillna(0) > 10.0).astype(int)
    s['ecoli_positive_30d'] = s_grp['ecoli_is_pos'].transform(lambda s: s.rolling(30, min_periods=1).sum())

    # ASHA & OPD signals
    s['asha_cases_3d'] = s_grp['asha_cases_reported'].transform(lambda s: s.rolling(3, min_periods=1).sum())
    s['asha_cases_7d'] = s_grp['asha_cases_reported'].transform(lambda s: s.rolling(7, min_periods=1).sum())
    s['asha_cases_14d'] = s_grp['asha_cases_reported'].transform(lambda s: s.rolling(14, min_periods=1).sum())
    s['asha_alert_7d'] = s_grp['asha_cluster_alert'].transform(lambda s: s.rolling(7, min_periods=1).max())

    s['opd_cases_7d'] = s_grp['opd_cases_logged'].transform(lambda s: s.rolling(7, min_periods=1).sum())
    s['opd_cases_14d'] = s_grp['opd_cases_logged'].transform(lambda s: s.rolling(14, min_periods=1).sum())
    s['opd_trend_7d'] = s['opd_cases_7d'] - (s['opd_cases_14d'] - s['opd_cases_7d'])

    s['idsp_alerts_28d'] = s_grp['idsp_outbreak_alert'].transform(lambda s: s.rolling(28, min_periods=1).sum())
    s['sensor_uptime_7d'] = s_grp['sensor_online'].transform(lambda s: s.rolling(7, min_periods=1).mean())

    # Filter surveillance down to prediction dates
    s_pred = s[s['date'].isin(pred_set)][[
        'date', 'unit_id', 'turbidity_last', 'turbidity_mean_7d', 'turbidity_max_7d', 'turbidity_exceed_7d',
        'chlorine_mean_7d', 'chlorine_depleted_7d', 'tds_mean_7d', 'ecoli_last_cfu', 'days_since_lab_test', 'ecoli_positive_30d',
        'asha_cases_3d', 'asha_cases_7d', 'asha_cases_14d', 'asha_alert_7d',
        'opd_cases_7d', 'opd_cases_14d', 'opd_trend_7d', 'idsp_alerts_28d', 'sensor_uptime_7d'
    ]].copy()

    # 3. Merge Weather, Surveillance, and Static District Traits
    merged = pd.merge(w_pred, s_pred, on=['date', 'unit_id'])
    # Static metadata assumed available from district surveys and water-source
    # registries. Hidden simulated treatment efficacy and reliability are not
    # provided to the predictor.
    dist_cols = ['unit_id', 'density_km2', 'sanitation_coverage', 'piped_share']
    merged = pd.merge(merged, df_districts[dist_cols], on='unit_id')

    # 4. Calendar
    doy = merged['date'].dt.dayofyear
    merged['season_sin'] = np.round(np.sin(2 * np.pi * doy / 365.25), 4)
    merged['season_cos'] = np.round(np.cos(2 * np.pi * doy / 365.25), 4)
    merged['month'] = merged['date'].dt.month

    merged = merged.rename(columns={
        'density_km2': 'pop_density',
        'sanitation_coverage': 'sanitation_cov'
    })

    # Return formatted features
    return merged
