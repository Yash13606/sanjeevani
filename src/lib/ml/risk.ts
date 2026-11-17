import type { Board, BoardUnit, ModelMeta, Signals, TaskId, Tier, UnitProfile } from "./types";

// ─── Tiers ────────────────────────────────────────────────────────────────────
// The model produces a score between 0 and 1 for each unit-week. Two thresholds, both chosen on
// VALIDATION worlds (never on the test world), turn it into a review tier:
//   score >= F1 threshold              -> "review"  (balances precision and recall)
//   score >= target-recall threshold   -> "watch"   (catches the target share of events, more false alarms)
//   otherwise                          -> "routine"
export const TIER_ORDER: Tier[] = ["review", "watch", "routine"];

export const TIER_META: Record<Tier, { label: string; color: string; bg: string; emoji: string; rank: number }> = {
  review: { label: "Review", color: "#E53935", bg: "#FFEBEE", emoji: "🔴", rank: 0 },
  watch: { label: "Watch", color: "#FB8C00", bg: "#FFF3E0", emoji: "🟠", rank: 1 },
  routine: { label: "Routine", color: "#43A047", bg: "#E8F5E9", emoji: "🟢", rank: 2 },
};

export const TASK_META: Record<TaskId, { short: string; name: string; question: string; reviewWord: string }> = {
  m1: {
    short: "M1",
    name: "Early warning",
    question: "Will a new simulated outbreak start in the next 7 days?",
    reviewWord: "early-warning",
  },
  m2: {
    short: "M2",
    name: "Current detection",
    question: "Is a simulated outbreak active this week?",
    reviewWord: "detection",
  },
};

export function tierExplanation(task: TaskId, model: ModelMeta | undefined): string {
  const f1 = model?.f1_threshold;
  const recall = model?.recall_threshold;
  const fmt = (v: number | null | undefined) => (v == null ? "n/a" : v.toFixed(3));
  return (
    `Review: score ≥ ${fmt(f1)} (F1-optimal on validation worlds). ` +
    `Watch: score ≥ ${fmt(recall)} (validation threshold for ${model?.target_recall != null ? Math.round(model.target_recall * 100) : "the target"}% recall). ` +
    `Below that: routine. ${TASK_META[task].name} question: ${TASK_META[task].question}`
  );
}

export function unitTier(unit: BoardUnit | undefined, task: TaskId): Tier | null {
  return unit?.[task]?.tier ?? null;
}

export function unitScore(unit: BoardUnit | undefined, task: TaskId): number | null {
  return unit?.[task]?.score ?? null;
}

export function tierCounts(board: Board | undefined, task: TaskId): Record<Tier, number> & { unscored: number } {
  const counts = { review: 0, watch: 0, routine: 0, unscored: 0 };
  for (const unit of board?.units ?? []) {
    const tier = unitTier(unit, task);
    if (tier) counts[tier] += 1;
    else counts.unscored += 1;
  }
  return counts;
}

/** Units ordered by score for a task (highest first); units without a score go last. */
export function rankUnits(board: Board | undefined, task: TaskId): BoardUnit[] {
  return [...(board?.units ?? [])].sort((a, b) => (unitScore(b, task) ?? -1) - (unitScore(a, task) ?? -1));
}

// ─── Signals ──────────────────────────────────────────────────────────────────
// Reference values are exactly the ones used to build the model's features (ml/sanjeevani_ml/features.py).
export const SIGNAL_RULES = {
  turbidityNtu: 4.0, // a day above this counts towards turbidity_exceed_7d
  chlorineMgL: 0.2, // a day below this counts towards chlorine_depleted_7d
  ecoliCfu: 10.0, // a lab result above this counts as E. coli positive
  heavyRainMm7d: 50, // display-only context, not a model rule
} as const;

export type SignalStatus = "ok" | "warn" | "alert" | "context" | "unavailable";

export interface SignalRow {
  key: string;
  label: string;
  value: string;
  status: SignalStatus;
  note?: string;
}

export const STATUS_COLOR: Record<SignalStatus, string> = {
  ok: "#43A047",
  warn: "#FB8C00",
  alert: "#E53935",
  context: "#6B7B74",
  unavailable: "#9CA3AF",
};

export const STATUS_LABEL: Record<SignalStatus, string> = {
  ok: "NORMAL",
  warn: "WATCH",
  alert: "OUT OF RANGE",
  context: "CONTEXT",
  unavailable: "NO DATA",
};

const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function sensorsOnline(signals: Signals): boolean {
  return num(signals.sensor_uptime_7d) && signals.sensor_uptime_7d > 0;
}

