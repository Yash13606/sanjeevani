import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

def simulate_disease_engine(
    df_districts: pd.DataFrame,
    df_water_daily: pd.DataFrame,
    adj_matrix: np.ndarray,
    unit_id_to_idx: Dict[str, int],
    total_days: int,
    seed: int,
    config: Dict
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Mechanistic disease transmission engine:
    Exposure -> Infection (Binomial with competing hazard) -> Incubation -> Symptomatic Cases -> Recovery.
    Maintains exact causality (cases appear strictly after infection date + incubation).
    Evaluates both Operational and Strict outbreak definitions with sustained recovery window.
    """
    rng = np.random.default_rng(seed + 303)
    n_units = len(df_districts)
    dates = df_water_daily['date'].drop_duplicates().sort_values().values

    # Pre-index exposure by unit index and day
    exposure_matrix = np.zeros((n_units, total_days), dtype=np.float64)
    water_indexed = df_water_daily.sort_values(['unit_id', 'date']).reset_index(drop=True)
    for u_idx, dist in df_districts.iterrows():
        uid = dist['unit_id']
        sub = water_indexed[water_indexed['unit_id'] == uid]
        exposure_matrix[u_idx, :] = sub['effective_exposure_E'].values

    # Parameters
    d_cfg = config['disease_engine']
    beta_env_cholera = d_cfg['beta_env_cholera']
    beta_env_add = d_cfg['beta_env_add']
    beta_p2p_cholera = d_cfg['beta_p2p_cholera']
    beta_p2p_add = d_cfg['beta_p2p_add']
    beta_nbr_cholera = d_cfg['beta_nbr_cholera']
    beta_nbr_add = d_cfg['beta_nbr_add']

    # Disease specific profiles
    cholera_p_symp = d_cfg['cholera']['symptomatic_ratio']
    add_p_symp = d_cfg['add']['symptomatic_ratio']

    # Generation interval weights for person-to-person spread (sum to 1)
    # Days 1 to 7: peak infectiousness at days 2-3
    g_weights = np.array([0.15, 0.35, 0.25, 0.12, 0.07, 0.04, 0.02], dtype=np.float64)

    # State arrays per unit and day
    pop_vec = df_districts['population'].values.astype(np.float64)

    # Susceptible populations (starts at ~85-95% of pop)
    S_cholera = np.zeros((n_units, total_days + 14), dtype=np.float64)
    S_add = np.zeros((n_units, total_days + 14), dtype=np.float64)
    for i in range(n_units):
        S_cholera[i, 0] = pop_vec[i] * rng.uniform(0.85, 0.95)
        S_add[i, 0] = pop_vec[i] * rng.uniform(0.75, 0.88)

    # Symptomatic case counts: padded to allow incubation beyond total_days
    cases_cholera = np.zeros((n_units, total_days + 14), dtype=np.int32)
    cases_add = np.zeros((n_units, total_days + 14), dtype=np.int32)
    infections_cholera = np.zeros((n_units, total_days), dtype=np.int32)
    infections_add = np.zeros((n_units, total_days), dtype=np.int32)

    # Daily time stepping
    for t in range(total_days):
        # 1. Active infectious load from past 7 days
        act_cases_cholera = np.zeros(n_units, dtype=np.float64)
        act_cases_add = np.zeros(n_units, dtype=np.float64)
        for k in range(7):
            past_day = t - 1 - k
            if past_day >= 0:
                act_cases_cholera += cases_cholera[:, past_day] * g_weights[k]
                act_cases_add += cases_add[:, past_day] * g_weights[k]

        # 2. Neighbour importation load
        # adj_matrix: (n_units, n_units), dot with (act_cases / pop)
        norm_load_cholera = act_cases_cholera / np.maximum(1000.0, pop_vec)
        norm_load_add = act_cases_add / np.maximum(1000.0, pop_vec)
        nbr_load_cholera = np.dot(adj_matrix, norm_load_cholera)
        nbr_load_add = np.dot(adj_matrix, norm_load_add)

        # 3. Combined competing hazard calculation
        # Cholera
        lam_env_c = beta_env_cholera * exposure_matrix[:, t]
        lam_p2p_c = beta_p2p_cholera * norm_load_cholera
        lam_nbr_c = beta_nbr_cholera * nbr_load_cholera
        lam_total_c = lam_env_c + lam_p2p_c + lam_nbr_c
        p_inf_c = 1.0 - np.exp(-lam_total_c)

        # ADD
        lam_env_a = beta_env_add * exposure_matrix[:, t]
        lam_p2p_a = beta_p2p_add * norm_load_add
        lam_nbr_a = beta_nbr_add * nbr_load_add
        lam_total_a = lam_env_a + lam_p2p_a + lam_nbr_a
        p_inf_a = 1.0 - np.exp(-lam_total_a)

        # 4. Stochastic infection generation
        for i in range(n_units):
            # Cholera infections
            s_c = int(S_cholera[i, t])
            new_inf_c = rng.binomial(s_c, min(1.0, max(0.0, p_inf_c[i]))) if s_c > 0 else 0
            infections_cholera[i, t] = new_inf_c

            # ADD infections
            s_a = int(S_add[i, t])
            new_inf_a = rng.binomial(s_a, min(1.0, max(0.0, p_inf_a[i]))) if s_a > 0 else 0
            infections_add[i, t] = new_inf_a

            # 5. Incubation and symptomatic delay (STRICT CAUSALITY)
            # Cholera incubation: LogNormal(mu=0.3365, sigma=0.65)
            if new_inf_c > 0:
                symp_count_c = rng.binomial(new_inf_c, cholera_p_symp)
                if symp_count_c > 0:
                    delays_c = np.clip(np.round(rng.lognormal(0.3365, 0.65, symp_count_c)).astype(int), 1, 6)
                    binc = np.bincount(delays_c, minlength=7)
                    for d_val in range(1, len(binc)):
                        if binc[d_val] > 0:
                            cases_cholera[i, t + d_val] += binc[d_val]

            # ADD incubation: LogNormal(mu=0.6931, sigma=0.50)
            if new_inf_a > 0:
                symp_count_a = rng.binomial(new_inf_a, add_p_symp)
                if symp_count_a > 0:
                    delays_a = np.clip(np.round(rng.lognormal(0.6931, 0.50, symp_count_a)).astype(int), 1, 7)
                    bina = np.bincount(delays_a, minlength=8)
                    for d_val in range(1, len(bina)):
                        if bina[d_val] > 0:
                            cases_add[i, t + d_val] += bina[d_val]

            # 6. Susceptible update with waning immunity replenishment
            waning_c = (pop_vec[i] - S_cholera[i, t]) / d_cfg['cholera']['immunity_waning_days_mean']
            S_cholera[i, t + 1] = np.clip(S_cholera[i, t] - new_inf_c + waning_c, 100.0, pop_vec[i])

            waning_a = (pop_vec[i] - S_add[i, t]) / d_cfg['add']['immunity_waning_days_mean']
            S_add[i, t + 1] = np.clip(S_add[i, t] - new_inf_a + waning_a, 100.0, pop_vec[i])

    # Trim cases back to total_days
    cases_cholera = cases_cholera[:, :total_days]
    cases_add = cases_add[:, :total_days]
    cases_total = cases_cholera + cases_add

    # 7. Outbreak Start and End Evaluation (Operational & Strict)
    outbreak_events = []
    active_operational = np.zeros((n_units, total_days), dtype=np.int32)
    active_strict = np.zeros((n_units, total_days), dtype=np.int32)

    # Thresholds: district-specific baselines
    k_min_cholera = d_cfg['cholera']['operational_threshold_cases_7d']
    k_min_add = d_cfg['add']['operational_threshold_cases_7d']
    k_min_combined = 10
    recovery_window = d_cfg['sustained_recovery_days']

    outbreak_id_counter = 1

    for i in range(n_units):
        uid = df_districts.iloc[i]['unit_id']
        pop = pop_vec[i]

        # Rolling 7-day cases
        roll_7d_total = pd.Series(cases_total[i, :]).rolling(7, min_periods=1).sum().values
        roll_7d_cholera = pd.Series(cases_cholera[i, :]).rolling(7, min_periods=1).sum().values
        roll_7d_add = pd.Series(cases_add[i, :]).rolling(7, min_periods=1).sum().values

        # Empirical baseline in this unit
        # Fix the operational threshold from the pre-evaluation burn-in only.
        # Using the full simulated future here would change past event labels.
        burn_in = min(config['system']['burn_in_days'], total_days)
        baseline_cases = roll_7d_total[:burn_in]
        mu_base = np.percentile(baseline_cases, 25)
        sigma_base = max(1.0, np.std(baseline_cases))
        thresh_operational = max(k_min_combined, mu_base + 2.5 * sigma_base)
        thresh_end = mu_base + 0.5 * sigma_base

        is_in_outbreak = False
        op_start_day = -1
        strict_start_day = -1
        consec_below_end = 0
        current_event_cases = []

        for t in range(total_days):
            current_7d = roll_7d_total[t]

            if not is_in_outbreak:
                if current_7d >= thresh_operational:
                    is_in_outbreak = True
                    op_start_day = t
                    # Strict start: trace backwards over past 7 days to the first symptomatic case
                    strict_start_day = t
                    for b in range(max(0, t - 7), t + 1):
                        if cases_total[i, b] > 0:
                            strict_start_day = b
                            break
                    consec_below_end = 0
                    current_event_cases = [cases_total[i, t]]
            else:
                current_event_cases.append(cases_total[i, t])
                if current_7d <= thresh_end:
                    consec_below_end += 1
                else:
                    consec_below_end = 0

                if consec_below_end >= recovery_window or t == total_days - 1:
                    is_in_outbreak = False
                    end_day = t - consec_below_end if t < total_days - 1 else t
                    end_day = max(op_start_day, end_day)

                    # Mark active days
                    active_operational[i, op_start_day : end_day + 1] = 1
                    active_strict[i, strict_start_day : end_day + 1] = 1

                    tot_size = int(np.sum(cases_total[i, strict_start_day : end_day + 1]))
                    c_size = int(np.sum(cases_cholera[i, strict_start_day : end_day + 1]))
                    a_size = int(np.sum(cases_add[i, strict_start_day : end_day + 1]))

                    pathogen = 'cholera' if c_size > a_size else ('add' if a_size > 0 else 'mixed')

                    outbreak_events.append({
                        'outbreak_id': f"OUT_{outbreak_id_counter:05d}",
                        'unit_id': uid,
                        'operational_start_date': dates[op_start_day],
                        'strict_start_date': dates[strict_start_day],
                        'end_date': dates[end_day],
                        'duration_days': end_day - op_start_day + 1,
                        'total_cases': tot_size,
                        'cholera_cases': c_size,
                        'add_cases': a_size,
                        'primary_pathogen': pathogen
                    })
                    outbreak_id_counter += 1

    # Format daily truth dataframe
    truth_records = []
    for i in range(n_units):
        uid = df_districts.iloc[i]['unit_id']
        for t in range(total_days):
            truth_records.append({
                'date': dates[t],
                'unit_id': uid,
                'true_infections_cholera': infections_cholera[i, t],
                'true_infections_add': infections_add[i, t],
                'true_infections_total': infections_cholera[i, t] + infections_add[i, t],
                'true_cases_cholera': cases_cholera[i, t],
                'true_cases_add': cases_add[i, t],
                'true_cases_total': cases_total[i, t],
                'active_outbreak_operational': active_operational[i, t],
                'active_outbreak_strict': active_strict[i, t],
                'susceptible_cholera': int(S_cholera[i, t]),
                'susceptible_add': int(S_add[i, t])
            })

    df_daily_truth = pd.DataFrame(truth_records)
    df_outbreak_events = pd.DataFrame(outbreak_events, columns=[
        'outbreak_id', 'unit_id', 'operational_start_date',
        'strict_start_date', 'end_date', 'duration_days', 'total_cases',
        'cholera_cases', 'add_cases', 'primary_pathogen',
    ])
    return df_daily_truth, df_outbreak_events
