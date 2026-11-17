import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MlGate } from "@/components/ml/MlGate";
import { SignalPanel } from "@/components/ml/SignalPanel";
import { TaskToggle } from "@/components/ml/TaskToggle";
import { TierBadge } from "@/components/ml/TierBadge";
import { UnitMap } from "@/components/ml/UnitMap";
import { useMl } from "@/lib/ml/MlContext";
import {
  DISCLAIMER, TASK_META, TIER_META, TIER_ORDER, formatInt, formatScore, formatWeek, rankUnits, tierCounts,
  tierExplanation, unitName, unitScore, unitTier,
} from "@/lib/ml/risk";
import type { TaskId, Tier } from "@/lib/ml/types";

function RiskMap() {
  const { board, units, homeUnit, date, models } = useMl();
  const [task, setTask] = useState<TaskId>("m1");
  const [filter, setFilter] = useState<"All" | Tier>("All");
  const [selected, setSelected] = useState<string | null>(null);

  const counts = tierCounts(board, task);
  const ranked = useMemo(() => rankUnits(board, task), [board, task]);
  const table = ranked.filter((u) => filter === "All" || unitTier(u, task) === filter);
  const active = board?.units.find((u) => u.unit_id === (selected ?? homeUnit));
  const activeProfile = units.find((u) => u.unit_id === (selected ?? homeUnit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Health Risk Map</h2>
          <p className="text-sm text-gray-500">
            {units.length} synthetic Tamil Nadu-style units · model tier per unit · week of {formatWeek(date)}
          </p>
        </div>
        <TaskToggle task={task} onChange={(next) => { setTask(next); setFilter("All"); }} />
      </div>

      {/* Controls bar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          {(["All", ...TIER_ORDER] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
              {f === "All" ? "All" : `${TIER_META[f].emoji} ${TIER_META[f].label}`}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">{TASK_META[task].question}</p>
      </motion.div>

      {/* Map + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <UnitMap
            units={units}
            board={board}
            task={task}
            homeId={homeUnit}
            selectedId={selected}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">{selected ? "Selected unit" : "Your area"}</p>
          <h3 className="font-display text-lg font-bold text-[#0D1F1A]">{unitName(units, selected ?? homeUnit)}</h3>
          <p className="text-xs font-mono text-gray-400 mb-3">
            {selected ?? homeUnit}
            {activeProfile?.population ? ` · population ${formatInt(activeProfile.population)}` : ""}
          </p>
          <div className="mb-4 flex items-end justify-between rounded-xl bg-gray-50 p-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">{TASK_META[task].short} score</p>
              <p className="font-display text-3xl font-bold text-[#0D1F1A]">{formatScore(unitScore(active, task))}</p>
            </div>
            <TierBadge tier={unitTier(active, task)} />
          </div>
          {active ? <SignalPanel signals={active.signals} compact /> : <p className="text-sm text-gray-500">No saved scores for this unit.</p>}
          <p className="mt-4 text-[10px] leading-4 text-gray-400">{tierExplanation(task, models?.[task])}</p>
        </motion.div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ...TIER_ORDER.map((tier) => ({ label: `${TIER_META[tier].label} units`, count: counts[tier], color: TIER_META[tier].color, bg: TIER_META[tier].bg })),
          { label: "Not scored", count: counts.unscored, color: "#6B7280", bg: "#F3F4F6" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 border" style={{ background: s.bg, borderColor: `${s.color}33` }}>
            <p className="font-display text-3xl font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: s.color }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Unit table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Unit Risk Table</h3>
          <p className="text-xs text-gray-400">Sorted by {TASK_META[task].short} score (high → low) · {table.length} units shown</p>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider">
                {["Unit", "ID", `${TASK_META[task].short} score`, "Tier", "ASHA cases (7d)", "Turbidity", "Free Cl", "E. coli"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row) => {
                const tier = unitTier(row, task);
                const online = (row.signals.sensor_uptime_7d ?? 0) > 0;
                return (
                  <tr key={row.unit_id} onClick={() => setSelected(row.unit_id)}
                    className={`border-t border-gray-50 hover:bg-[#F8FFFE] transition-colors cursor-pointer ${row.unit_id === homeUnit ? "bg-[#F4FBF8]" : ""}`}>
                    <td className="px-5 py-3 font-medium text-[#0D1F1A] whitespace-nowrap">
                      <span className="mr-1.5">{tier ? TIER_META[tier].emoji : "⚪"}</span>{unitName(units, row.unit_id)}
                      {row.unit_id === homeUnit && <span className="ml-2 text-[10px] font-bold text-[#0D7A4A]">YOUR AREA</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-500 text-xs">{row.unit_id}</td>
                    <td className="px-5 py-3 font-mono text-xs font-bold">{formatScore(unitScore(row, task))}</td>
                    <td className="px-5 py-3"><TierBadge tier={tier} /></td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-700">{formatInt(row.signals.asha_cases_7d)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{online && row.signals.turbidity_mean_7d != null ? `${row.signals.turbidity_mean_7d.toFixed(1)} NTU` : "no reading"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{online && row.signals.chlorine_mean_7d != null ? `${row.signals.chlorine_mean_7d.toFixed(2)} mg/L` : "no reading"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{row.signals.ecoli_last_cfu != null ? `${row.signals.ecoli_last_cfu.toFixed(1)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
      <p className="text-[11px] leading-4 text-gray-400">{DISCLAIMER}</p>
    </div>
  );
}

export default function HealthMapSection() {
  return (
    <MlGate>
      <RiskMap />
    </MlGate>
  );
}
