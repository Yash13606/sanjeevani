import numpy as np
import pandas as pd
from typing import Dict, List

def compute_weekly_labels(
    df_truth: pd.DataFrame,
    df_outbreaks: pd.DataFrame,
    prediction_dates: List[pd.Timestamp]
) -> pd.DataFrame:
    """
    Computes M1 and M2 labels at prediction timestamps t:
      - M1-7d: onset in (t, t+7], with ACTIVE outbreaks excluded from the risk set
      - M1-14d: onset in (t, t+14], same exclusion
      - M1-Strict-7d: strict onset in (t, t+7], same exclusion
      - M2: active_asof_t (ground truth active outbreak at t)
      - M1 disease specific: cholera, add
    """
    outbreaks = df_outbreaks.copy()
    if not outbreaks.empty:
        outbreaks['op_start'] = pd.to_datetime(outbreaks['operational_start_date'])
        outbreaks['strict_start'] = pd.to_datetime(outbreaks['strict_start_date'])
        outbreaks['end'] = pd.to_datetime(outbreaks['end_date'])
        outbreaks_by_unit = {u: grp for u, grp in outbreaks.groupby('unit_id')}
    else:
        outbreaks_by_unit = {}

    truth = df_truth.copy()
    truth['date'] = pd.to_datetime(truth['date'])
    units = df_truth['unit_id'].unique()

    # Pre-map truth active status
    truth_active_map = truth.set_index(['unit_id', 'date'])['active_outbreak_operational'].to_dict()

    records = []
    pred_timestamps = [pd.to_datetime(t) for t in prediction_dates]

    for uid in units:
        unit_evts = outbreaks_by_unit.get(uid, None)

        # Pre-extract start dates as numpy arrays if unit has outbreaks
        has_evts = unit_evts is not None and not unit_evts.empty
        if has_evts:
            op_starts = unit_evts['op_start'].values
            strict_starts = unit_evts['strict_start'].values
            pathogens = unit_evts['primary_pathogen'].values

        for t_ts in pred_timestamps:
            t_val = np.datetime64(t_ts)
            t_plus_7 = np.datetime64(t_ts + pd.Timedelta(days=7))
            t_plus_14 = np.datetime64(t_ts + pd.Timedelta(days=14))

            is_active_t = truth_active_map.get((uid, t_ts), 0)
            in_m1_risk_set = (is_active_t == 0)

            onset_7d = 0
            onset_strict_7d = 0
            onset_14d = 0
            onset_cholera_7d = 0
            onset_add_7d = 0

            if has_evts:
                # Vectorized condition check using numpy
                mask_7d = (op_starts > t_val) & (op_starts <= t_plus_7)
                if np.any(mask_7d):
                    onset_7d = 1
                    matching_paths = pathogens[mask_7d]
                    if 'cholera' in matching_paths:
                        onset_cholera_7d = 1
                    if 'add' in matching_paths:
                        onset_add_7d = 1

                mask_sc = (strict_starts > t_val) & (strict_starts <= t_plus_7)
                if np.any(mask_sc):
                    onset_strict_7d = 1

                mask_14d = (op_starts > t_val) & (op_starts <= t_plus_14)
                if np.any(mask_14d):
                    onset_14d = 1

            records.append({
                'date': t_ts,
                'unit_id': uid,
                'in_m1_risk_set': 1 if in_m1_risk_set else 0,
                'label_m1_onset_7d': onset_7d if in_m1_risk_set else np.nan,
                'label_m1_strict_7d': onset_strict_7d if in_m1_risk_set else np.nan,
                'label_m1_onset_14d': onset_14d if in_m1_risk_set else np.nan,
                'label_m1_cholera_7d': onset_cholera_7d if in_m1_risk_set else np.nan,
                'label_m1_add_7d': onset_add_7d if in_m1_risk_set else np.nan,
                'label_m2_active': is_active_t
            })

    return pd.DataFrame(records)
