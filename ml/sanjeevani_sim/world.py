import os
import yaml
import pandas as pd
from pathlib import Path
from typing import Dict
from sanjeevani_sim.districts import generate_world_districts
from sanjeevani_sim.climate import generate_world_weather
from sanjeevani_sim.water import simulate_water_system
from sanjeevani_sim.disease import simulate_disease_engine
from sanjeevani_sim.surveillance import simulate_surveillance_layer

class WorldSimulator:
    def __init__(self, config_path: str):
        config_file = Path(config_path).expanduser().resolve()
        with config_file.open('r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)

        units_path = Path(self.config['system']['units_file'])
        if not units_path.is_absolute():
            candidates = [config_file.parent / units_path, config_file.parent.parent / units_path]
            units_path = next((path for path in candidates if path.is_file()), candidates[0])
        self.units_yaml = str(units_path.resolve())
        self.total_days = self.config['system']['total_days']

    def simulate_world(self, world_id: str, seed: int, out_dir: str = None) -> Dict[str, pd.DataFrame]:
        """
        Simulates an independent world realization.
        True weather, contamination, infections, and outbreaks are simulated ONCE.
        Surveillance scenarios (baseline, improved, enhanced) observe this identical truth.
        """
        # 1. Districts & spatial network
        df_districts, adj_matrix, unit_to_idx = generate_world_districts(self.units_yaml, seed)
        df_districts['world_id'] = world_id
        df_districts['seed'] = seed

        # 2. Stochastic Climate
        df_weather = generate_world_weather(df_districts, self.total_days, seed)
        df_weather['world_id'] = world_id

        # 3. Water & Contamination system
        df_water, df_contamination_events = simulate_water_system(
            df_districts, df_weather, self.total_days, seed, self.config
        )
        df_water['world_id'] = world_id
        if not df_contamination_events.empty:
            df_contamination_events['world_id'] = world_id

        # 4. Mechanistic Disease engine (Truth)
        df_truth, df_outbreaks = simulate_disease_engine(
            df_districts, df_water, adj_matrix, unit_to_idx, self.total_days, seed, self.config
        )
        df_truth['world_id'] = world_id
        if not df_outbreaks.empty:
            df_outbreaks['world_id'] = world_id

        # 5. Surveillance layer per scenario
        surveillance_dict = {}
        for sc in self.config['surveillance_scenarios']:
            df_surv, df_outbreaks = simulate_surveillance_layer(
                df_districts, df_water, df_truth, df_outbreaks, sc, seed, self.config
            )
            df_surv['world_id'] = world_id
            surveillance_dict[sc] = df_surv

        result = {
            'districts': df_districts,
            'weather': df_weather,
            'water': df_water,
            'contamination_events': df_contamination_events,
            'daily_truth': df_truth,
            'outbreak_events': df_outbreaks,
        }
        result.update({f'surveillance_{sc}': frame for sc, frame in surveillance_dict.items()})

        if out_dir:
            w_dir = os.path.join(out_dir, world_id)
            os.makedirs(w_dir, exist_ok=True)
            df_districts.to_csv(os.path.join(w_dir, 'districts.csv'), index=False)
            df_weather.to_csv(os.path.join(w_dir, 'weather.csv.gz'), index=False, compression='gzip')
            df_water.to_csv(os.path.join(w_dir, 'water.csv.gz'), index=False, compression='gzip')
            df_contamination_events.to_csv(os.path.join(w_dir, 'contamination_events.csv'), index=False)
            df_truth.to_csv(os.path.join(w_dir, 'daily_truth.csv.gz'), index=False, compression='gzip')
            df_outbreaks.to_csv(os.path.join(w_dir, 'outbreak_events.csv'), index=False)
            for sc in self.config['surveillance_scenarios']:
                surveillance_dict[sc].to_csv(os.path.join(w_dir, f'surveillance_{sc}.csv.gz'), index=False, compression='gzip')

        return result