/** The water and weather signals the model actually receives, with the units the simulator uses. */
export function signalRows(signals: Signals): SignalRow[] {
  const online = sensorsOnline(signals);
  const sensorRow = (
    key: string, label: string, value: number | null | undefined, unit: string, digits: number,
    judge: (v: number) => SignalStatus, note?: (v: number) => string | undefined,
  ): SignalRow => {
    if (!num(value) || !online) {
      return { key, label, value: "no reading", status: "unavailable", note: "Sensor offline this week; the model uses a default fill value" };
    }
    return { key, label, value: `${value.toFixed(digits)} ${unit}`.trim(), status: judge(value), note: note?.(value) };
  };

  const rows: SignalRow[] = [
    sensorRow("turbidity", "Turbidity (7-day mean)", signals.turbidity_mean_7d, "NTU", 1,
      (v) => (v > SIGNAL_RULES.turbidityNtu ? "alert" : v > SIGNAL_RULES.turbidityNtu * 0.6 ? "warn" : "ok"),
      () => (num(signals.turbidity_exceed_7d) ? `above ${SIGNAL_RULES.turbidityNtu} NTU on ${signals.turbidity_exceed_7d} of 7 days` : undefined)),
    sensorRow("chlorine", "Free chlorine (7-day mean)", signals.chlorine_mean_7d, "mg/L", 2,
      (v) => (v < SIGNAL_RULES.chlorineMgL ? "alert" : v < 0.5 ? "warn" : "ok"),
      () => (num(signals.chlorine_depleted_7d) ? `below ${SIGNAL_RULES.chlorineMgL} mg/L on ${signals.chlorine_depleted_7d} of 7 days` : undefined)),
    sensorRow("tds", "Dissolved solids (TDS)", signals.tds_mean_7d, "mg/L", 0, () => "context"),
  ];

  const lab = signals.ecoli_last_cfu;
  rows.push(num(lab)
    ? {
        key: "ecoli", label: "E. coli, latest lab test", value: `${lab.toFixed(1)} CFU/100 mL`,
        status: lab > SIGNAL_RULES.ecoliCfu ? "alert" : "ok",
        note: `${num(signals.days_since_lab_test) ? `${signals.days_since_lab_test} day(s) ago` : "date unknown"}; ${signals.ecoli_positive_30d ?? 0} positive result(s) in 30 days`,
      }
    : { key: "ecoli", label: "E. coli, latest lab test", value: "no result", status: "unavailable" });

  if (num(signals.rain_7d)) {
    rows.push({ key: "rain", label: "Rainfall (7 days)", value: `${signals.rain_7d.toFixed(0)} mm`, status: signals.rain_7d >= SIGNAL_RULES.heavyRainMm7d ? "warn" : "context" });
  }
  if (num(signals.temp_mean_7d)) {
    rows.push({ key: "temp", label: "Temperature (7-day mean)", value: `${signals.temp_mean_7d.toFixed(1)} °C`, status: "context" });
  }
  if (num(signals.rel_humidity_7d)) {
    rows.push({ key: "humidity", label: "Relative humidity (7-day)", value: `${signals.rel_humidity_7d.toFixed(0)} %`, status: "context" });
  }
  return rows;
}

/** Plain-language list of what stands out in this unit-week. These are signals seen, not causes. */
export function observedSignals(signals: Signals): string[] {
  const out: string[] = [];
  if (num(signals.asha_cases_7d)) {
    const trend = num(signals.opd_trend_7d) ? ` (OPD trend ${signals.opd_trend_7d >= 0 ? "+" : ""}${signals.opd_trend_7d})` : "";
    out.push(`${signals.asha_cases_7d.toLocaleString("en-IN")} ASHA-reported cases in 7 days${trend}`);
  }
  if (num(signals.asha_alert_7d) && signals.asha_alert_7d > 0) out.push("ASHA cluster alert raised this week");
  if (num(signals.idsp_alerts_28d) && signals.idsp_alerts_28d > 0) out.push(`${signals.idsp_alerts_28d} IDSP bulletin alert(s) in 28 days`);
  if (sensorsOnline(signals)) {
    if (num(signals.turbidity_exceed_7d) && signals.turbidity_exceed_7d > 0) {
      out.push(`Turbidity above ${SIGNAL_RULES.turbidityNtu} NTU on ${signals.turbidity_exceed_7d} day(s)`);
    }
    if (num(signals.chlorine_depleted_7d) && signals.chlorine_depleted_7d > 0) {
      out.push(`Free chlorine below ${SIGNAL_RULES.chlorineMgL} mg/L on ${signals.chlorine_depleted_7d} day(s)`);
    }
  } else {
    out.push("Water sensors reported no readings this week");
  }
  if (num(signals.ecoli_last_cfu) && signals.ecoli_last_cfu > SIGNAL_RULES.ecoliCfu) {
    out.push(`Latest E. coli ${signals.ecoli_last_cfu.toFixed(1)} CFU/100 mL (above ${SIGNAL_RULES.ecoliCfu})`);
  }
  if (num(signals.rain_7d) && signals.rain_7d >= SIGNAL_RULES.heavyRainMm7d) out.push(`Heavy rain: ${signals.rain_7d.toFixed(0)} mm in 7 days`);
  return out;
}

// ─── Formatting ───────────────────────────────────────────────────────────────
export const formatScore = (value: number | null | undefined) => (num(value) ? value.toFixed(3) : "—");
export const formatPercent = (value: number | null | undefined, digits = 1) =>
  num(value) ? `${(value * 100).toFixed(digits)}%` : "—";
export const formatInt = (value: number | null | undefined) => (num(value) ? Math.round(value).toLocaleString("en-IN") : "—");

export function formatWeek(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function unitName(units: UnitProfile[] | undefined, unitId: string): string {
  const found = units?.find((u) => u.unit_id === unitId);
  return found ? found.name.replace(/_/g, " · ") : unitId;
}

export function neighborIds(units: UnitProfile[] | undefined, unitId: string): string[] {
  return units?.find((u) => u.unit_id === unitId)?.neighbors ?? [];
}

export const DISCLAIMER =
  "Simulated surveillance data. Scores rank synthetic units for review; they are not diagnoses, official alerts or predictions for any real district.";
