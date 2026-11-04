import yaml
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

def load_district_definitions(yaml_path: str) -> List[Dict]:
    with open(yaml_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    return data['units']

def generate_world_districts(yaml_path: str, seed: int) -> Tuple[pd.DataFrame, np.ndarray, Dict[str, int]]:
    """
    Generates district traits for an independent world realization.
    Anchored in Tamil Nadu demographic and geographic configuration.
    """
    rng = np.random.default_rng(seed)
    units = load_district_definitions(yaml_path)
    n_units = len(units)

    unit_id_to_idx = {u['id']: i for i, u in enumerate(units)}

    # Adjacency matrix for spatial importation
    adj_matrix = np.zeros((n_units, n_units), dtype=np.float64)
    for i, u in enumerate(units):
        neighbors = u.get('neighbors', [])
        valid_neighbors = [unit_id_to_idx[nid] for nid in neighbors if nid in unit_id_to_idx]
        if valid_neighbors:
            weight = 1.0 / len(valid_neighbors)
            for j in valid_neighbors:
                adj_matrix[i, j] = weight
        else:
            adj_matrix[i, i] = 1.0

    rows = []
    for i, u in enumerate(units):
        # District-specific traits with world-level variation
        pop_mult = rng.normal(1.0, 0.05)
        pop = int(max(10000, u['population'] * pop_mult))

        # Sanitation coverage: Beta variation around baseline
        sanit_base = u['sanitation_coverage']
        sanit_alpha = sanit_base * 40.0
        sanit_beta = (1.0 - sanit_base) * 40.0
        sanitation = float(np.clip(rng.beta(sanit_alpha, sanit_beta), 0.35, 0.98))

        # Water supply baseline reliability trait (fraction of days without major outage)
        reliability = float(np.clip(rng.beta(12.0, 2.0), 0.65, 0.98))

        # Water treatment efficacy
        treatment_eff = float(np.clip(rng.beta(16.0, 3.0), 0.60, 0.96))

        # Healthcare access / baseline reporting sensitivity
        healthcare_access = float(np.clip(rng.beta(14.0, 4.0), 0.50, 0.95))

        # Water sources
        ws = u.get('water_sources', {'piped': 0.6, 'groundwater': 0.3, 'surface': 0.1})
        piped_share = ws.get('piped', 0.6)
        ground_share = ws.get('groundwater', 0.3)
        surface_share = ws.get('surface', 0.05)
        tanker_share = ws.get('tanker', 0.05)

        # Daily baseline consumption per capita (liters)
        daily_consumption = float(rng.normal(135.0, 15.0))

        rows.append({
            'unit_id': u['id'],
            'unit_name': u['name'],
            'type': u['type'],
            'population': pop,
            'density_km2': u['density_km2'],
            'lat': u['lat'],
            'lon': u['lon'],
            'coastal': 1 if u['coastal'] else 0,
            'sanitation_coverage': round(sanitation, 4),
            'supply_reliability': round(reliability, 4),
            'treatment_efficacy': round(treatment_eff, 4),
            'healthcare_access': round(healthcare_access, 4),
            'piped_share': round(piped_share, 4),
            'groundwater_share': round(ground_share, 4),
            'surface_share': round(surface_share, 4),
            'tanker_share': round(tanker_share, 4),
            'daily_consumption_l': round(daily_consumption, 1)
        })

    df_districts = pd.DataFrame(rows)
    return df_districts, adj_matrix, unit_id_to_idx
