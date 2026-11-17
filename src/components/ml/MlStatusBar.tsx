import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useMl } from "@/lib/ml/MlContext";
import { DISCLAIMER, formatWeek, unitName } from "@/lib/ml/risk";

const SCENARIO_LABEL: Record<string, string> = {
  baseline: "Baseline surveillance",
  improved: "Improved surveillance",
  enhanced: "Enhanced surveillance",
};

const selectClass =
  "rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-300";

/**
 * Provenance strip shown at the top of every dashboard: what the numbers are (a saved synthetic run),
 * which model and week, and where they were read from. Also lets the viewer pick the area, week and scenario.
 */
export function MlStatusBar({ areaLabel = "Area" }: { areaLabel?: string }) {
  const navigate = useNavigate();
  const { weeks, scenario, setScenario, date, setDate, units, homeUnit, setHomeUnit, models, board, source, refresh } = useMl();
  const dates = weeks?.dates ?? [];
  const modelName = models?.m1.model_name || models?.m2.model_name;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-950">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          <strong>Synthetic simulation.</strong> {DISCLAIMER}
        </span>
        <button type="button" onClick={() => navigate("/ml-lab")} className="font-semibold underline">
          Open ML Lab
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label className="flex items-center gap-1.5">
          <span className="font-semibold">{areaLabel}</span>
          <select className={selectClass} value={homeUnit} onChange={(e) => setHomeUnit(e.target.value)} aria-label={areaLabel}>
            {units.map((u) => (
              <option key={u.unit_id} value={u.unit_id}>{u.name.replace(/_/g, " · ")} ({u.unit_id})</option>
            ))}
            {units.length === 0 && <option value={homeUnit}>{homeUnit}</option>}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-semibold">Week of</span>
          <select className={selectClass} value={date ?? ""} onChange={(e) => setDate(e.target.value)} aria-label="Decision week">
            {[...dates].reverse().map((d) => (<option key={d} value={d}>{formatWeek(d)}</option>))}
          </select>
        </label>
        {(weeks?.scenarios.length ?? 0) > 1 && (
          <label className="flex items-center gap-1.5">
            <span className="font-semibold">Surveillance</span>
            <select className={selectClass} value={scenario} onChange={(e) => setScenario(e.target.value)} aria-label="Surveillance scenario">
              {weeks?.scenarios.map((s) => (<option key={s} value={s}>{SCENARIO_LABEL[s] ?? s}</option>))}
            </select>
          </label>
        )}
        <span className="text-amber-900/80">
          {board ? `${modelName ?? "model"} · run ${board.run_id} · ${board.world_id} · ${unitName(units, homeUnit)}` : "waiting for the saved run…"}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-bold ${source === "live" ? "bg-green-100 text-green-800" : "bg-amber-200 text-amber-950"}`}>
          {source === "live" ? "Local ML service" : source === "snapshot" ? "Bundled snapshot (service offline)" : "…"}
        </span>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-1 font-semibold underline" aria-label="Reload model data">
          <RefreshCw className="h-3 w-3" /> Reload
        </button>
      </div>
    </div>
  );
}
