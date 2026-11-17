import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBoard, getClusters, getHistory, getSummary, getUnits, getWeeks, resetLiveProbe } from "./api";
import type { Board, ClusterReport, DataSource, History, ModelMeta, Summary, TaskId, UnitProfile, Weeks } from "./types";

export type DashboardRole = "citizen" | "asha" | "hospital";

// Each demo persona lives in one of the synthetic Tamil Nadu-style units the model is trained on.
export const ROLE_DEFAULT_UNIT: Record<DashboardRole, string> = {
  citizen: "TN_03", // Chengalpattu_Urban
  asha: "TN_01", // Chengalpattu_Potheri
  hospital: "TN_03", // Chengalpattu_Urban
};

interface MlState {
  role: DashboardRole;
  units: UnitProfile[];
  unitsById: Record<string, UnitProfile>;
  weeks: Weeks | undefined;
  scenario: string;
  setScenario: (scenario: string) => void;
  date: string | undefined;
  setDate: (date: string) => void;
  board: Board | undefined;
  boardLoading: boolean;
  boardError: string | null;
  models: Record<TaskId, ModelMeta> | undefined;
  summary: Summary | undefined;
  /** Unsupervised clusterings (areas, weeks, coverage, seasons, events) for the selected week. */
  clusters: ClusterReport | undefined;
  clustersLoading: boolean;
  clustersError: string | null;
  source: DataSource | undefined;
  homeUnit: string;
  setHomeUnit: (unitId: string) => void;
  loading: boolean;
  refresh: () => void;
}

const MlContext = createContext<MlState | null>(null);

const storageKey = (role: DashboardRole) => `sanjeevani.homeUnit.${role}`;

function readStoredUnit(role: DashboardRole): string | null {
  try {
    return window.localStorage.getItem(storageKey(role));
  } catch {
    return null;
  }
}

const QUERY_OPTIONS = { retry: false, refetchOnWindowFocus: false, staleTime: 60_000 } as const;

export function MlProvider({ role, children }: { role: DashboardRole; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [scenarioChoice, setScenario] = useState<string | null>(null);
  const [dateChoice, setDate] = useState<string | null>(null);
  const [homeUnitChoice, setHomeUnitChoice] = useState<string | null>(() => readStoredUnit(role));

  const unitsQuery = useQuery({ queryKey: ["ml", "units"], queryFn: ({ signal }) => getUnits(signal), ...QUERY_OPTIONS });
  const weeksQuery = useQuery({ queryKey: ["ml", "weeks"], queryFn: ({ signal }) => getWeeks(signal), ...QUERY_OPTIONS });
  const summaryQuery = useQuery({ queryKey: ["ml", "summary"], queryFn: ({ signal }) => getSummary(signal), ...QUERY_OPTIONS });

  const weeks = weeksQuery.data?.data;
  const scenario = scenarioChoice && weeks?.scenarios.includes(scenarioChoice) ? scenarioChoice : weeks?.scenarios[0] ?? "baseline";
  const date = dateChoice && weeks?.dates.includes(dateChoice) ? dateChoice : weeks?.default_date ?? weeks?.dates[weeks.dates.length - 1];

  const boardQuery = useQuery({
    queryKey: ["ml", "board", scenario, date],
    queryFn: ({ signal }) => getBoard(scenario, date as string, signal),
    enabled: Boolean(date),
    ...QUERY_OPTIONS,
  });

  const clustersQuery = useQuery({
    queryKey: ["ml", "clusters", scenario, date],
    queryFn: ({ signal }) => getClusters(scenario, date as string, signal),
    enabled: Boolean(date),
    ...QUERY_OPTIONS,
  });

  const units = useMemo(() => unitsQuery.data?.data ?? [], [unitsQuery.data]);
  const unitsById = useMemo(() => Object.fromEntries(units.map((u) => [u.unit_id, u])), [units]);
  const homeUnit = homeUnitChoice && unitsById[homeUnitChoice] ? homeUnitChoice : ROLE_DEFAULT_UNIT[role];

  const setHomeUnit = useCallback((unitId: string) => {
    setHomeUnitChoice(unitId);
    try {
      window.localStorage.setItem(storageKey(role), unitId);
    } catch { /* private mode: keep the choice in memory only */ }
  }, [role]);

  const refresh = useCallback(() => {
    resetLiveProbe();
    void queryClient.invalidateQueries({ queryKey: ["ml"] });
  }, [queryClient]);

  // Keep a stale-week choice from surviving a run change
  useEffect(() => {
    if (dateChoice && weeks && !weeks.dates.includes(dateChoice)) setDate(null);
  }, [dateChoice, weeks]);

  const boardError = boardQuery.error instanceof Error ? boardQuery.error.message
    : weeksQuery.error instanceof Error ? weeksQuery.error.message
    : unitsQuery.error instanceof Error ? unitsQuery.error.message : null;

  const value: MlState = {
    role, units, unitsById, weeks, scenario,
    setScenario: (next) => { setScenario(next); setDate(null); },
    date, setDate,
    board: boardQuery.data?.data,
    boardLoading: boardQuery.isLoading || weeksQuery.isLoading || unitsQuery.isLoading,
    boardError,
    models: boardQuery.data?.data.models,
    summary: summaryQuery.data?.data,
    clusters: clustersQuery.data?.data,
    clustersLoading: clustersQuery.isLoading,
    clustersError: clustersQuery.error instanceof Error ? clustersQuery.error.message : null,
    source: boardQuery.data?.source ?? weeksQuery.data?.source,
    homeUnit, setHomeUnit,
    loading: weeksQuery.isLoading || unitsQuery.isLoading || boardQuery.isLoading,
    refresh,
  };

  return <MlContext.Provider value={value}>{children}</MlContext.Provider>;
}

export function useMl(): MlState {
  const context = useContext(MlContext);
  if (!context) throw new Error("useMl must be used inside <MlProvider>");
  return context;
}

/** Weekly scores and signals for one unit, ending at the selected week. */
export function useUnitHistory(unitId: string, weeksBack = 26): { history: History | undefined; loading: boolean; error: string | null } {
  const { scenario, date } = useMl();
  const query = useQuery({
    queryKey: ["ml", "history", unitId, scenario, date, weeksBack],
    queryFn: ({ signal }) => getHistory(unitId, scenario, date as string, weeksBack, signal),
    enabled: Boolean(date) && Boolean(unitId),
    ...QUERY_OPTIONS,
  });
  return {
    history: query.data?.data,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
