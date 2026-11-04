import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from zlib import crc32


def scenario_rng_seed(seed: int, scenario_name: str) -> int:
    """Stable seed across Python processes, unlike the randomized built-in hash()."""
    return int(seed) + 404 + crc32(scenario_name.encode('utf-8'))

def simulate_surveillance_layer(
    df_districts: pd.DataFrame,
    df_water_daily: pd.DataFrame,
    df_daily_truth: pd.DataFrame,
    df_outbreak_events: pd.DataFrame,
    scenario_name: str,
    seed: int,
    config: Dict
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Simulates observation channels: sensors, lab sampling, ASHA reports, OPD lags, IDSP reports.
    Computes first-report timestamps and the M2 'active_unreported_asof_t' label.
    The true outbreak process is completely untouched and identical across scenarios.
    """
    rng = np.random.default_rng(scenario_rng_seed(seed, scenario_name))
    s_cfg = config['surveillance_scenarios'][scenario_name]

    sensor_cov = s_cfg['sensor_coverage']
    sensor_noise_sd = s_cfg['sensor_noise_sd']
    sensor_uptime = s_cfg['sensor_uptime']
    lab_freq = s_cfg['lab_test_frequency_days']
    asha_prob = s_cfg['asha_case_report_prob']
    asha_thresh = s_cfg['asha_cluster_alert_threshold']
    opd_lag_mean = s_cfg['opd_reporting_lag_days_mean']
    idsp_delay_mean = s_cfg['idsp_bulletin_delay_days_mean']
    idsp_comp = s_cfg['idsp_reporting_completeness']

    merged = pd.merge(df_daily_truth, df_water_daily, on=['unit_id', 'date'])
    units = df_districts['unit_id'].values
    dates = merged['date'].drop_duplicates().sort_values().values
    total_days = len(dates)

    # Pre-determine which districts have water sensors installed in this scenario
    has_sensor = {u: (rng.random() < sensor_cov) for u in units}

    surveillance_records = []

    # Empty worlds still need the event schema for the per-unit filters below.
    events = df_outbreak_events.reindex(columns=[
        'outbreak_id', 'unit_id', 'operational_start_date', 'end_date',
    ]).copy()

    # Track first detection date per outbreak event
    outbreak_first_reports = {}
    for _, evt in events.iterrows():
        outbreak_first_reports[evt['outbreak_id']] = None

    # Process district by district
    for _, dist in df_districts.iterrows():
        uid = dist['unit_id']
        sub = merged[merged['unit_id'] == uid].sort_values('date').reset_index(drop=True)

        c_piped = sub['c_piped'].values
        c_ground = sub['c_groundwater'].values
        true_cases = sub['true_cases_total'].values
        true_active = sub['active_outbreak_operational'].values

        # 1. Sensor observations
        sensor_active = has_sensor[uid]
        obs_turbidity = np.full(total_days, np.nan, dtype=np.float64)
        obs_chlorine = np.full(total_days, np.nan, dtype=np.float64)
        obs_tds = np.full(total_days, np.nan, dtype=np.float64)
        obs_ecoli_lab = np.full(total_days, np.nan, dtype=np.float64)
        sensor_online = np.zeros(total_days, dtype=np.int32)

        for t in range(total_days):
            if sensor_active and (rng.random() < sensor_uptime):
                sensor_online[t] = 1
                # Latent concentration drives turbidity
                base_turb = 1.2 + 2.8 * c_piped[t]
                turb = base_turb * np.exp(rng.normal(0.0, sensor_noise_sd))
                obs_turbidity[t] = round(max(0.1, turb), 2)

                # Residual chlorine drops when contamination consumes it
                chlor = max(0.02, 0.85 - 0.25 * c_piped[t] + rng.normal(0.0, 0.05))
                obs_chlorine[t] = round(chlor, 2)

                # TDS
                tds = 280.0 + 80.0 * c_ground[t] + rng.normal(0.0, 15.0)
                obs_tds[t] = round(max(50.0, tds), 1)

            # Lab sampling
            if t % lab_freq == 0:
                # E. coli CFU / 100mL
                base_ecoli = 5.0 + 45.0 * max(c_piped[t], c_ground[t])
                ecoli_val = float(rng.gamma(shape=2.0, scale=base_ecoli / 2.0))
                obs_ecoli_lab[t] = round(ecoli_val, 1)

        # 2. ASHA community surveillance
        asha_cases = np.zeros(total_days, dtype=np.int32)
        asha_alerts = np.zeros(total_days, dtype=np.int32)
        for t in range(total_days):
            if true_cases[t] > 0:
                asha_cases[t] = rng.binomial(true_cases[t], asha_prob)

            # 3-day window alert trigger
            past_3d = np.sum(asha_cases[max(0, t - 2) : t + 1])
            if past_3d >= asha_thresh:
                asha_alerts[t] = 1

        # 3. OPD cases with reporting delay
        opd_logged = np.zeros(total_days, dtype=np.int32)
        for t in range(total_days):
            if true_cases[t] > 0:
                opd_fraction = rng.binomial(true_cases[t], 0.65)
                if opd_fraction > 0:
                    delays = np.clip(np.round(rng.lognormal(np.log(opd_lag_mean), 0.35, opd_fraction)).astype(int), 1, 14)
                    for d in delays:
                        if t + d < total_days:
                            opd_logged[t + d] += 1

        # 4. IDSP reporting bulletin (weekly aggregation with delay)
        idsp_reports = np.zeros(total_days, dtype=np.int32)
        for _, evt in events[events['unit_id'] == uid].iterrows():
            evt_id = evt['outbreak_id']
            op_start_dt = pd.to_datetime(evt['operational_start_date'])
            # Find day index of operational start
            dt_idx_arr = np.where(dates == op_start_dt)[0]
            if len(dt_idx_arr) > 0:
                start_idx = dt_idx_arr[0]
                # Is it reported in IDSP?
                if rng.random() < idsp_comp:
                    delay_days = int(np.clip(rng.lognormal(np.log(idsp_delay_mean), 0.40), 3, 28))
                    rep_idx = start_idx + delay_days
                    if rep_idx < total_days:
                        idsp_reports[rep_idx] = 1
                        outbreak_first_reports[evt_id] = dates[rep_idx]

        # 5. Assemble this unit's daily surveillance and report state.
        is_unrep_arr = np.zeros(total_days, dtype=np.int32)
        unit_events = events[events['unit_id'] == uid]
        for _, u_evt in unit_events.iterrows():
            evt_id = u_evt['outbreak_id']
            st_dt = pd.to_datetime(u_evt['operational_start_date'])
            en_dt = pd.to_datetime(u_evt['end_date'])
            f_rep = outbreak_first_reports.get(evt_id)

            st_indices = np.where(dates == st_dt)[0]
            en_indices = np.where(dates == en_dt)[0]
            if len(st_indices) > 0 and len(en_indices) > 0:
                s_i = st_indices[0]
                e_i = en_indices[0]
                if f_rep is None:
                    is_unrep_arr[s_i : e_i + 1] = 1
                else:
                    rep_indices = np.where(dates == f_rep)[0]
                    if len(rep_indices) > 0:
                        r_i = min(rep_indices[0], e_i + 1)
                        if r_i > s_i:
                            is_unrep_arr[s_i : r_i] = 1

        for t in range(total_days):
            cur_dt = dates[t]
            surveillance_records.append({
                'date': cur_dt,
                'unit_id': uid,
                'scenario': scenario_name,
                'sensor_online': sensor_online[t],
                'turbidity_ntu': obs_turbidity[t],
                'residual_chlorine_mg_l': obs_chlorine[t],
                'tds_mg_l': obs_tds[t],
                'ecoli_cfu_100ml': obs_ecoli_lab[t],
                'asha_cases_reported': asha_cases[t],
                'asha_cluster_alert': asha_alerts[t],
                'opd_cases_logged': opd_logged[t],
                'idsp_outbreak_alert': idsp_reports[t],
                'active_unreported_asof_t': is_unrep_arr[t]
            })

    df_surveillance = pd.DataFrame(surveillance_records)

    # Update outbreak events with first report date for this scenario
    df_events_updated = df_outbreak_events.copy()
    if 'outbreak_id' not in df_events_updated:
        df_events_updated['outbreak_id'] = pd.Series(dtype='object')
    df_events_updated[f'first_report_date_{scenario_name}'] = df_events_updated['outbreak_id'].map(outbreak_first_reports)

    return df_surveillance, df_events_updated
