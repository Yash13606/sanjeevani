import { useMemo } from "react";
import { TIER_META, formatScore, unitScore, unitTier } from "@/lib/ml/risk";
import type { Board, TaskId, UnitProfile } from "@/lib/ml/types";

interface UnitMapProps {
  units: UnitProfile[];
  board: Board | undefined;
  task: TaskId;
  selectedId?: string | null;
  homeId?: string | null;
  /** When set, only these units are drawn (for example the neighbours an ASHA worker covers). */
  onlyIds?: string[];
  onSelect?: (unitId: string) => void;
  height?: number;
}

const W = 640;

/**
 * SVG map of the synthetic units, placed by their latitude/longitude. Colour is the model tier for the
 * chosen task; dot size follows population (square root, so large metros do not hide neighbours).
 */
export function UnitMap({ units, board, task, selectedId, homeId, onlyIds, onSelect, height = 380 }: UnitMapProps) {
  const visible = useMemo(() => (onlyIds ? units.filter((u) => onlyIds.includes(u.unit_id)) : units), [units, onlyIds]);

  const projection = useMemo(() => {
    const lats = visible.map((u) => u.lat);
    const lons = visible.map((u) => u.lon);
    if (lats.length === 0) return () => ({ x: W / 2, y: height / 2 });
    const pad = 0.25;
    const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
    const minLon = Math.min(...lons) - pad, maxLon = Math.max(...lons) + pad;
    // keep a true aspect ratio at this latitude so shapes are not stretched
    const meanLat = (minLat + maxLat) / 2;
    const lonScale = Math.cos((meanLat * Math.PI) / 180);
    const spanX = (maxLon - minLon) * lonScale;
    const spanY = maxLat - minLat;
    const scale = Math.min(W / spanX, height / spanY);
    const offsetX = (W - spanX * scale) / 2;
    const offsetY = (height - spanY * scale) / 2;
    return (lat: number, lon: number) => ({
      x: offsetX + (lon - minLon) * lonScale * scale,
      y: offsetY + (maxLat - lat) * scale,
    });
  }, [visible, height]);

  const byId = useMemo(() => Object.fromEntries((board?.units ?? []).map((u) => [u.unit_id, u])), [board]);
  const populations = visible.map((u) => u.population ?? 0);
  const maxPopulation = Math.max(1, ...populations);
  const radius = (u: UnitProfile) => 5 + 11 * Math.sqrt((u.population ?? 0) / maxPopulation);
  const labelled = (u: UnitProfile) => {
    const tier = unitTier(byId[u.unit_id], task);
    return u.unit_id === selectedId || u.unit_id === homeId || tier === "review" || Boolean(onlyIds);
  };

  return (
    <div style={{ background: "linear-gradient(180deg, #EBF5F0 0%, #D6EEE5 100%)" }}>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ maxHeight: 560, display: "block" }} role="img"
        aria-label="Map of synthetic units coloured by model review tier">
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`v${i}`} x1={i * (W / 6)} y1={0} x2={i * (W / 6)} y2={height} stroke="#C8E6D4" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * (height / 4)} x2={W} y2={i * (height / 4)} stroke="#C8E6D4" strokeWidth="0.5" />
        ))}

        {visible.map((u) => {
          const unit = byId[u.unit_id];
          const tier = unitTier(unit, task);
          const { x, y } = projection(u.lat, u.lon);
          const r = radius(u);
          const color = tier ? TIER_META[tier].color : "#9CA3AF";
          const selected = u.unit_id === selectedId;
          const home = u.unit_id === homeId;
          return (
            <g key={u.unit_id} onClick={() => onSelect?.(u.unit_id)} style={{ cursor: onSelect ? "pointer" : "default" }}>
              <title>
                {`${u.name.replace(/_/g, " ")} (${u.unit_id}) · ${task.toUpperCase()} score ${formatScore(unitScore(unit, task))}${tier ? ` · ${TIER_META[tier].label}` : ""}`}
              </title>
              {tier === "review" && (
                <circle cx={x} cy={y} r={r * 1.5} fill={color} opacity="0.1">
                  <animate attributeName="r" values={`${r * 1.1};${r * 1.9};${r * 1.1}`} dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.14;0;0.14" dur="2.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x} cy={y} r={selected ? r + 3 : r} fill={color} opacity={tier ? 0.75 : 0.45}
                stroke={home ? "#0D1F1A" : "white"} strokeWidth={home || selected ? 3 : 1.5} />
              {labelled(u) && (
                <text x={x} y={y - r - 4} textAnchor="middle" fontSize="9" fontFamily="DM Sans, sans-serif" fontWeight="700" fill={color === "#9CA3AF" ? "#6B7280" : color}>
                  {u.name.replace(/_/g, " ")}
                </text>
              )}
            </g>
          );
        })}

        <g transform={`translate(12, ${height - 84})`}>
          <rect x="-4" y="-6" width="178" height="84" rx="8" fill="white" opacity="0.92" />
          {[
            { color: TIER_META.review.color, label: "Review (score ≥ F1 threshold)" },
            { color: TIER_META.watch.color, label: "Watch (≥ target-recall threshold)" },
            { color: TIER_META.routine.color, label: "Routine" },
            { color: "#9CA3AF", label: task === "m1" ? "Not scored (event already active)" : "Not scored" },
          ].map((l, i) => (
            <g key={l.label} transform={`translate(4, ${i * 16})`}>
              <circle cx="6" cy="6" r="5" fill={l.color} opacity="0.8" />
              <text x="16" y="10" fontSize="8.5" fontFamily="DM Sans, sans-serif" fill="#374151">{l.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
