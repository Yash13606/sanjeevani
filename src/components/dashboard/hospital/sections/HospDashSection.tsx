import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MODELED_DISEASES, RECENT_CASES, SEV_BG, SEV_COLOR, SEV_EMOJI } from "../hospitalData";
import { ClusterBlock } from "@/components/ml/ClusterPanels";
import { MlGate } from "@/components/ml/MlGate";
import { TaskToggle } from "@/components/ml/TaskToggle";
import { TierBadge } from "@/components/ml/TierBadge";
import { UnitDrilldown } from "@/components/ml/UnitDrilldown";
import { UnitMap } from "@/components/ml/UnitMap";
import { useMl, useUnitHistory } from "@/lib/ml/MlContext";
import {
  TASK_META, TIER_META, formatInt, formatScore, formatWeek, neighborIds, rankUnits, unitName, unitScore, unitTier,
} from "@/lib/ml/risk";
import type { TaskId, Tier } from "@/lib/ml/types";

// ─── Model-driven part of the dashboard ───────────────────────────────────────
function CatchmentPanel() {
  const { board, units, homeUnit, models, date } = useMl();
  const [task, setTask] = useState<TaskId>("m1");
  const [selectedChoice, setSelected] = useState<string | null>(null);
  // The hospital's catchment: its own unit plus the neighbouring units listed in the unit profiles
  const catchment = useMemo(() => [homeUnit, ...neighborIds(units, homeUnit)], [units, homeUnit]);
  const selected = selectedChoice && catchment.includes(selectedChoice) ? selectedChoice : homeUnit;
  const { history } = useUnitHistory(homeUnit, 26);

  const home = board?.units.find((u) => u.unit_id === homeUnit);
  const covered = catchment.map((id) => board?.units.find((u) => u.unit_id === id)).filter((u): u is NonNullable<typeof u> => Boolean(u));
  const flagged = (tier: Tier) => covered.filter((u) => unitTier(u, task) === tier).length;
  const homeTier = unitTier(home, task);
  const selectedUnit = board?.units.find((u) => u.unit_id === selected);
  const ranked = rankUnits(board, task).filter((u) => catchment.includes(u.unit_id));

  const points = (history?.points ?? []).map((p) => ({
    week: p.date.slice(5), date: p.date,
    opd: p.signals.opd_cases_7d ?? null, asha: p.signals.asha_cases_7d ?? null,
    m1: p.m1?.score ?? null, m2: p.m2?.score ?? null,
  }));
  const opd = home?.signals.opd_cases_7d ?? null;
  const opdChange = home?.signals.opd_trend_7d ?? null; // this week's OPD count minus last week's

  return (
    <>
      {/* 1 — Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">OPD cases this week</p>
          <div className="flex items-end gap-3 mb-2">
            <span className="font-display text-5xl font-bold" style={{ color: "#1565C0" }}>{formatInt(opd)}</span>
            {opdChange != null && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full mb-1.5"
                style={{ background: opdChange > 0 ? "#FFEBEE" : "#E8F5E9", color: opdChange > 0 ? "#E53935" : "#43A047" }}>
                {opdChange > 0 ? "↑ +" : opdChange < 0 ? "↓ " : "→ "}{formatInt(opdChange)} vs last week
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">{unitName(units, homeUnit)} · 7-day OPD count the model reads as input</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{TASK_META[task].name} · hospital unit</p>
            <TierBadge tier={homeTier} />
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="font-display text-5xl font-bold" style={{ color: TIER_META[homeTier ?? "routine"].color }}>{formatScore(unitScore(home, task))}</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {task === "m1" && !home?.m1 ? "An event is already active here, so early warning does not apply this week."
              : `Review at ≥ ${models?.[task].f1_threshold?.toFixed(3) ?? "—"}, Watch at ≥ ${models?.[task].recall_threshold?.toFixed(3) ?? "—"}`}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Flags in the catchment area</p>
          <div className="flex items-end gap-3 mb-2">
            <span className="font-display text-5xl font-bold text-[#E53935]">{flagged("review") + flagged("watch")}</span>
            <span className="mb-1.5 text-xs text-gray-500">of {covered.length} units</span>
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs font-semibold">
            <span className="text-[#E53935]">🔴 {flagged("review")} Review</span>
            <span className="text-[#FB8C00]">🟠 {flagged("watch")} Watch</span>
            <span className="text-[#43A047]">🟢 {flagged("routine")} Routine</span>
          </div>
        </motion.div>
      </div>

      {/* 2 — Map + review list */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Catchment Area Map</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{unitName(units, homeUnit)} and {catchment.length - 1} neighbouring units · week of {formatWeek(date)}</p>
            </div>
            <TaskToggle task={task} onChange={setTask} />
          </div>
          <UnitMap units={units} board={board} task={task} onlyIds={catchment} homeId={homeUnit} selectedId={selected} onSelect={setSelected} height={330} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A] mb-3">Review list</h3>
          <div className="space-y-2">
            {ranked.map((u) => (
              <button key={u.unit_id} onClick={() => setSelected(u.unit_id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${selected === u.unit_id ? "border-[#1565C0] bg-[#F5F9FF]" : "border-gray-100 hover:bg-gray-50"}`}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: unitTier(u, task) ? TIER_META[unitTier(u, task) as Tier].color : "#9CA3AF" }} />
                <span className="flex-1 text-sm font-medium text-[#0D1F1A] truncate">{unitName(units, u.unit_id)}{u.unit_id === homeUnit ? " · this hospital" : ""}</span>
                <span className="font-mono text-xs text-gray-500">{formatScore(unitScore(u, task))}</span>
                <TierBadge tier={unitTier(u, task)} />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">Highest score first. A score ranks areas for review; it is not a diagnosis or a bed-demand forecast.</p>
        </motion.div>
      </div>

      {/* 3 — Weekly trend */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Weekly counts and model scores · {unitName(units, homeUnit)}</h3>
          <p className="text-xs text-gray-500">Last {points.length} weeks. Counts are model inputs; dashed lines are the validation F1 thresholds (a score above its line is in the Review tier).</p>
        </div>
        {points.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">No weekly history is available for this unit.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={points} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} width={40} />
                <Tooltip labelFormatter={(_, payload) => formatWeek(payload?.[0]?.payload?.date)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="opd" name="OPD (7d)" stroke="#1565C0" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="asha" name="ASHA-reported (7d)" stroke="#E53935" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={230}>
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
        )}
        <p className="mt-2 text-[11px] text-gray-400">Gaps in M1 are weeks when an event was already active here, so early warning does not apply.</p>
      </motion.div>

      {/* 4 — Drilldown */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-display text-lg font-bold text-[#0D1F1A] mb-4">{unitName(units, selected)}: what the model saw</h3>
        <UnitDrilldown profile={units.find((u) => u.unit_id === selected)} unit={selectedUnit} models={models} />
      </motion.div>

      {/* 5 — Clustering: what kind of week, how well watched, and which neighbours are flagged together */}
      <ClusterBlock panels={["regime", "coverage", "hotspots", "hotspots-m2"]} unitId={homeUnit} />
    </>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
export default function HospDashSection() {
  const { units } = useMl();
  return (
    <div className="space-y-6">
      <MlGate>
        <CatchmentPanel />
      </MlGate>

      {/* Recent case entries (sample records) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-5">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Recent case entries (sample records)</h3>
          <p className="text-xs text-gray-500">Demo entries for the hospital workflow. The model covers cholera and acute diarrheal disease only and does not read these records.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RECENT_CASES.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: SEV_BG[c.severity] }}>
                <span className="font-mono text-xs font-bold text-[#0D1F1A]">{c.id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: SEV_COLOR[c.severity], background: "white" }}>
                  {SEV_EMOJI[c.severity]} {c.severity}
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-gray-500 font-medium">{c.gender}, {c.age} · {c.disease}</p>
                <div className="flex flex-wrap gap-1">
                  {c.symptoms.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFEBEE] text-[#E53935]">{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="font-semibold px-2 py-0.5 rounded-full" style={{ background: SEV_BG[c.severity], color: SEV_COLOR[c.severity] }}>{c.status}</span>
                  <span>📍 {unitName(units, c.unitId)} · {c.reported}, 2026</span>
                </div>
                {!MODELED_DISEASES.includes(c.disease) && <p className="text-[10px] text-gray-400">Outside the model&apos;s scope (not cholera or acute diarrheal disease).</p>}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
