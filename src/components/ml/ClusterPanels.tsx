import type { ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMl } from "@/lib/ml/MlContext";
import { TASK_META, formatInt, formatPercent, unitName } from "@/lib/ml/risk";
import type { ClusterReport, Hotspot, TaskId, UnitProfile } from "@/lib/ml/types";

// ─── Shared helpers ──────────────────────────────────────────────────────────
const PALETTE = ["#43A047", "#9CCC65", "#FDD835", "#FB8C00", "#F4511E", "#C62828"];
/** Clusters are ordered from calmest to most outbreak-heavy, so index maps onto a green-to-red scale. */
const clusterColor = (index: number, count: number) =>
  PALETTE[count <= 1 ? 0 : Math.round((index * (PALETTE.length - 1)) / (count - 1))];

const CARD = "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm";
const NOTE = "text-[11px] leading-4 text-gray-400";

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ color, background: `${color}1F` }}>
      {label}
    </span>
  );
}

/** Loads the clusterings for the selected week and renders children once they are available. */
export function ClusterGate({ children }: { children: (clusters: ClusterReport) => ReactNode }) {
  const { clusters, clustersLoading, clustersError, refresh } = useMl();
  if (clustersLoading && !clusters) {
    return <div className={`${CARD} text-sm text-gray-500`} aria-live="polite">Fitting the cluster groups from the saved run… (the first load can take a minute)</div>;
  }
  if (!clusters) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950" role="alert">
        <p className="font-semibold">Cluster groups are not available for this week.</p>
        <p className="mt-1">{clustersError ?? "No clusterings were returned."}</p>
        <button type="button" onClick={refresh} className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold">Try again</button>
      </div>
    );
  }
  return <>{children(clusters)}</>;
}

// ─── 1. Weekly regime: "what kind of week is this?" ─────────────────────────
export function RegimePanel({ clusters, unitId, units }: { clusters: ClusterReport; unitId: string; units: UnitProfile[] }) {
  const { regimes, week } = clusters;
  const id = week?.unit_regime[unitId];
  const current = id != null ? regimes.clusters[id] : undefined;
  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Weekly regime · clustering</p>
      <h3 className="font-display text-lg font-bold text-[#0D1F1A]">What kind of week is this for {unitName(units, unitId)}?</h3>
      {current ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip label={current.name} color={clusterColor(current.id, regimes.k)} />
            <span className="text-xs text-gray-500">regime {current.id + 1} of {regimes.k}, ordered calm to hot</span>
          </div>
          <p className="mt-3 text-sm text-gray-700">
            In held-out test weeks that looked like this, <strong>{formatPercent(current.m2_active_rate, 0)}</strong> of unit-weeks had an active simulated
            outbreak ({current.m2_lift != null ? `${current.m2_lift.toFixed(1)}×` : "—"} the average of {formatPercent(regimes.baseline.m2_active_rate, 0)}) and
            <strong> {formatPercent(current.m1_onset_rate, 1)}</strong> saw a new one start within 7 days
            ({current.m1_lift != null ? `${current.m1_lift.toFixed(1)}×` : "—"} the average of {formatPercent(regimes.baseline.m1_onset_rate, 1)}).
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No regime was assigned to this unit for the selected week.</p>
      )}
      <div className="mt-4 space-y-1.5">
        {regimes.clusters.map((c) => (
          <div key={c.id} className={`rounded-lg px-2 py-1.5 ${c.id === id ? "bg-gray-50 ring-1 ring-gray-200" : ""}`}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 font-medium text-[#0D1F1A]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: clusterColor(c.id, regimes.k) }} />
                {c.name}
              </span>
              <span className="font-mono text-gray-500">{formatPercent(c.share, 0)} of weeks · outbreak {formatPercent(c.m2_active_rate, 0)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c.m2_active_rate ?? 0) * 100)}%`, background: clusterColor(c.id, regimes.k) }} />
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-3 ${NOTE}`}>
        K-means on weekly water, weather, case and sensor signals (fitted on training worlds only; K={regimes.k} chosen by silhouette {regimes.silhouette?.toFixed(2) ?? "—"} and split-half stability).
        Outcomes are used only to describe the groups. A regime is a description of the week, not a prediction.
      </p>
    </div>
  );
}

