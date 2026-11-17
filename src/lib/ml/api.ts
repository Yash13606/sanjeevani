import type {
  Board, ClusterReport, DataSource, History, HistoryPoint, Snapshot, Sourced, Summary, UnitProfile, Weeks,
} from "./types";

// The local Python service is the source of truth. When it is not running, the app falls back
// to a small bundled snapshot of a saved SYNTHETIC run so that every page still renders.
export const API_BASE = (import.meta.env.VITE_ML_API_URL || "http://localhost:8000").replace(/\/$/, "");

const LIVE_TIMEOUT_MS = 2500;
const LIVE_RETRY_AFTER_MS = 15000;
let liveDownSince = 0;

export class MlApiError extends Error {}

async function getLive<T>(path: string, signal?: AbortSignal, timeoutMs = LIVE_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward);
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      let detail = `The local ML API returned ${response.status}.`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) detail = body.error;
      } catch { /* keep the generic message */ }
      throw new MlApiError(detail);
    }
    const body = (await response.json()) as T & { synthetic?: boolean };
    if (body.synthetic !== true) throw new MlApiError("The API response was not marked as a synthetic run.");
    return body;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}

let snapshotPromise: Promise<Snapshot> | null = null;
function loadSnapshot(): Promise<Snapshot> {
  snapshotPromise ??= import("@/data/mlSnapshot.json").then((module) => module.default as unknown as Snapshot);
  return snapshotPromise;
}

/** Try the live service first; use the snapshot only when the service is unreachable (not when it rejects a request). */
interface FallbackOptions {
  /** Slow endpoints (clustering is fitted on first use) get a longer timeout... */
  timeoutMs?: number;
  /** ...and must not make the other endpoints think the whole service is down. */
  isolated?: boolean;
}

async function withFallback<T>(
  path: string,
  fromSnapshot: (snapshot: Snapshot) => T,
  signal?: AbortSignal,
  options: FallbackOptions = {},
): Promise<Sourced<T>> {
  if (Date.now() - liveDownSince > LIVE_RETRY_AFTER_MS) {
    try {
      return { data: await getLive<T>(path, signal, options.timeoutMs), source: "live" };
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof MlApiError) {
        // the service answered but there is no usable run or the request was invalid: still try the snapshot
        // for "no run yet" (503), but surface genuine request errors (400) to the caller
        if (!/unavailable|No completed|required for clustering/i.test(error.message)) throw error;
      }
      if (!options.isolated) liveDownSince = Date.now();
    }
  }
  const snapshot = await loadSnapshot();
  return { data: fromSnapshot(snapshot), source: "snapshot" satisfies DataSource };
}

export function resetLiveProbe() {
  liveDownSince = 0;
}

export const getUnits = (signal?: AbortSignal) =>
  withFallback<{ synthetic: true; units: UnitProfile[] }>(
    "/api/ml/units", (s) => ({ synthetic: true, units: s.units }), signal,
  ).then((r) => ({ data: r.data.units, source: r.source }));

export const getWeeks = (signal?: AbortSignal) =>
  withFallback<Weeks>("/api/ml/weeks", (s) => ({
    synthetic: true, run_id: s.run_id, scenarios: [s.scenario], world_ids: [s.world_id],
    dates: s.dates, default_date: s.default_date,
  }), signal);

export const getBoard = (scenario: string, date: string, signal?: AbortSignal) =>
  withFallback<Board>(
    `/api/ml/board?scenario=${encodeURIComponent(scenario)}&date=${encodeURIComponent(date)}`,
    (s) => {
      const board = s.boards[date];
      if (!board || s.scenario !== scenario) {
        throw new MlApiError("This week is not in the bundled snapshot. Start the local ML service to browse every saved week.");
      }
      return { ...board, models: s.models };
    },
    signal,
  );

export const getHistory = (unitId: string, scenario: string, until: string, weeks: number, signal?: AbortSignal) =>
  withFallback<History>(
    `/api/ml/history?unit_id=${encodeURIComponent(unitId)}&scenario=${encodeURIComponent(scenario)}` +
      `&until=${encodeURIComponent(until)}&weeks=${weeks}`,
    (s) => {
      const points: HistoryPoint[] = s.dates
        .filter((date) => date <= until)
        .slice(-weeks)
        .flatMap((date) => {
          const unit = s.boards[date]?.units.find((u) => u.unit_id === unitId);
          return unit ? [{ date, m1: unit.m1, m2: unit.m2, signals: unit.signals }] : [];
        });
      return {
        synthetic: true, run_id: s.run_id, world_id: s.world_id, scenario: s.scenario,
        unit_id: unitId, models: s.models, points,
      };
    },
    signal,
  );

export const getClusters = (scenario: string, date: string, signal?: AbortSignal) =>
  withFallback<ClusterReport>(
    `/api/ml/clusters?scenario=${encodeURIComponent(scenario)}&date=${encodeURIComponent(date)}`,
    (s) => {
      const week = s.clusters?.weeks[date];
      if (!s.clusters || !week || s.scenario !== scenario) {
        throw new MlApiError("Clusters for this week are not in the bundled snapshot. Start the local ML service to browse every saved week.");
      }
      const { weeks: _weeks, ...rest } = s.clusters;
      return { ...rest, run_id: s.run_id, week };
    },
    signal,
    { timeoutMs: 180_000, isolated: true },
  );

export const getSummary = (signal?: AbortSignal) =>
  withFallback<Summary>("/api/ml/summary", (s) => s.summary, signal);
