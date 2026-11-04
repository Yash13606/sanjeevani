import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

def simulate_water_system(
    df_districts: pd.DataFrame,
    df_weather: pd.DataFrame,
    total_days: int,
    seed: int,
    config: Dict
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Simulates water supply outages, contamination events, and latent contamination
    concentration C(t) per source and district.
    Outputs:
      - df_water_daily: latent concentrations, exposure E(t), supply status
      - df_contamination_events: registry of source-level contamination events
    """
    rng = np.random.default_rng(seed + 202)
    phi = config['water_system']['latent_ar1_phi']
    scarcity_dry_thresh = config['water_system']['dry_days_scarcity_threshold']

    # Pre-index weather by (unit_id, day_idx)
    df_weather_sorted = df_weather.sort_values(['unit_id', 'date']).reset_index(drop=True)
    dates = df_weather['date'].drop_duplicates().sort_values().values

    water_records = []
    events_registry = []
    event_id_counter = 1

    # Group weather by unit_id
    weather_by_unit = {uid: grp.reset_index(drop=True) for uid, grp in df_weather_sorted.groupby('unit_id')}

    for _, dist in df_districts.iterrows():
        unit_id = dist['unit_id']
        w_df = weather_by_unit[unit_id]

        reliability = dist['supply_reliability']
        sanitation = dist['sanitation_coverage']
        treatment = dist['treatment_efficacy']
        piped_share = dist['piped_share']
        ground_share = dist['groundwater_share']
        surf_share = dist['surface_share']
        tanker_share = dist['tanker_share']
        consumption_ratio = dist['daily_consumption_l'] / 135.0

        # Outage simulation with episode durations
        outage_status = np.zeros(total_days, dtype=np.int32)
        outage_remaining = 0

        # Latent contamination concentrations per source (log-scale / normalized concentration)
        # 0 = pristine, 1 = baseline trace, >3 = hazardous surge
        c_piped = np.zeros(total_days, dtype=np.float64)
        c_ground = np.zeros(total_days, dtype=np.float64)
        c_surf = np.zeros(total_days, dtype=np.float64)
        c_tanker = np.zeros(total_days, dtype=np.float64)

        piped_val, ground_val, surf_val, tanker_val = 0.05, 0.08, 0.15, 0.04

        for t in range(total_days):
            row_w = w_df.iloc[t]
            rain = row_w['rainfall_mm']
            dry_days = row_w['consec_dry_days']
            heavy_flush = row_w['heavy_rain_after_dry']
            temp_anom = row_w['temp_anomaly']

            # 1. Supply interruption logic
            if outage_remaining > 0:
                outage_status[t] = 1
                outage_remaining -= 1
            else:
                outage_hazard = (1.0 - reliability) * 0.08
                if dry_days > scarcity_dry_thresh and temp_anom > 1.5:
                    outage_hazard *= 2.0  # Scarcity stress
                if rain > 60.0:
                    outage_hazard *= 1.5  # Flood damage to pumping stations

                if rng.random() < outage_hazard:
                    outage_status[t] = 1
                    # Duration 1 to 4 days
                    outage_remaining = int(rng.geometric(p=0.45))

            # 2. Contamination shocks
            shock_piped = 0.0
            shock_ground = 0.0
            shock_surf = 0.0
            shock_tanker = 0.0

            # Backflow intrusion in piped networks during outages and low pressure
            if outage_status[t] == 1:
                # Poor sanitation increases backflow pathogen load
                backflow_severity = rng.exponential(scale=(1.2 - sanitation) * 2.2)
                shock_piped += backflow_severity
                shock_tanker += 0.5 * backflow_severity

            # Heavy rain flush shock (washes faecal matter into surface and shallow groundwater)
            if heavy_flush == 1 or rain > 45.0:
                washoff = (rain / 30.0) * (1.1 - sanitation) * rng.uniform(1.5, 3.5)
                shock_surf += washoff * 1.8
                shock_ground += washoff * 0.8
                shock_piped += washoff * 0.3

            # Baseline AR(1) update with innovations
            piped_val = phi * piped_val + rng.normal(0.04, 0.02) + shock_piped
            ground_val = phi * ground_val + rng.normal(0.06, 0.02) + shock_ground
            surf_val = (phi * 0.85) * surf_val + rng.normal(0.10, 0.03) + shock_surf
            tanker_val = phi * tanker_val + rng.normal(0.03, 0.01) + shock_tanker

            # Natural decay & clipping
            piped_val = max(0.0, piped_val)
            ground_val = max(0.0, ground_val)
            surf_val = max(0.0, surf_val)
            tanker_val = max(0.0, tanker_val)

            c_piped[t] = round(piped_val, 4)
            c_ground[t] = round(ground_val, 4)
            c_surf[t] = round(surf_val, 4)
            c_tanker[t] = round(tanker_val, 4)

            # Record significant contamination event in registry
            max_shock = max(shock_piped, shock_ground, shock_surf)
            if max_shock > 1.2:
                primary_src = 'piped' if shock_piped >= max_shock else ('ground' if shock_ground >= max_shock else 'surface')
                events_registry.append({
                    'event_id': f"EVT_{event_id_counter:05d}",
                    'unit_id': unit_id,
                    'start_date': dates[t],
                    'source': primary_src,
                    'shock_magnitude': round(max_shock, 3),
                    'affected_pop_share': round(piped_share if primary_src == 'piped' else (ground_share if primary_src == 'ground' else surf_share), 2),
                    'cause': 'supply_outage_backflow' if outage_status[t] == 1 else 'heavy_rain_runoff'
                })
                event_id_counter += 1

            # 3. Population exposure computation E(t)
            # Effective concentration after treatment
            eff_piped = c_piped[t] * (1.0 - treatment)
            eff_ground = c_ground[t] * (1.0 - treatment * 0.5)  # Groundwater partially treated
            eff_surf = c_surf[t] * (1.0 - treatment * 0.3)
            eff_tanker = c_tanker[t] * (1.0 - treatment * 0.4)

            e_t = (
                piped_share * eff_piped +
                ground_share * eff_ground +
                surf_share * eff_surf +
                tanker_share * eff_tanker
            ) * consumption_ratio

            water_records.append({
                'date': dates[t],
                'unit_id': unit_id,
                'outage_active': outage_status[t],
                'c_piped': c_piped[t],
                'c_groundwater': c_ground[t],
                'c_surface': c_surf[t],
                'c_tanker': c_tanker[t],
                'effective_exposure_E': round(e_t, 4)
            })

    df_water_daily = pd.DataFrame(water_records)
    df_contamination_events = pd.DataFrame(events_registry)
    return df_water_daily, df_contamination_events