// ─── 2. Area archetypes: "areas like yours" ─────────────────────────────────
export function ArchetypePanel({ clusters, unitId, units }: { clusters: ClusterReport; unitId: string; units: UnitProfile[] }) {
  const { archetypes } = clusters;
  const id = archetypes.unit_cluster[unitId];
  const own = archetypes.clusters.find((c) => c.id === id);
  const siblings = (own?.members ?? []).filter((m) => m !== unitId);
  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Area archetype · clustering</p>
      <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Areas like {unitName(units, unitId)}</h3>
      {own ? (
        <>
          <div className="mt-3"><Chip label={own.name} color={clusterColor(own.id, archetypes.k)} /></div>
          <p className="mt-3 text-sm text-gray-700">
            {siblings.length === 0 ? "No other unit shares this profile." : `${siblings.length} other unit${siblings.length === 1 ? "" : "s"} share this profile:`}
          </p>
          {siblings.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {siblings.slice(0, 8).map((m) => unitName(units, m)).join(", ")}{siblings.length > 8 ? ` and ${siblings.length - 8} more` : ""}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-500">This unit has no archetype in the saved run.</p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {archetypes.clusters.map((c) => (
          <div key={c.id} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${c.id === id ? "border-gray-300 bg-gray-50" : "border-gray-100"}`}>
            <span className="flex items-center gap-2 font-medium text-[#0D1F1A]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: clusterColor(c.id, archetypes.k) }} />{c.name}
            </span>
            <span className="font-mono text-gray-500">{c.size}</span>
          </div>
        ))}
      </div>
      <p className={`mt-3 ${NOTE}`}>
        K-means on each unit&apos;s static profile: population, density, coast, water-source mix, sanitation (K={archetypes.k}, silhouette {archetypes.quality.silhouette?.toFixed(2) ?? "—"}).
      </p>
    </div>
  );
}

// ─── 3. Surveillance coverage / blind spots ─────────────────────────────────
export function CoveragePanel({ clusters, unitId, units }: { clusters: ClusterReport; unitId: string; units: UnitProfile[] }) {
  const { blind_spots: blind, week } = clusters;
  const id = week?.unit_blind_spot[unitId];
  const own = blind.clusters.find((c) => c.id === id);
  const worst = blind.clusters[blind.clusters.length - 1];
  const best = blind.clusters[0];
  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Surveillance coverage · clustering</p>
      <h3 className="font-display text-lg font-bold text-[#0D1F1A]">How closely is {unitName(units, unitId)} watched?</h3>
      {own ? (
        <div className="mt-3"><Chip label={own.name} color={clusterColor(own.id, blind.clusters.length)} /></div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No coverage group was assigned for this unit.</p>
      )}
      {own && own.id === blind.clusters.length - 1 && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-950">
          Sensors here are mostly offline, so the water inputs behind this area&apos;s scores are default fill values. Treat its scores with extra caution.
        </p>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400">
              <th className="py-1 pr-3">Group</th><th className="py-1 pr-3">Sensor uptime</th><th className="py-1 pr-3">Events never reported</th><th className="py-1">Median report delay</th>
            </tr>
          </thead>
          <tbody>
            {blind.clusters.map((c) => (
              <tr key={c.id} className={`border-t border-gray-50 ${c.id === id ? "bg-gray-50 font-semibold" : ""}`}>
                <td className="py-1.5 pr-3 text-[#0D1F1A]">{c.name}</td>
                <td className="py-1.5 pr-3 font-mono">{formatPercent(c.mean_sensor_uptime, 0)}</td>
                <td className="py-1.5 pr-3 font-mono">{formatPercent(c.unreported_share, 0)}</td>
                <td className="py-1.5 font-mono">{c.median_report_delay_days != null ? `${c.median_report_delay_days} days` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {best && worst && best.id !== worst.id && (
        <p className="mt-3 text-xs text-gray-600">
          In the test worlds, simulated outbreaks in {worst.name.toLowerCase()} areas went unreported {formatPercent(worst.unreported_share, 0)} of the time, against {formatPercent(best.unreported_share, 0)} in {best.name.toLowerCase()} areas.
        </p>
      )}
      <p className={`mt-3 ${NOTE}`}>K-means (K=3) on sensor uptime, lab-test recency and report completeness; checked against the hidden report dates of simulated outbreaks.</p>
    </div>
  );
}

// ─── 4. Hotspots: adjacent Review-tier areas ────────────────────────────────
export function HotspotPanel({ clusters, units, task, unitId }: { clusters: ClusterReport; units: UnitProfile[]; task: TaskId; unitId?: string }) {
  const groups: Hotspot[] = clusters.week?.hotspots[task] ?? [];
  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Hotspots · clustering</p>
      <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Neighbouring areas in review ({TASK_META[task].short})</h3>
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No two adjacent units are both in the Review tier this week.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {groups.map((g) => (
            <div key={g.id} className={`rounded-xl border p-3 ${unitId && g.units.includes(unitId) ? "border-[#E53935] bg-[#FFF5F5]" : "border-gray-100"}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0D1F1A]">{g.size} adjacent units{unitId && g.units.includes(unitId) ? " · includes this area" : ""}</span>
                <span className="font-mono text-gray-500">top score {g.max_score?.toFixed(3) ?? "—"}</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">{g.units.map((u) => unitName(units, u)).join(" · ")}</p>
            </div>
          ))}
        </div>
      )}
      {groups.some((g) => g.size >= 10) && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-950">
          Many units are flagged at once this week, so linked areas form one large group. It says little about where to look first; use the scores.
        </p>
      )}
      <p className={`mt-3 ${NOTE}`}>DBSCAN on neighbour-graph distance over Review-tier units. A group means several linked areas are flagged together; it is not a forecast of spread.</p>
    </div>
  );
}

