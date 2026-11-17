import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { MlGate } from "@/components/ml/MlGate";
import { SignalPanel } from "@/components/ml/SignalPanel";
import { TaskToggle } from "@/components/ml/TaskToggle";
import { TierBadge } from "@/components/ml/TierBadge";
import { useMl } from "@/lib/ml/MlContext";
import {
  DISCLAIMER, TASK_META, TIER_META, formatScore, formatWeek, neighborIds, observedSignals, rankUnits,
  tierExplanation, unitName, unitScore, unitTier,
} from "@/lib/ml/risk";
import type { BoardUnit, TaskId, Tier } from "@/lib/ml/types";

type Scope = "near" | "all";
type TierFilter = "flagged" | "review" | "watch";

const PRECAUTIONS = [
  "Boil all drinking water for at least 10 minutes, or use a certified purifier",
  "Avoid raw foods washed with untreated water",
  "Use ORS if you have diarrhea or vomiting",
  "Report symptoms to your ASHA worker early",
  "Seek care at your nearest health facility if symptoms last beyond 24 hours",
];

// ─── Flag Detail Slide-over ───────────────────────────────────────────────────
function FlagDetail({ unit, task, onClose }: { unit: BoardUnit; task: TaskId; onClose: () => void }) {
  const { units, board, models, date } = useMl();
  const tier = unitTier(unit, task) ?? "routine";
  const meta = TIER_META[tier];
  const seen = observedSignals(unit.signals);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-[480px] bg-white shadow-2xl overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0D1F1A]">{unitName(units, unit.unit_id)}</h2>
            <p className="text-xs text-gray-400 font-mono">{unit.unit_id} · {board?.world_id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4" style={{ background: meta.bg, borderBottom: `3px solid ${meta.color}` }}>
          <p className="text-sm font-bold" style={{ color: meta.color }}>
            {meta.emoji} {meta.label.toUpperCase()} · {TASK_META[task].name}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">Model score {formatScore(unitScore(unit, task))} · week of {formatWeek(date)}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Model question", value: TASK_META[task].question },
              { label: "Model", value: models?.[task].model_name || "saved model" },
              { label: "Source", value: "Saved synthetic run" },
              { label: "Surveillance", value: board?.scenario ?? "—" },
            ].map((info) => (
              <div key={info.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{info.label}</p>
                <p className="text-sm font-semibold text-[#0D1F1A]">{info.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">What this means</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{tierExplanation(task, models?.[task])}</p>
            <p className="mt-2 text-xs text-gray-500">This is a ranking for follow-up. It does not mean anyone in this area is ill.</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Signals seen this week</h4>
            {seen.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing unusual in the observed signals.</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">{seen.map((s) => (<li key={s}>{s}</li>))}</ul>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <SignalPanel signals={unit.signals} compact />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">General precautions</h4>
            <ol className="space-y-2">
              {PRECAUTIONS.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-[#0D1F1A] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="text-[11px] leading-4 text-gray-400">{DISCLAIMER}</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Alerts Section ──────────────────────────────────────────────────────────
function Flags() {
  const { board, units, homeUnit, date } = useMl();
  const [task, setTask] = useState<TaskId>("m1");
  const [scope, setScope] = useState<Scope>("near");
  const [filter, setFilter] = useState<TierFilter>("flagged");
  const [selected, setSelected] = useState<string | null>(null);

  const nearIds = useMemo(() => new Set([homeUnit, ...neighborIds(units, homeUnit)]), [units, homeUnit]);
  const home = board?.units.find((u) => u.unit_id === homeUnit);
  const homeTier = unitTier(home, task);

  const rows = useMemo(() => {
    const wanted: Tier[] = filter === "flagged" ? ["review", "watch"] : [filter];
    return rankUnits(board, task).filter((u) => {
      const tier = unitTier(u, task);
      return tier !== null && wanted.includes(tier) && (scope === "all" || nearIds.has(u.unit_id));
    });
  }, [board, task, scope, filter, nearIds]);

  const selectedUnit = board?.units.find((u) => u.unit_id === selected) ?? null;

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Area Flags</h2>
          <p className="text-sm text-gray-500 mt-0.5">Model review flags · week of {formatWeek(date)}</p>
        </div>
        <TaskToggle task={task} onChange={setTask} />
      </div>
      <p className="text-xs text-gray-500 -mt-3">{TASK_META[task].question}</p>

      {/* Personal banner */}
      <div className="rounded-2xl border p-5 flex items-center gap-5" style={{ background: TIER_META[homeTier ?? "routine"].bg, borderColor: `${TIER_META[homeTier ?? "routine"].color}33` }}>
        <div className="text-3xl">{TIER_META[homeTier ?? "routine"].emoji}</div>
        <div className="flex-1">
          <p className="font-semibold text-[#0D1F1A] text-sm">
            Your area ({unitName(units, homeUnit)}) —{" "}
            <span style={{ color: TIER_META[homeTier ?? "routine"].color }}>
              {homeTier ? TIER_META[homeTier].label.toUpperCase() : "NOT SCORED THIS WEEK"}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {homeTier ? `Model score ${formatScore(unitScore(home, task))}` : task === "m1" ? "A simulated event is already active here, so early warning does not apply." : "No score saved."}
            {" · "}Simulated run {board?.run_id}
          </p>
        </div>
        <TierBadge tier={homeTier} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {([["near", "My area & neighbours"], ["all", "All units"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setScope(id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${scope === id ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
            {label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-200" />
        {([["flagged", "All flagged"], ["review", "🔴 Review"], ["watch", "🟠 Watch"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === id ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
          No units match these filters this week. Try “All units” or another week.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((unit) => {
            const tier = unitTier(unit, task) as Tier;
            const seen = observedSignals(unit.signals);
            return (
              <motion.div key={unit.unit_id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-1" style={{ background: TIER_META[tier].color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold text-[#0D1F1A] text-base leading-tight">{unitName(units, unit.unit_id)}</h3>
                      <span className="text-xs font-mono text-gray-400">{unit.unit_id}{unit.unit_id === homeUnit ? " · your area" : ""}</span>
                    </div>
                    <TierBadge tier={tier} />
                  </div>
                  <div className="h-px bg-gray-100 my-3" />
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-display text-2xl font-bold text-[#0D1F1A]">{formatScore(unitScore(unit, task))}</span>
                    <span className="ml-2 text-xs text-gray-400">model score</span>
                  </p>
                  <p className="text-[11px] text-gray-500 line-clamp-2 min-h-[2rem]">{seen.slice(0, 2).join(" · ") || "No unusual signals in the observed inputs"}</p>
                  <div className="h-px bg-gray-100 my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Week of {formatWeek(date)}</span>
                    <button onClick={() => setSelected(unit.unit_id)} className="text-xs font-semibold text-[#0D7A4A] hover:underline">
                      View Details →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedUnit && <FlagDetail unit={selectedUnit} task={task} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}

export default function AlertsSection() {
  return (
    <div className="space-y-6">
      <MlGate>
        <Flags />
      </MlGate>
    </div>
  );
}
