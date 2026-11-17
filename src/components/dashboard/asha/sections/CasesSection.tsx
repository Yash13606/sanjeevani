import { useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CASES_DATA, SEV_BG, SEV_COLOR, SEV_EMOJI, type CaseDisease } from "../ashaData";
import { MlGate } from "@/components/ml/MlGate";
import { useMl, useUnitHistory } from "@/lib/ml/MlContext";
import { formatInt, formatWeek, unitName } from "@/lib/ml/risk";

type DiseaseFilter = "All" | CaseDisease;
const FILTERS: DiseaseFilter[] = ["All", "Cholera (suspected)", "Acute diarrheal disease", "Other (not modeled)"];

// ─── Weekly counts the model reads, and the scores it produced ───────────────
function UnitTrend() {
  const { homeUnit, units, models } = useMl();
  const { history, loading, error } = useUnitHistory(homeUnit, 26);
  const points = (history?.points ?? []).map((p) => ({
    week: p.date.slice(5),
    date: p.date,
    asha: p.signals.asha_cases_7d ?? null,
    opd: p.signals.opd_cases_7d ?? null,
    m1: p.m1?.score ?? null,
    m2: p.m2?.score ?? null,
  }));

  if (loading) return <p className="text-sm text-gray-500">Loading weekly history…</p>;
  if (error || points.length === 0) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error ?? "No weekly history is available for this unit."}</p>;
  }
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const delta = previous && latest.asha != null && previous.asha != null ? latest.asha - previous.asha : null;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Reported cases per week</h3>
        <p className="text-xs text-gray-500">
          {unitName(units, homeUnit)} · ASHA-reported and OPD cases over the last {points.length} weeks. These counts are model inputs.
        </p>
        <p className="mt-3 text-sm text-gray-700">
          This week: <strong>{formatInt(latest.asha)}</strong> ASHA-reported
          {delta != null && <span className={delta > 0 ? "text-[#E53935]" : "text-[#43A047]"}> ({delta > 0 ? "+" : ""}{formatInt(delta)} vs last week)</span>}
          {" · "}<strong>{formatInt(latest.opd)}</strong> OPD
        </p>
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip labelFormatter={(_, payload) => formatWeek(payload?.[0]?.payload?.date)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="asha" name="ASHA-reported (7d)" stroke="#E53935" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="opd" name="OPD (7d)" stroke="#1565C0" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Model scores per week</h3>
        <p className="text-xs text-gray-500">
          M1 early warning and M2 detection. Dashed lines are the validation F1 thresholds: a score above its line is in the Review tier.
        </p>
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={points} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} width={32} />
              <Tooltip labelFormatter={(_, payload) => formatWeek(payload?.[0]?.payload?.date)} formatter={(v: number) => (typeof v === "number" ? v.toFixed(3) : "—")} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              {models?.m1.f1_threshold != null && <ReferenceLine y={models.m1.f1_threshold} stroke="#FB8C00" strokeDasharray="4 4" />}
              {models?.m2.f1_threshold != null && <ReferenceLine y={models.m2.f1_threshold} stroke="#1565C0" strokeDasharray="4 4" />}
              <Line type="monotone" dataKey="m1" name="M1 early warning" stroke="#FB8C00" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
              <Line type="monotone" dataKey="m2" name="M2 detection" stroke="#1565C0" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">Gaps in M1 are weeks when an event was already active here, so early warning does not apply.</p>
      </div>
    </div>
  );
}

// ─── Cases Section ────────────────────────────────────────────────────────────
export default function CasesSection() {
  const [filter, setFilter] = useState<DiseaseFilter>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const { units } = useMl();
  const cases = CASES_DATA.filter((c) => filter === "All" || c.disease === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Cases</h2>
        <p className="text-sm text-gray-500">Weekly counts for your unit (read by the model) and your case entries (sample list)</p>
      </div>

      <MlGate>
        <UnitTrend />
      </MlGate>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Case entries</h3>
            <p className="text-xs text-gray-500">Sample entries for the demo. The model covers cholera and acute diarrheal disease only.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {cases.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-gray-100">
              <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ background: SEV_BG[c.severity] }}>
                <span className="font-mono text-xs font-bold text-[#0D1F1A]">{c.id}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold" style={{ color: SEV_COLOR[c.severity] }}>
                  {SEV_EMOJI[c.severity]} {c.severity}
                </span>
              </div>
              <div className="space-y-2 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">{c.patient} · {c.gender}, {c.age} · {c.disease}</p>
                <div className="flex flex-wrap gap-1">
                  {c.symptoms.map((s) => (<span key={s} className="rounded-full bg-[#FFEBEE] px-2 py-0.5 text-[10px] font-medium text-[#E53935]">{s}</span>))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{c.status} · {c.reported}</span>
                  <span>📍 {unitName(units, c.unitId)} ({c.unitId})</span>
                </div>
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="text-xs font-semibold text-[#0D7A4A] hover:underline">
                  {openId === c.id ? "Hide notes" : "View notes"}
                </button>
                {openId === c.id && <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{c.notes}</p>}
              </div>
            </motion.div>
          ))}
          {cases.length === 0 && <p className="text-sm text-gray-500">No entries in this category.</p>}
        </div>
      </div>
    </div>
  );
}
