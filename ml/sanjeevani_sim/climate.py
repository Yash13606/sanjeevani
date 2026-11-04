import numpy as np
import pandas as pd
from typing import Dict, List

def generate_world_weather(df_districts: pd.DataFrame, total_days: int, seed: int, start_date: str = "2017-01-01") -> pd.DataFrame:
    """
    Generates daily stochastic weather per district for an independent world realization.
    Uses seasonal harmonic curves for Tamil Nadu's Northeast and Southwest monsoons,
    coupled with a 2-state Markov chain for precipitation and AR(1) temperature anomalies.
    """
    rng = np.random.default_rng(seed + 101)
    dates = pd.date_range(start=start_date, periods=total_days, freq='D')
    doy = dates.dayofyear.values  # 1 to 365/366

    records = []

    for _, dist in df_districts.iterrows():
        unit_id = dist['unit_id']
        is_coastal = bool(dist['coastal'])
        is_hill = (dist['type'] == 'hill_plantation')
        lat = dist['lat']

        # Seasonal temperature cycle in Tamil Nadu:
        # Peak in May (day ~135), lowest in January (day ~15)
        temp_cycle = 29.5 + 4.5 * np.sin(2 * np.pi * (doy - 45) / 365.25)
        # Latitudinal / elevation adjustment
        if is_hill:
            temp_cycle -= 7.5
        elif not is_coastal:
            temp_cycle += 0.8  # Interior TN is hotter in summer

        # AR(1) daily temperature anomaly
        temp_anom = np.zeros(total_days, dtype=np.float64)
        anom_val = 0.0
        for t in range(total_days):
            anom_val = 0.75 * anom_val + rng.normal(0.0, 1.1)
            temp_anom[t] = anom_val

        t_max = temp_cycle + 4.0 + temp_anom
        t_min = temp_cycle - 4.5 + 0.6 * temp_anom
        t_mean = 0.5 * (t_max + t_min)

        # Precipitation probability:
        # Season 1: Southwest Monsoon (Days 152 to 273, Jun-Sep) - Higher in west/hills
        # Season 2: Northeast Monsoon (Days 274 to 355, Oct-Dec) - Heaviest in coastal/north TN
        sw_monsoon_prob = 0.22 if is_hill else (0.12 if lat > 11.5 and not is_coastal else 0.08)
        ne_monsoon_prob = 0.42 if is_coastal else 0.28
        summer_prob = 0.04
        winter_prob = 0.06

        rain_prob = np.full(total_days, winter_prob, dtype=np.float64)
        for t, d in enumerate(doy):
            if 60 <= d <= 151:   # Mar - May
                rain_prob[t] = summer_prob
            elif 152 <= d <= 273: # Jun - Sep
                rain_prob[t] = sw_monsoon_prob
            elif 274 <= d <= 355: # Oct - Dec (Northeast Monsoon)
                rain_prob[t] = ne_monsoon_prob

        # 2-state Markov chain for rain persistence
        is_wet = False
        rainfall = np.zeros(total_days, dtype=np.float64)
        dry_counter = 0
        consec_dry_days = np.zeros(total_days, dtype=np.int32)
        heavy_rain_after_dry = np.zeros(total_days, dtype=np.int32)

        for t in range(total_days):
            p_base = rain_prob[t]
            p_trans = (p_base * 1.8) if is_wet else p_base
            p_trans = min(0.85, max(0.02, p_trans))

            if rng.random() < p_trans:
                is_wet = True
                # Gamma distribution for rainfall amount
                scale = 22.0 if (274 <= doy[t] <= 355 and is_coastal) else 14.0
                rain_amount = float(rng.gamma(shape=1.2, scale=scale))
                rainfall[t] = round(rain_amount, 1)

                if dry_counter >= 14 and rain_amount >= 25.0:
                    heavy_rain_after_dry[t] = 1
                dry_counter = 0
            else:
                is_wet = False
                rainfall[t] = 0.0
                dry_counter += 1

            consec_dry_days[t] = dry_counter

        # Relative humidity: correlated with rain and inversely with temperature anomaly
        base_rh = 72.0 if is_coastal else 60.0
        rh = base_rh + 15.0 * (rainfall > 0) - 2.5 * temp_anom + rng.normal(0.0, 4.0, total_days)
        rh = np.clip(rh, 20.0, 98.0)

        for t in range(total_days):
            records.append({
                'date': dates[t],
                'unit_id': unit_id,
                'temp_mean': round(t_mean[t], 2),
                'temp_max': round(t_max[t], 2),
                'temp_min': round(t_min[t], 2),
                'temp_anomaly': round(temp_anom[t], 2),
                'rainfall_mm': rainfall[t],
                'is_rain': 1 if rainfall[t] > 0 else 0,
                'consec_dry_days': consec_dry_days[t],
                'heavy_rain_after_dry': heavy_rain_after_dry[t],
                'rel_humidity': round(rh[t], 1)
            })

    df_weather = pd.DataFrame(records)
    return df_weather
