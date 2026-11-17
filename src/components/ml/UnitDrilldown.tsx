import { TASK_META, formatScore, observedSignals, tierExplanation, unitScore, unitTier } from "@/lib/ml/risk";
import type { BoardUnit, ModelMeta, TaskId, UnitProfile } from "@/lib/ml/types";
import { SignalPanel } from "./SignalPanel";
import { TierBadge } from "./TierBadge";

/** One unit's M1 + M2 results and the signals behind them, for ASHA and hospital views. */
export function UnitDrilldown({
  profile, unit, models, showOutcome = false,
}: {
  profile: UnitProfile | undefined;
  unit: BoardUnit | undefined;
  models: Record<TaskId, ModelMeta> | undefined;
  /** Evaluation only: the simulated truth, which a real deployment would not know. */
  showOutcome?: boolean;
}) {
  if (!unit) return <p className="text-sm text-gray-500">This unit has no saved scores for the selected week.</p>;
  const drivers = observedSignals(unit.signals);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["m1", "m2"] as const).map((task) => (
          <div key={task} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{TASK_META[task].short} · {TASK_META[task].name}</p>
            <div className="mt-1 flex items-end justify-between">
              <span className="font-display text-3xl font-bold text-[#0D1F1A]">{formatScore(unitScore(unit, task))}</span>
              <TierBadge tier={unitTier(unit, task)} />
            </div>
            <p className="mt-1 text-[11px] text-gray-500">{TASK_META[task].question}</p>
            {task === "m1" && !unit.m1_in_risk_set && (
              <p className="mt-1 text-[11px] text-gray-500">An event is already active here, so early warning does not apply this week.</p>
            )}
            {showOutcome && unit[task]?.outcome != null && (
              <p className="mt-1 text-[11px] text-gray-500">Simulated outcome (evaluation only): {unit[task]?.outcome === 1 ? "yes" : "no"}</p>
            )}
          </div>
        ))}
      </div>

      {profile && (
        <p className="text-xs text-gray-500">
          {profile.name.replace(/_/g, " ")} · {(profile.type ?? "unit").replace(/_/g, " ")} · population {profile.population?.toLocaleString("en-IN") ?? "—"} ·
          sanitation coverage {profile.sanitation_coverage != null ? `${Math.round(profile.sanitation_coverage * 100)}%` : "—"}
        </p>
      )}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Signals seen this week</h4>
        {drivers.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing unusual in the observed signals.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {drivers.map((d) => (<li key={d}>{d}</li>))}
          </ul>
        )}
        <p className="mt-2 text-[10px] text-gray-400">These are inputs the model received, not a diagnosis of the cause.</p>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Water and weather inputs</h4>
        <SignalPanel signals={unit.signals} />
      </div>

      <p className="text-[10px] leading-4 text-gray-400">{tierExplanation("m1", models?.m1)}</p>
    </div>
  );
}