// ─── 5. Seasonal trajectories ───────────────────────────────────────────────
export function SeasonalPanel({ clusters, unitId, units }: { clusters: ClusterReport; unitId: string; units: UnitProfile[] }) {
  const { seasonal } = clusters;
  const id = seasonal.unit_cluster[unitId];
  const own = seasonal.clusters.find((c) => c.id === id);
  const data = seasonal.months.map((month, i) => {
    const row: Record<string, string | number> = { month };
    seasonal.clusters.forEach((c) => { row[`c${c.id}`] = c.curve[i]; });
    return row;
  });
  const colors = ["#1565C0", "#E53935", "#43A047", "#FB8C00"];
  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Seasonal pattern · clustering</p>
      <h3 className="font-display text-lg font-bold text-[#0D1F1A]">When does {unitName(units, unitId)} get busy?</h3>
      {own && <div className="mt-3"><Chip label={own.name} color={colors[own.id % colors.length]} /></div>}
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={data} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} width={30} />
            <Tooltip formatter={(v: number) => `${v.toFixed(2)}× yearly average`} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={1} stroke="#9CA3AF" strokeDasharray="4 4" />
            {seasonal.clusters.map((c) => (
              <Line key={c.id} type="monotone" dataKey={`c${c.id}`} name={`${c.name} (${c.size})`}
                stroke={colors[c.id % colors.length]} strokeWidth={c.id === id ? 3 : 1.5} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className={`mt-2 ${NOTE}`}>
        Average OPD visits per month as a multiple of each unit&apos;s own yearly average, grouped by K-means (K={seasonal.k}, silhouette {seasonal.quality.silhouette?.toFixed(2) ?? "—"}).
        Useful for planning supplies and visits ahead of a busy season.
      </p>
    </div>
  );
}

// ─── Composition: pick the panels a role needs ──────────────────────────────
export type ClusterPanelId = "regime" | "archetype" | "coverage" | "hotspots" | "hotspots-m2" | "seasonal" | "events";

/** Renders the chosen cluster panels for one unit (defaults to the role's home unit) in a responsive grid. */
export function ClusterBlock({ panels, unitId }: { panels: ClusterPanelId[]; unitId?: string }) {
  const { units, homeUnit } = useMl();
  const uid = unitId ?? homeUnit;
  return (
    <ClusterGate>
      {(clusters) => (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {panels.map((panel) => {
            switch (panel) {
              case "regime": return <RegimePanel key={panel} clusters={clusters} unitId={uid} units={units} />;
              case "archetype": return <ArchetypePanel key={panel} clusters={clusters} unitId={uid} units={units} />;
              case "coverage": return <CoveragePanel key={panel} clusters={clusters} unitId={uid} units={units} />;
              case "hotspots": return <HotspotPanel key={panel} clusters={clusters} units={units} task="m1" unitId={uid} />;
              case "hotspots-m2": return <HotspotPanel key={panel} clusters={clusters} units={units} task="m2" unitId={uid} />;
              case "seasonal": return <SeasonalPanel key={panel} clusters={clusters} unitId={uid} units={units} />;
              case "events": return <EventTypesPanel key={panel} clusters={clusters} />;
              default: return null;
            }
          })}
        </div>
      )}
    </ClusterGate>
  );
}

// ─── 6. Outbreak event types ────────────────────────────────────────────────
export function EventTypesPanel({ clusters }: { clusters: ClusterReport }) {
  const types = clusters.event_types;
  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Outbreak types · clustering</p>
      <h3 className="font-display text-lg font-bold text-[#0D1F1A]">What kinds of simulated outbreak occur?</h3>
      {!types.available || types.clusters.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Not enough simulated outbreaks in this run to group them.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400">
                <th className="py-1 pr-3">Type</th><th className="py-1 pr-3">Events</th><th className="py-1 pr-3">Median length</th>
                <th className="py-1 pr-3">Median cases</th><th className="py-1 pr-3">Never reported</th><th className="py-1">Report delay</th>
              </tr>
            </thead>
            <tbody>
              {types.clusters.map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-1.5 pr-3 font-medium text-[#0D1F1A]">{c.name}</td>
                  <td className="py-1.5 pr-3 font-mono">{formatInt(c.events)}</td>
                  <td className="py-1.5 pr-3 font-mono">{c.median_duration_days != null ? `${c.median_duration_days} days` : "—"}</td>
                  <td className="py-1.5 pr-3 font-mono">{formatInt(c.median_total_cases)}</td>
                  <td className="py-1.5 pr-3 font-mono">{formatPercent(c.unreported_share, 0)}</td>
                  <td className="py-1.5 font-mono">{c.median_report_delay_days != null ? `${c.median_report_delay_days} days` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={`mt-3 ${NOTE}`}>
        K-means on outbreak length, size and cholera share (training worlds), assigned to the test worlds. Reporting is described afterwards, not used for grouping.
        Every simulated event in a smoke run is mostly acute diarrheal disease, so cholera share does not separate the types yet.
      </p>
    </div>
  );
}
