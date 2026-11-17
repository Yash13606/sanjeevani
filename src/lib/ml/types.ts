// Shapes returned by the local synthetic-run service (ml/service.py) and by the bundled snapshot.
// Everything here describes SIMULATED test worlds: no real district, patient or alert.

export type TaskId = "m1" | "m2";
export type Tier = "review" | "watch" | "routine";
export type DataSource = "live" | "snapshot";

export type SignalKey =
  | "rain_7d" | "temp_mean_7d" | "rel_humidity_7d"
  | "turbidity_mean_7d" | "turbidity_max_7d" | "turbidity_exceed_7d"
  | "chlorine_mean_7d" | "chlorine_depleted_7d" | "tds_mean_7d"
  | "ecoli_last_cfu" | "ecoli_positive_30d" | "days_since_lab_test"
  | "asha_cases_7d" | "asha_cases_14d" | "asha_alert_7d"
  | "opd_cases_7d" | "opd_trend_7d" | "idsp_alerts_28d" | "sensor_uptime_7d";

export type Signals = Partial<Record<SignalKey, number | null>>;

export interface UnitProfile {
  unit_id: string;
  name: string;
  type: string | null;
  population: number | null;
  density_km2: number | null;
  lat: number;
  lon: number;
  coastal: boolean | null;
  water_sources: Record<string, number> | null;
  sanitation_coverage: number | null;
  neighbors: string[] | null;
}

export interface ModelMeta {
  task: TaskId;
  model_name: string;
  /** Score at or above this is "review": the threshold that maximised F1 on validation worlds. */
  f1_threshold: number | null;
  /** Score at or above this (but below f1_threshold) is "watch": the validation threshold for the target recall. */
  recall_threshold: number | null;
  target_recall: number | null;
  validation_average_precision: number | null;
}

export interface TaskScore {
  score: number | null;
  tier: Tier | null;
  /** The simulated outcome for evaluation; real deployments would not have it. */
  outcome: number | null;
}

export interface BoardUnit {
  unit_id: string;
  /** null when the unit already has an active event, so it is outside the early-warning risk set. */
  m1: TaskScore | null;
  m2: TaskScore | null;
  m1_in_risk_set: boolean;
  signals: Signals;
}

export interface Board {
  synthetic: true;
  run_id: string;
  world_id: string;
  scenario: string;
  date: string;
  observation_time: string;
  models: Record<TaskId, ModelMeta>;
  units: BoardUnit[];
}

export interface HistoryPoint {
  date: string;
  m1: TaskScore | null;
  m2: TaskScore | null;
  signals: Signals;
}

export interface History {
  synthetic: true;
  run_id: string;
  world_id: string;
  scenario: string;
  unit_id: string;
  models: Record<TaskId, ModelMeta>;
  points: HistoryPoint[];
}

export interface Weeks {
  synthetic: true;
  run_id: string;
  scenarios: string[];
  world_ids: string[];
  dates: string[];
  default_date: string | null;
}

export interface MetricRow {
  task: string;
  model: string;
  scenario: string;
  split: string;
  rows: number | null;
  positives: number | null;
  prevalence: number | null;
  average_precision: number | null;
  roc_auc?: number | null;
  brier?: number | null;
  f1?: number | null;
  precision?: number | null;
  recall?: number | null;
  precision_at_target_recall?: number | null;
  recall_at_target_recall?: number | null;
  false_alarms_per_district_month?: number | null;
  validation_f1_threshold?: number | null;
  validation_target_recall_threshold?: number | null;
  selected: boolean;
}

export interface EventMetricRow {
  task: string;
  scenario: string;
  eligible_events: number | null;
  detected_events: number | null;
  event_recall: number | null;
  median_lead_days: number | null;
  median_detection_delay_days: number | null;
  eligible_unreported_events: number | null;
  detected_while_unreported: number | null;
  unreported_detection_recall: number | null;
  median_days_before_report: number | null;
}

export interface Summary {
  synthetic: true;
  run_id: string;
  metrics: MetricRow[];
  event_metrics: EventMetricRow[];
}

export interface Sourced<T> {
  data: T;
  source: DataSource;
}

// ─── Clustering (ml/sanjeevani_ml/clustering.py) ─────────────────────────────
// Unsupervised groupings of areas, weeks and events. Descriptive only: they sit next to the M1 / M2 scores.
export interface KDiagnostic { k: number; silhouette: number | null; stability: number | null; score: number | null }
export interface ClusterSignal { feature: string; z: number | null }

export interface ArchetypeCluster { id: number; name: string; size: number; members: string[]; signals: ClusterSignal[] }
export interface Archetypes {
  k: number; diagnostics: KDiagnostic[]; clusters: ArchetypeCluster[];
  unit_cluster: Record<string, number>; quality: { silhouette: number | null };
}

export interface RegimeCluster {
  id: number; name: string; signals: ClusterSignal[]; share: number | null; unit_weeks: number;
  m2_active_rate: number | null; m1_onset_rate: number | null; m2_lift: number | null; m1_lift: number | null;
}
export interface Regimes {
  k: number; diagnostics: KDiagnostic[]; silhouette: number | null;
  baseline: { m2_active_rate: number | null; m1_onset_rate: number | null }; clusters: RegimeCluster[];
}

export interface BlindSpotCluster {
  id: number; name: string; unit_scenarios: number; events: number; unreported_share: number | null;
  median_report_delay_days: number | null; mean_sensor_uptime: number | null; mean_days_since_lab_test: number | null;
}
export interface BlindSpots { clusters: BlindSpotCluster[]; silhouette: number | null }

export interface SeasonalCluster {
  id: number; name: string; size: number; members: string[]; peak_month: string; amplitude: number | null; curve: number[];
}
export interface Seasonal {
  k: number; diagnostics: KDiagnostic[]; clusters: SeasonalCluster[]; months: string[];
  unit_cluster: Record<string, number>; quality: { silhouette: number | null };
}

export interface EventTypeCluster {
  id: number; name: string; events: number; share: number | null; median_duration_days: number | null;
  median_total_cases: number | null; mean_cholera_share: number | null; unreported_share: number | null;
  median_report_delay_days: number | null;
}
export interface EventTypes { available: boolean; k?: number; silhouette?: number | null; events?: number; clusters: EventTypeCluster[] }

export interface Hotspot { id: number; task: TaskId; size: number; review_count: number; units: string[]; top_unit: string; max_score: number | null }
export interface ClusterWeek {
  world_id: string; scenario: string; date: string;
  unit_regime: Record<string, number>; unit_blind_spot: Record<string, number>;
  hotspots: Partial<Record<TaskId, Hotspot[]>>;
}
export interface ClusterReport {
  synthetic: true; run_id?: string;
  archetypes: Archetypes; regimes: Regimes; blind_spots: BlindSpots; seasonal: Seasonal; event_types: EventTypes;
  week?: ClusterWeek;
}

/** Shape of src/data/mlSnapshot.json, written by ml/export_ui_snapshot.py. */
export interface Snapshot {
  synthetic: true;
  source: "bundled_snapshot";
  run_id: string;
  world_id: string;
  scenario: string;
  default_date: string;
  dates: string[];
  models: Record<TaskId, ModelMeta>;
  units: UnitProfile[];
  summary: Summary;
  clusters?: Omit<ClusterReport, "week" | "run_id"> & { weeks: Record<string, ClusterWeek> };
  boards: Record<string, Board>;
}
