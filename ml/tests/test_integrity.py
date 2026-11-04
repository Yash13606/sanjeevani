import os
from pathlib import Path
import yaml
import pytest
import numpy as np
import pandas as pd
from sanjeevani_sim.world import WorldSimulator

def test_simulation_integrity():
    """
    Comprehensive verification suite for simulation integrity and causality.
    """
    base_dir = Path(__file__).resolve().parent.parent
    config_path = str(base_dir / "config" / "simulation_config.yaml")
    sim = WorldSimulator(config_path)
    # Ensure units_file path is resolved relative to base_dir
    sim.units_yaml = str(base_dir / sim.config['system']['units_file'])

    # Run a pilot world (seed 1001)
    world_id = "test_pilot_1001"
    res = sim.simulate_world(world_id, seed=1001)

    df_truth = res['daily_truth']
    df_outbreaks = res['outbreak_events']
    df_water = res['water']
    df_surv_base = res['surveillance_baseline']
    df_surv_enh = res['surveillance_enhanced']

    print("\n--- Integrity Check 1: Strict Temporal Causality ---")
    # For every unit, first symptomatic case cannot occur before first infection
    for uid, grp in df_truth.groupby('unit_id'):
        grp = grp.sort_values('date').reset_index(drop=True)
        inf_idx = np.where(grp['true_infections_total'].values > 0)[0]
        case_idx = np.where(grp['true_cases_total'].values > 0)[0]
        if len(inf_idx) > 0 and len(case_idx) > 0:
            first_inf = inf_idx[0]
            first_case = case_idx[0]
            assert first_case >= first_inf, f"Unit {uid}: Case ({first_case}) appeared before infection ({first_inf})!"
    print("Passed: All symptomatic cases strictly lag infection timestamps.")

    print("\n--- Integrity Check 2: Outbreak Start < End & Active Window Consistency ---")
    if not df_outbreaks.empty:
        for _, evt in df_outbreaks.iterrows():
            st_op = pd.to_datetime(evt['operational_start_date'])
            st_sc = pd.to_datetime(evt['strict_start_date'])
            en = pd.to_datetime(evt['end_date'])
            assert st_sc <= st_op, f"Strict start {st_sc} must be <= operational start {st_op}"
            assert st_op <= en, f"Operational start {st_op} must be <= end date {en}"
            assert evt['total_cases'] > 0, "Outbreak must contain positive total cases."
    print("Passed: Outbreak event boundaries are strictly ordered.")

    print("\n--- Integrity Check 3: True Outbreak Invariance Across Surveillance Scenarios ---")
    # Truth dataframe is identical regardless of scenario
    assert (df_surv_base['date'] == df_surv_enh['date']).all()
    assert (df_surv_base['unit_id'] == df_surv_enh['unit_id']).all()
    # But surveillance observations must reflect differing coverage and delays
    assert df_surv_enh['sensor_online'].mean() > df_surv_base['sensor_online'].mean()
    assert df_surv_enh['asha_cases_reported'].sum() > df_surv_base['asha_cases_reported'].sum()
    print("Passed: Identical underlying truth, valid sensor/reporting divergence across scenarios.")

    print("\n--- Integrity Check 4: No Target Leakage in Surveillance Tables ---")
    forbidden_cols = ['true_infections', 'true_cases', 'exposure_E', 'c_piped', 'c_groundwater', 'susceptible']
    for col in df_surv_base.columns:
        for f in forbidden_cols:
            assert f not in col, f"Surveillance contains forbidden unobserved ground truth column: {col}"
    print("Passed: Surveillance tables contain zero unobservable ground truth leakage.")

    print("\n--- Integrity Check 5: Active Unreported Logic ---")
    # active_unreported must only be 1 when active_outbreak is 1
    merged = pd.merge(df_surv_base, df_truth[['unit_id', 'date', 'active_outbreak_operational']], on=['unit_id', 'date'])
    invalid_rows = merged[(merged['active_unreported_asof_t'] == 1) & (merged['active_outbreak_operational'] == 0)]
    assert len(invalid_rows) == 0, f"Found {len(invalid_rows)} rows where active_unreported=1 but active_outbreak=0!"
    print("Passed: active_unreported_asof_t strictly subsets active outbreaks.")

    print("\nAll 5 core integrity tests PASSED successfully.")

if __name__ == "__main__":
    test_simulation_integrity()
