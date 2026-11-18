import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FlaskConical, RotateCcw } from "lucide-react";
import { API_BASE, getUnits, getWeeks } from "@/lib/ml/api";
import type { UnitProfile, Weeks } from "@/lib/ml/types";

type Task = "m1" | "m2";
type Tier = "routine" | "watch" | "review";

type Signal = { name: string; saved: number | null; current: number | null; min: number | null; max: number | null; median: number | null };
type WhatIf = {
  synthetic: boolean;
  task: Task;
  unit_id: string;
  date: string;
  scenario: string;
  model_name: string;
  in_risk_set: boolean;
  thresholds: { review: number | null; watch: number | null };
  saved_score: number;
  saved_tier: Tier;
  score: number;
  tier: Tier;
  changed: string[];
  signals: Signal[];
};

const LABELS: Record<string, string> = {
  rain_7d: "Rain, last 7 days (mm)",
  temp_mean_7d: "Temperature, 7-day mean (°C)",
  rel_humidity_7d: "Relative humidity, 7-day mean (%)",
  turbidity_mean_7d: "Turbidity, 7-day mean (NTU)",
  turbidity_max_7d: "Turbidity, 7-day maximum (NTU)",
  turbidity_exceed_7d: "Days turbidity above limit (of 7)",
  chlorine_mean_7d: "Free chlorine, 7-day mean (mg/L)",
  chlorine_depleted_7d: "Days chlorine depleted (of 7)",
  tds_mean_7d: "Dissolved solids, 7-day mean (mg/L)",
  ecoli_last_cfu: "E. coli, latest lab test (CFU/100 ml)",
  ecoli_positive_30d: "E. coli positive tests, last 30 days",
  days_since_lab_test: "Days since last lab test",
  asha_cases_7d: "ASHA reported cases, 7 days",
  asha_cases_14d: "ASHA reported cases, 14 days",
  asha_alert_7d: "ASHA cluster alert (0/1)",
  opd_cases_7d: "Outpatient (OPD) cases, 7 days",
  opd_trend_7d: "OPD trend vs previous week",
  idsp_alerts_28d: "IDSP bulletin alerts, 28 days",
  sensor_uptime_7d: "Sensor uptime, 7 days (0 to 1)",
};

const PRESETS: { label: string; values: Record<string, string> }[] = [
  { label: "Heavy rain, turbid and low-chlorine water", values: { rain_7d: "250", turbidity_mean_7d: "15", turbidity_max_7d: "25", chlorine_mean_7d: "0.1", ecoli_last_cfu: "500" } },
  { label: "Case surge (ASHA and clinic)", values: { asha_cases_7d: "3000", asha_cases_14d: "5000", opd_cases_7d: "2500" } },
  { label: "Water sensors offline (missing)", values: { turbidity_mean_7d: "nan", turbidity_max_7d: "nan", chlorine_mean_7d: "nan", tds_mean_7d: "nan" } },
];

const TIER_STYLE: Record<Tier, string> = {
  routine: "bg-[#E8F5EE] text-[#0D7A4A]",
  watch: "bg-[#FFF4D6] text-[#8A6100]",
  review: "bg-[#FDE8E8] text-[#B42318]",
};

const fmt = (value: number | null | undefined, digits = 2) =>
  value == null || !Number.isFinite(value) ? "missing" : Number(value.toFixed(digits)).toString();

