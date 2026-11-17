import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { AGE_GROUPS, ALL_CASES, CASE_DISEASES, SEV_COLOR, countBy } from "../hospitalData";
import { ClusterBlock } from "@/components/ml/ClusterPanels";
import { MlGate } from "@/components/ml/MlGate";
import { TierBadge } from "@/components/ml/TierBadge";
import { useMl, useUnitHistory } from "@/lib/ml/MlContext";
import {
  TASK_META, formatInt, formatPercent, formatScore, formatWeek, neighborIds, unitName, unitScore, unitTier,
} from "@/lib/ml/risk";
import type { EventMetricRow, MetricRow, TaskId } from "@/lib/ml/types";

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; name?: string | number; value?: string | number; color?: string }>;
  label?: string | number;
};

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-xs">
      <p className="font-bold text-[#0D1F1A] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-mono font-bold">{p.value}</span></p>
      ))}
    </div>
  );
}

const WINDOWS = [8, 13, 26] as const;
const CONDITION_COLORS: Record<string, string> = {
  "Cholera (suspected)": "#E53935",
  "Acute diarrheal disease": "#F59E0B",
  "Other (not modeled)": "#9CA3AF",
};

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Saved-run results: how the model did on held-out simulated test worlds ───
function ModelResults() {
  const { summary, scenario } = useMl();
  if (!summary) return <p className="text-sm text-gray-500">Loading the saved run's results…</p>;

  const metric = (task: TaskId): MetricRow | undefined => {
    const rows = summary.metrics.filter((m) => m.task.toLowerCase() === task && m.selected);
    return rows.find((m) => m.scenario === scenario) ?? rows.find((m) => m.scenario === "all") ?? rows[0];
  };
  const events = (task: TaskId): EventMetricRow | undefined =>
    summary.event_metrics.find((e) => e.task.toLowerCase() === task && e.scenario === scenario);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {(["m1", "m2"] as const).map((task) => {
        const m = metric(task);
        const e = events(task);
        return (
          <div key={task} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{TASK_META[task].short} · {TASK_META[task].name}</p>
                <h3 className="font-display text-lg font-bold text-[#0D1F1A]">{m?.model ?? "No model"}</h3>
                <p className="text-xs text-gray-500">{TASK_META[task].question}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">TEST WORLDS</span>
            </div>
            {m ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Average precision", value: formatScore(m.average_precision) },
                    { label: "ROC-AUC", value: formatScore(m.roc_auc) },
                    { label: "F1 at threshold", value: formatScore(m.f1) },
                    { label: "Recall at threshold", value: formatPercent(m.recall, 0) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-[#EFF6FF] p-3 text-center">
                      <p className="font-display text-xl font-bold text-[#1565C0]">{s.value}</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-600">
                  Base rate {formatPercent(m.prevalence)} ({formatInt(m.positives)} of {formatInt(m.rows)} unit-weeks).
                  False alarms at the target-recall threshold: <strong>{m.false_alarms_per_district_month != null ? m.false_alarms_per_district_month.toFixed(2) : "—"}</strong> per unit per month.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No metrics saved for this task.</p>
            )}
            {e && (
              <p className="mt-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                Event level ({scenario} surveillance): flagged <strong>{formatInt(e.detected_events)}</strong> of <strong>{formatInt(e.eligible_events)}</strong> simulated events
                ({formatPercent(e.event_recall, 0)})
                {task === "m1" && e.median_lead_days != null && <>, median lead time <strong>{e.median_lead_days} days</strong> before the event</>}
                {task === "m2" && e.median_detection_delay_days != null && <>, median detection delay <strong>{e.median_detection_delay_days} days</strong> after onset</>}.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Catchment table and weekly counts ───────────────────────────────────────
function CatchmentReport() {
  const { board, units, homeUnit, date, scenario } = useMl();
  const [windowWeeks, setWindowWeeks] = useState<(typeof WINDOWS)[number]>(13);
  const { history, loading } = useUnitHistory(homeUnit, windowWeeks);
  const catchment = useMemo(() => [homeUnit, ...neighborIds(units, homeUnit)], [units, homeUnit]);
  const rows = catchment
    .map((id) => board?.units.find((u) => u.unit_id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  const points = (history?.points ?? []).map((p) => ({
    week: p.date.slice(5), date: p.date, opd: p.signals.opd_cases_7d ?? 0, asha: p.signals.asha_cases_7d ?? 0,
  }));

  const exportCsv = () => {
    downloadCsv(`catchment_${homeUnit}_${date ?? "week"}.csv`, [
      ["unit_id", "unit_name", "week", "scenario", "m1_score", "m1_tier", "m2_score", "m2_tier", "opd_cases_7d", "asha_cases_7d", "idsp_alerts_28d"],
      ...rows.map((u) => [
        u.unit_id, unitName(units, u.unit_id), date ?? "", scenario,
        unitScore(u, "m1") ?? "", unitTier(u, "m1") ?? "not scored",
        unitScore(u, "m2") ?? "", unitTier(u, "m2") ?? "not scored",
        u.signals.opd_cases_7d ?? "", u.signals.asha_cases_7d ?? "", u.signals.idsp_alerts_28d ?? "",
      ]),
    ]);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {WINDOWS.map((w) => (
            <button key={w} onClick={() => setWindowWeeks(w)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${windowWeeks === w ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
              Last {w} weeks
            </button>
          ))}
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
          📄 Download catchment CSV
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-display text-base font-bold text-[#0D1F1A]">Weekly counts · {unitName(units, homeUnit)}</h3>
        <p className="mb-4 text-xs text-gray-500">OPD and ASHA-reported 7-day counts for the last {points.length} weeks. These are inputs the model reads.</p>
        {loading ? <p className="text-sm text-gray-500">Loading weekly history…</p> : points.length === 0 ? (
          <p className="text-sm text-gray-500">No weekly history is available for this unit.</p>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={points} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: "monospace" }} tickLine={false} axisLine={false} width={34} />
              <Tooltip content={<CustomTooltip />} labelFormatter={(_, p) => formatWeek(p?.[0]?.payload?.date)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="opd" name="OPD (7d)" fill="#1565C0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="asha" name="ASHA-reported (7d)" fill="#E53935" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-display text-base font-bold text-[#0D1F1A]">Catchment units, week of {formatWeek(date)}</h3>
          <p className="text-xs text-gray-500">The hospital&apos;s unit and its neighbours. Scores rank units for review; they are not diagnoses.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider">
                {["Unit", "M1 early warning", "M2 detection", "OPD (7d)", "ASHA-reported (7d)", "IDSP alerts (28d)"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.unit_id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#0D1F1A]">
                    {unitName(units, u.unit_id)} <span className="font-mono text-[10px] text-gray-400">{u.unit_id}</span>{u.unit_id === homeUnit ? " · this hospital" : ""}
                  </td>
                  {(["m1", "m2"] as const).map((task) => (
                    <td key={task} className="px-5 py-3">
                      <span className="mr-2 font-mono text-xs text-gray-600">{formatScore(unitScore(u, task))}</span>
                      <TierBadge tier={unitTier(u, task)} />
                    </td>
                  ))}
                  <td className="px-5 py-3 font-mono text-[#1565C0] font-semibold">{formatInt(u.signals.opd_cases_7d)}</td>
                  <td className="px-5 py-3 font-mono text-[#E53935] font-semibold">{formatInt(u.signals.asha_cases_7d)}</td>
                  <td className="px-5 py-3 font-mono text-gray-600">{formatInt(u.signals.idsp_alerts_28d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </>
  );
}

// ─── Sample case records, counted from the entries on the Cases page ─────────
function SampleRecords() {
  const byCondition = countBy(ALL_CASES, (c) => c.disease);
  const pie = CASE_DISEASES.map((name) => ({ name, value: byCondition[name] ?? 0, color: CONDITION_COLORS[name] })).filter((d) => d.value > 0);
  const ages = AGE_GROUPS.map((g) => ({ group: g.group, cases: ALL_CASES.filter((c) => c.age >= g.min && c.age <= g.max).length }));
  const maxAge = Math.max(1, ...ages.map((a) => a.cases));
  const severe = ALL_CASES.filter((c) => c.severity === "SEVERE").length;
  const recovered = ALL_CASES.filter((c) => c.status === "Recovered").length;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Sample case records</h3>
        <p className="text-xs text-gray-500">Counted from the {ALL_CASES.length} demo entries on the Cases page. They are not model input or output.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Case entries", value: ALL_CASES.length, color: "#E53935" },
          { label: "Severe", value: severe, color: SEV_COLOR.SEVERE },
          { label: "Recovered", value: recovered, color: SEV_COLOR.RECOVERED },
          { label: "In model scope", value: ALL_CASES.length - (byCondition["Other (not modeled)"] ?? 0), color: "#1565C0" },
        ].map((a) => (
          <div key={a.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="font-display text-3xl font-bold" style={{ color: a.color }}>{a.value}</p>
            <p className="text-xs text-gray-500 mt-1">{a.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h4 className="font-display text-base font-bold text-[#0D1F1A] mb-4">By condition</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {pie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v} entries`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, fontFamily: "DM Sans" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h4 className="font-display text-base font-bold text-[#0D1F1A] mb-5">By age group</h4>
          <div className="space-y-3">
            {ages.map((ab) => (
              <div key={ab.group} className="flex items-center gap-4">
                <span className="text-xs font-mono font-bold text-gray-500 w-12 text-right">{ab.group}</span>
                <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(ab.cases / maxAge) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full flex items-center px-3" style={{ background: "linear-gradient(90deg,#1565C0,#42A5F5)", minWidth: ab.cases ? 28 : 0 }}>
                    <span className="text-white text-[10px] font-bold">{ab.cases || ""}</span>
                  </motion.div>
                </div>
                <span className="text-xs text-gray-400 font-mono w-14">{ab.cases} entries</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HospReports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Analytics & Reports</h2>
        <p className="text-sm text-gray-500">Results of the saved synthetic run, the hospital&apos;s catchment area, and the sample case records.</p>
      </div>

      <MlGate>
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">How the model performed</h3>
            <p className="mb-3 text-xs text-gray-500">Measured on simulated test worlds the model never saw during training. This says nothing about any real district.</p>
            <ModelResults />
          </div>
          <CatchmentReport />
          <div>
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Planning groups (clustering)</h3>
            <p className="mb-3 text-xs text-gray-500">Unsupervised groupings of areas and outbreaks, to plan staffing, supplies and surge capacity. They describe the simulation; they do not forecast it.</p>
            <ClusterBlock panels={["seasonal", "archetype", "events"]} />
          </div>
        </div>
      </MlGate>

      <SampleRecords />
    </div>
  );
}