export default function WhatIfLab() {
  const [units, setUnits] = useState<UnitProfile[]>([]);
  const [weeks, setWeeks] = useState<Weeks | null>(null);
  const [task, setTask] = useState<Task>("m1");
  const [unitId, setUnitId] = useState("TN_34");
  const [scenario, setScenario] = useState("baseline");
  const [date, setDate] = useState("2022-10-03");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [result, setResult] = useState<WhatIf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    void getUnits(abort.signal).then((r) => setUnits(r.data)).catch(() => undefined);
    void getWeeks(abort.signal)
      .then((r) => {
        setWeeks(r.data);
        if (r.data.dates.length && !r.data.dates.includes("2022-10-03")) setDate(r.data.default_date ?? r.data.dates[r.data.dates.length - 1]);
        if (r.data.scenarios.length && !r.data.scenarios.includes("baseline")) setScenario(r.data.scenarios[0]);
      })
      .catch(() => undefined);
    return () => abort.abort();
  }, []);

  // a different area, week, surveillance level or task starts from that row's saved values
  useEffect(() => setEdits({}), [task, unitId, scenario, date]);

  useEffect(() => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(async () => {
      setLoading(true);
      const query = new URLSearchParams({ task, unit_id: unitId, scenario, date });
      Object.entries(edits).forEach(([key, value]) => {
        if (value !== "") query.set(key, value);
      });
      try {
        const response = await fetch(`${API_BASE}/api/ml/whatif?${query.toString()}`, { signal: abort.signal, cache: "no-store" });
        const body = (await response.json()) as WhatIf & { error?: string };
        if (!response.ok) throw new Error(body.error ?? `The local ML API returned ${response.status}.`);
        if (!abort.signal.aborted) {
          setResult(body);
          setError(null);
        }
      } catch (cause) {
        if (!abort.signal.aborted) {
          setResult(null);
          setError(cause instanceof TypeError
            ? "The local ML service is not running. Start it with: cd ml; .\\.venv\\Scripts\\python.exe service.py"
            : cause instanceof Error ? cause.message : "The what-if request failed.");
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [task, unitId, scenario, date, edits]);

  const unitName = useMemo(() => units.find((u) => u.unit_id === unitId)?.name ?? unitId, [units, unitId]);
  const setEdit = (name: string, value: string) =>
    setEdits((prev) => {
      const next = { ...prev };
      if (value === "") delete next[name];
      else next[name] = value;
      return next;
    });

  const th = result?.thresholds;
  const scale = 1; // scores are probabilities between 0 and 1

  return (
    <div className="min-h-screen bg-[#F4F6F5] text-[#0D1F1A]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/ml-lab" className="inline-flex items-center gap-2 text-sm font-medium text-[#0D7A4A] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to ML Lab
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-semibold text-[#8A6100]">
            <FlaskConical className="h-3.5 w-3.5" /> Synthetic what-if, not a real-district prediction
          </span>
        </div>

        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: "Georgia, serif" }}>What-if lab</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#44544E]">
          Pick a simulated area and week, then change the weekly signals (rain, water quality, case reports, sensors). The saved model re-scores the
          row immediately. The other model inputs keep their saved values, so this shows how the model reacts, not a forecast for a real place.
        </p>

        <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-[#44544E]">Question
            <select value={task} onChange={(e) => setTask(e.target.value as Task)} className="mt-1 w-full rounded-lg border border-[#D5DDD9] bg-white px-2 py-2 text-sm">
              <option value="m1">M1 Early warning (new outbreak in 7 days)</option>
              <option value="m2">M2 Detection (outbreak active now)</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#44544E]">Area
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="mt-1 w-full rounded-lg border border-[#D5DDD9] bg-white px-2 py-2 text-sm">
              {(units.length ? units : [{ unit_id: unitId, name: unitId } as UnitProfile]).map((u) => (
                <option key={u.unit_id} value={u.unit_id}>{u.name} ({u.unit_id})</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#44544E]">Surveillance level
            <select value={scenario} onChange={(e) => setScenario(e.target.value)} className="mt-1 w-full rounded-lg border border-[#D5DDD9] bg-white px-2 py-2 text-sm">
              {(weeks?.scenarios ?? ["baseline", "improved", "enhanced"]).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#44544E]">Simulated week (Monday)
            <select value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[#D5DDD9] bg-white px-2 py-2 text-sm">
              {(weeks?.dates ?? [date]).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>

        {error && <div className="mt-4 rounded-xl border border-[#F3C0C0] bg-[#FDE8E8] p-4 text-sm text-[#B42318]">{error}</div>}

        {result && (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#44544E]">Saved row</p>
                <p className="mt-1 text-sm text-[#44544E]">{unitName} · {result.date} · {result.scenario}</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-4xl font-semibold">{result.saved_score.toFixed(3)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${TIER_STYLE[result.saved_tier]}`}>{result.saved_tier}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-2 ring-[#0D7A4A]/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0D7A4A]">What-if score {loading && "· updating…"}</p>
                <p className="mt-1 text-sm text-[#44544E]">
                  {result.changed.length ? `${result.changed.length} signal(s) changed` : "No changes yet: same as the saved row"}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-4xl font-semibold">{result.score.toFixed(3)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${TIER_STYLE[result.tier]}`}>{result.tier}</span>
                  <span className="text-sm text-[#44544E]">
                    {result.score - result.saved_score >= 0 ? "+" : ""}{(result.score - result.saved_score).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#44544E]">Score against the tier thresholds (chosen on the validation world)</p>
              <div className="relative mt-4 h-4 rounded-full bg-[#E8EDEA]">
                {th?.watch != null && <div className="absolute inset-y-0 rounded-l-full bg-[#FFE7A3]" style={{ left: `${th.watch * 100 / scale}%`, width: `${((th.review ?? 1) - th.watch) * 100 / scale}%` }} />}
                {th?.review != null && <div className="absolute inset-y-0 right-0 rounded-r-full bg-[#F7B4B4]" style={{ left: `${th.review * 100 / scale}%` }} />}
                <div className="absolute -top-1 h-6 w-1 rounded bg-[#0D1F1A]/50" style={{ left: `${result.saved_score * 100}%` }} title="saved" />
                <div className="absolute -top-2 h-8 w-1.5 rounded bg-[#0D7A4A]" style={{ left: `${result.score * 100}%` }} title="what-if" />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#44544E]">
                <span>0</span>
                <span>Watch ≥ {fmt(th?.watch, 3)} · Review ≥ {fmt(th?.review, 3)}</span>
                <span>1</span>
              </div>
              {task === "m1" && !result.in_risk_set && (
                <p className="mt-3 text-xs text-[#8A6100]">This area already had an active outbreak that week, so M1 would be "Not scored" on the dashboards; the model still returns a score here.</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Change the weekly signals</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => setEdits({ ...edits, ...p.values })}
                      className="rounded-full border border-[#0D7A4A] px-3 py-1 text-xs font-semibold text-[#0D7A4A] hover:bg-[#E8F5EE]">{p.label}</button>
                  ))}
                  <button type="button" onClick={() => setEdits({})} className="inline-flex items-center gap-1 rounded-full border border-[#D5DDD9] px-3 py-1 text-xs font-semibold text-[#44544E] hover:bg-[#F4F6F5]">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2">
                {result.signals.map((s) => {
                  const edited = s.name in edits;
                  const missing = edits[s.name] === "nan";
                  const lo = s.min ?? 0;
                  const hi = s.max ?? 1;
                  const step = hi - lo > 50 ? 1 : hi - lo > 5 ? 0.1 : 0.01;
                  const shown = missing ? "" : edited ? edits[s.name] : s.saved == null ? "" : String(Number(s.saved.toFixed(3)));
                  return (
                    <div key={s.name} className={`rounded-xl border p-3 ${edited ? "border-[#0D7A4A] bg-[#F3FAF6]" : "border-[#E3E9E6]"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{LABELS[s.name] ?? s.name}</span>
                        <span className="text-[11px] text-[#44544E]">saved: {fmt(s.saved)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input type="range" min={lo} max={hi} step={step} disabled={missing}
                          value={missing ? lo : Math.min(hi, Math.max(lo, Number(shown === "" ? lo : shown)))}
                          onChange={(e) => setEdit(s.name, e.target.value)} className="h-2 flex-1 accent-[#0D7A4A]" />
                        <input type="number" step={step} disabled={missing} value={shown} placeholder={missing ? "missing" : ""}
                          onChange={(e) => setEdit(s.name, e.target.value)} className="w-24 rounded-md border border-[#D5DDD9] px-2 py-1 text-xs" />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[#44544E]">
                        <span>range {fmt(s.min)} to {fmt(s.max)}</span>
                        <label className="inline-flex items-center gap-1">
                          <input type="checkbox" checked={missing} onChange={(e) => setEdit(s.name, e.target.checked ? "nan" : "")} /> sensor or report missing
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-[#44544E]">
                Model: {result.model_name} (saved, {result.task.toUpperCase()}). Ranges are the values seen in the simulated test world; you can type values outside them, but the
                model has not seen such cases. Missing values are handled the way the model handled offline sensors in training.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
